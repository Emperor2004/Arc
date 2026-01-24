import React, { useState, useEffect, useCallback } from 'react';
import { Bookmark, BookmarkFolder } from '../../core/types';
import { 
  getAllBookmarks, 
  getAllFolders, 
  addBookmark, 
  removeBookmark, 
  addFolder,
  removeFolder,
  assignBookmarkToFolder,
  getBookmarksByFolder,
  getUncategorizedBookmarks,
  isBookmarked
} from '../../core/bookmarkStore';
import { 
  suggestFoldersForBookmarks, 
  applyFolderSuggestions,
  isAIAvailable 
} from '../../core/bookmarkAI';

interface BookmarksPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

interface BookmarkItemProps {
  bookmark: Bookmark;
  onRemove: (id: string) => void;
  onAssignToFolder: (bookmarkId: string, folderId: string | undefined) => void;
  folders: BookmarkFolder[];
}

const BookmarkItem: React.FC<BookmarkItemProps> = ({ 
  bookmark, 
  onRemove, 
  onAssignToFolder, 
  folders 
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleFolderAssign = (folderId: string | undefined) => {
    onAssignToFolder(bookmark.id, folderId);
    setIsMenuOpen(false);
  };

  return (
    <div className="bookmark-item">
      <div className="bookmark-content">
        <div className="bookmark-favicon">
          {bookmark.favicon ? (
            <img src={bookmark.favicon} alt="" width="16" height="16" />
          ) : (
            <div className="bookmark-favicon-placeholder">🔖</div>
          )}
        </div>
        <div className="bookmark-info">
          <div className="bookmark-title">{bookmark.title}</div>
          <div className="bookmark-url">{bookmark.url}</div>
          {bookmark.tags && bookmark.tags.length > 0 && (
            <div className="bookmark-tags">
              {bookmark.tags.map(tag => (
                <span key={tag} className="bookmark-tag">{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="bookmark-actions">
        <div className="bookmark-folder-selector">
          <button 
            className="folder-selector-button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            title="Assign to folder"
          >
            📁
          </button>
          {isMenuOpen && (
            <div className="folder-selector-menu">
              <button 
                className="folder-option"
                onClick={() => handleFolderAssign(undefined)}
              >
                📂 Uncategorized
              </button>
              {folders.map(folder => (
                <button
                  key={folder.id}
                  className={`folder-option ${bookmark.folderId === folder.id ? 'selected' : ''}`}
                  onClick={() => handleFolderAssign(folder.id)}
                >
                  <span className={`folder-color folder-color-${folder.color}`}></span>
                  {folder.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <button 
          className="bookmark-remove-button"
          onClick={() => onRemove(bookmark.id)}
          title="Remove bookmark"
        >
          🗑️
        </button>
      </div>
    </div>
  );
};

interface FolderViewProps {
  folder: BookmarkFolder | null;
  bookmarks: Bookmark[];
  folders: BookmarkFolder[];
  onRemoveBookmark: (id: string) => void;
  onAssignToFolder: (bookmarkId: string, folderId: string | undefined) => void;
  onRemoveFolder?: (id: string) => void;
}

const FolderView: React.FC<FolderViewProps> = ({ 
  folder, 
  bookmarks, 
  folders,
  onRemoveBookmark, 
  onAssignToFolder,
  onRemoveFolder 
}) => {
  const folderName = folder ? folder.name : 'Uncategorized';
  const folderColor = folder ? folder.color : 'gray';

  return (
    <div className="folder-view">
      <div className="folder-header">
        <div className="folder-info">
          <span className={`folder-color folder-color-${folderColor}`}></span>
          <h3 className="folder-name">{folderName}</h3>
          <span className="folder-count">({bookmarks.length})</span>
        </div>
        {folder && onRemoveFolder && (
          <button 
            className="folder-remove-button"
            onClick={() => onRemoveFolder(folder.id)}
            title="Remove folder"
          >
            🗑️
          </button>
        )}
      </div>
      {folder?.description && (
        <div className="folder-description">{folder.description}</div>
      )}
      <div className="folder-bookmarks">
        {bookmarks.length === 0 ? (
          <div className="empty-folder">No bookmarks in this folder</div>
        ) : (
          bookmarks.map(bookmark => (
            <BookmarkItem
              key={bookmark.id}
              bookmark={bookmark}
              onRemove={onRemoveBookmark}
              onAssignToFolder={onAssignToFolder}
              folders={folders}
            />
          ))
        )}
      </div>
    </div>
  );
};

export const BookmarksPanel: React.FC<BookmarksPanelProps> = ({ isVisible, onClose }) => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [folders, setFolders] = useState<BookmarkFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [aiAvailable, setAIAvailable] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);

  // Load bookmarks and folders
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [bookmarksData, foldersData] = await Promise.all([
        getAllBookmarks(),
        getAllFolders()
      ]);
      setBookmarks(bookmarksData);
      setFolders(foldersData);
    } catch (error) {
      console.error('Error loading bookmarks data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check AI availability
  useEffect(() => {
    const checkAI = async () => {
      const available = await isAIAvailable();
      setAIAvailable(available);
    };
    checkAI();
  }, []);

  // Load data when panel becomes visible
  useEffect(() => {
    if (isVisible) {
      loadData();
    }
  }, [isVisible, loadData]);

  // Add bookmark for current tab
  const handleAddBookmark = async () => {
    try {
      // Get current tab info from window.arc API
      if (window.arc?.getCurrentTab) {
        const currentTab = await window.arc.getCurrentTab();
        if (currentTab && !(await isBookmarked(currentTab.url))) {
          await addBookmark(currentTab.url, currentTab.title || currentTab.url);
          await loadData();
        }
      }
    } catch (error) {
      console.error('Error adding bookmark:', error);
    }
  };

  // Remove bookmark
  const handleRemoveBookmark = async (id: string) => {
    try {
      await removeBookmark(id);
      await loadData();
    } catch (error) {
      console.error('Error removing bookmark:', error);
    }
  };

  // Assign bookmark to folder
  const handleAssignToFolder = async (bookmarkId: string, folderId: string | undefined) => {
    try {
      await assignBookmarkToFolder(bookmarkId, folderId);
      await loadData();
    } catch (error) {
      console.error('Error assigning bookmark to folder:', error);
    }
  };

  // Smart organize bookmarks
  const handleSmartOrganize = async () => {
    if (bookmarks.length === 0) return;

    setIsOrganizing(true);
    try {
      const suggestions = await suggestFoldersForBookmarks(bookmarks, aiAvailable);
      const { createdFolders, errors } = await applyFolderSuggestions(suggestions, true);
      
      if (errors.length > 0) {
        console.warn('Some folders could not be created:', errors);
      }

      // Apply assignments
      for (const [bookmarkId, folderName] of suggestions.assignments) {
        const folder = createdFolders.find(f => f.name === folderName);
        if (folder) {
          await assignBookmarkToFolder(bookmarkId, folder.id);
        }
      }

      await loadData();
    } catch (error) {
      console.error('Error organizing bookmarks:', error);
    } finally {
      setIsOrganizing(false);
    }
  };

  // Add new folder
  const handleAddFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      await addFolder(newFolderName.trim(), 'blue');
      setNewFolderName('');
      setShowNewFolderInput(false);
      await loadData();
    } catch (error) {
      console.error('Error adding folder:', error);
    }
  };

  // Remove folder
  const handleRemoveFolder = async (id: string) => {
    try {
      await removeFolder(id);
      if (selectedFolder === id) {
        setSelectedFolder(null);
      }
      await loadData();
    } catch (error) {
      console.error('Error removing folder:', error);
    }
  };

  // Filter bookmarks based on search and selected folder
  const filteredBookmarks = bookmarks.filter(bookmark => {
    const matchesSearch = !searchQuery || 
      bookmark.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bookmark.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (bookmark.tags && bookmark.tags.some(tag => 
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      ));

    const matchesFolder = selectedFolder === null || 
      (selectedFolder === 'uncategorized' ? !bookmark.folderId : bookmark.folderId === selectedFolder);

    return matchesSearch && matchesFolder;
  });

  // Get bookmarks for current folder view
  const getFolderBookmarks = async (folderId: string | null) => {
    if (folderId === null || folderId === 'uncategorized') {
      return await getUncategorizedBookmarks();
    }
    return await getBookmarksByFolder(folderId);
  };

  if (!isVisible) return null;

  return (
    <div className="bookmarks-panel">
      <div className="bookmarks-panel-header">
        <h2>Bookmarks</h2>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      <div className="bookmarks-panel-content">
        {/* Toolbar */}
        <div className="bookmarks-toolbar">
          <button 
            className="add-bookmark-button"
            onClick={handleAddBookmark}
            title="Bookmark current page"
          >
            ➕ Add Bookmark
          </button>
          <button 
            className="smart-organize-button"
            onClick={handleSmartOrganize}
            disabled={isOrganizing || bookmarks.length === 0}
            title={aiAvailable ? "AI-powered organization" : "Heuristic organization"}
          >
            {isOrganizing ? '⏳ Organizing...' : '🧠 Smart Organize'}
          </button>
        </div>

        {/* Search */}
        <div className="bookmarks-search">
          <input
            type="text"
            placeholder="Search bookmarks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        {/* Folder Navigation */}
        <div className="folder-navigation">
          <div className="folder-tabs">
            <button
              className={`folder-tab ${selectedFolder === null ? 'active' : ''}`}
              onClick={() => setSelectedFolder(null)}
            >
              📚 All ({bookmarks.length})
            </button>
            <button
              className={`folder-tab ${selectedFolder === 'uncategorized' ? 'active' : ''}`}
              onClick={() => setSelectedFolder('uncategorized')}
            >
              📂 Uncategorized ({bookmarks.filter(b => !b.folderId).length})
            </button>
            {folders.map(folder => (
              <button
                key={folder.id}
                className={`folder-tab ${selectedFolder === folder.id ? 'active' : ''}`}
                onClick={() => setSelectedFolder(folder.id)}
              >
                <span className={`folder-color folder-color-${folder.color}`}></span>
                {folder.name} ({bookmarks.filter(b => b.folderId === folder.id).length})
              </button>
            ))}
          </div>
          
          {/* Add folder */}
          <div className="add-folder-section">
            {showNewFolderInput ? (
              <div className="new-folder-input">
                <input
                  type="text"
                  placeholder="Folder name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddFolder()}
                  autoFocus
                />
                <button onClick={handleAddFolder} disabled={!newFolderName.trim()}>
                  ✓
                </button>
                <button onClick={() => {
                  setShowNewFolderInput(false);
                  setNewFolderName('');
                }}>
                  ✕
                </button>
              </div>
            ) : (
              <button 
                className="add-folder-button"
                onClick={() => setShowNewFolderInput(true)}
                title="Add new folder"
              >
                ➕ Folder
              </button>
            )}
          </div>
        </div>

        {/* Bookmarks List */}
        <div className="bookmarks-list">
          {isLoading ? (
            <div className="loading">Loading bookmarks...</div>
          ) : selectedFolder === null ? (
            // Show all bookmarks
            filteredBookmarks.length === 0 ? (
              <div className="empty-bookmarks">
                {searchQuery ? 'No bookmarks match your search.' : 'No bookmarks yet. Add some!'}
              </div>
            ) : (
              filteredBookmarks.map(bookmark => (
                <BookmarkItem
                  key={bookmark.id}
                  bookmark={bookmark}
                  onRemove={handleRemoveBookmark}
                  onAssignToFolder={handleAssignToFolder}
                  folders={folders}
                />
              ))
            )
          ) : (
            // Show folder view
            <FolderView
              folder={selectedFolder === 'uncategorized' ? null : folders.find(f => f.id === selectedFolder) || null}
              bookmarks={filteredBookmarks}
              folders={folders}
              onRemoveBookmark={handleRemoveBookmark}
              onAssignToFolder={handleAssignToFolder}
              onRemoveFolder={selectedFolder !== 'uncategorized' ? handleRemoveFolder : undefined}
            />
          )}
        </div>
      </div>

      <style jsx>{`
        .bookmarks-panel {
          position: fixed;
          top: 0;
          right: 0;
          width: 400px;
          height: 100vh;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-left: 1px solid rgba(0, 0, 0, 0.1);
          z-index: 1000;
          display: flex;
          flex-direction: column;
        }

        .bookmarks-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        }

        .bookmarks-panel-header h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }

        .close-button {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
        }

        .close-button:hover {
          background: rgba(0, 0, 0, 0.1);
        }

        .bookmarks-panel-content {
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .bookmarks-toolbar {
          display: flex;
          gap: 8px;
          padding: 16px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        }

        .add-bookmark-button,
        .smart-organize-button {
          padding: 8px 12px;
          border: 1px solid rgba(0, 0, 0, 0.2);
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.8);
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .add-bookmark-button:hover,
        .smart-organize-button:hover:not(:disabled) {
          background: rgba(255, 255, 255, 1);
          transform: translateY(-1px);
        }

        .smart-organize-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .bookmarks-search {
          padding: 16px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        }

        .search-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid rgba(0, 0, 0, 0.2);
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.8);
          font-size: 14px;
        }

        .folder-navigation {
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
          padding: 16px;
        }

        .folder-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-bottom: 12px;
        }

        .folder-tab {
          padding: 6px 12px;
          border: 1px solid rgba(0, 0, 0, 0.2);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: all 0.2s;
        }

        .folder-tab:hover {
          background: rgba(255, 255, 255, 0.8);
        }

        .folder-tab.active {
          background: rgba(59, 130, 246, 0.8);
          color: white;
          border-color: rgba(59, 130, 246, 0.8);
        }

        .folder-color {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .folder-color-red { background: #ef4444; }
        .folder-color-blue { background: #3b82f6; }
        .folder-color-green { background: #10b981; }
        .folder-color-yellow { background: #f59e0b; }
        .folder-color-purple { background: #8b5cf6; }
        .folder-color-gray { background: #6b7280; }
        .folder-color-orange { background: #f97316; }
        .folder-color-pink { background: #ec4899; }

        .add-folder-section {
          display: flex;
          align-items: center;
        }

        .new-folder-input {
          display: flex;
          gap: 4px;
          align-items: center;
        }

        .new-folder-input input {
          padding: 4px 8px;
          border: 1px solid rgba(0, 0, 0, 0.2);
          border-radius: 4px;
          font-size: 12px;
          width: 120px;
        }

        .new-folder-input button {
          padding: 4px 8px;
          border: 1px solid rgba(0, 0, 0, 0.2);
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.8);
          cursor: pointer;
          font-size: 12px;
        }

        .add-folder-button {
          padding: 4px 8px;
          border: 1px solid rgba(0, 0, 0, 0.2);
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.8);
          cursor: pointer;
          font-size: 12px;
        }

        .bookmarks-list {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }

        .bookmark-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.6);
          margin-bottom: 8px;
          transition: all 0.2s;
        }

        .bookmark-item:hover {
          background: rgba(255, 255, 255, 0.8);
          transform: translateY(-1px);
        }

        .bookmark-content {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          min-width: 0;
        }

        .bookmark-favicon {
          width: 16px;
          height: 16px;
          flex-shrink: 0;
        }

        .bookmark-favicon-placeholder {
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
        }

        .bookmark-info {
          flex: 1;
          min-width: 0;
        }

        .bookmark-title {
          font-weight: 500;
          font-size: 14px;
          margin-bottom: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .bookmark-url {
          font-size: 12px;
          color: #666;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .bookmark-tags {
          display: flex;
          gap: 4px;
          margin-top: 4px;
          flex-wrap: wrap;
        }

        .bookmark-tag {
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
          padding: 2px 6px;
          border-radius: 12px;
          font-size: 10px;
        }

        .bookmark-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .bookmark-folder-selector {
          position: relative;
        }

        .folder-selector-button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          font-size: 14px;
        }

        .folder-selector-button:hover {
          background: rgba(0, 0, 0, 0.1);
        }

        .folder-selector-menu {
          position: absolute;
          top: 100%;
          right: 0;
          background: white;
          border: 1px solid rgba(0, 0, 0, 0.2);
          border-radius: 6px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 1001;
          min-width: 150px;
        }

        .folder-option {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 8px 12px;
          border: none;
          background: none;
          cursor: pointer;
          font-size: 12px;
          text-align: left;
        }

        .folder-option:hover {
          background: rgba(0, 0, 0, 0.05);
        }

        .folder-option.selected {
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
        }

        .bookmark-remove-button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          font-size: 14px;
        }

        .bookmark-remove-button:hover {
          background: rgba(239, 68, 68, 0.1);
        }

        .folder-view {
          margin-bottom: 24px;
        }

        .folder-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .folder-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .folder-name {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }

        .folder-count {
          color: #666;
          font-size: 14px;
        }

        .folder-remove-button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          font-size: 14px;
        }

        .folder-remove-button:hover {
          background: rgba(239, 68, 68, 0.1);
        }

        .folder-description {
          color: #666;
          font-size: 12px;
          margin-bottom: 12px;
          font-style: italic;
        }

        .folder-bookmarks {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .empty-folder,
        .empty-bookmarks {
          text-align: center;
          color: #666;
          font-style: italic;
          padding: 32px;
        }

        .loading {
          text-align: center;
          padding: 32px;
          color: #666;
        }
      `}</style>
    </div>
  );
};