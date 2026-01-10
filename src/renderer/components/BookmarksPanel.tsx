import React, { useState, useEffect } from 'react';
import { Bookmark } from '../../core/types';

export interface BookmarksPanelProps {
    onBookmarkClick?: (url: string) => void;
    onBookmarkRemoved?: () => void;
}

const BookmarksPanel: React.FC<BookmarksPanelProps> = ({
    onBookmarkClick,
    onBookmarkRemoved,
}) => {
    const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
    const [filteredBookmarks, setFilteredBookmarks] = useState<Bookmark[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // Load bookmarks on mount
    useEffect(() => {
        loadBookmarks();
    }, []);

    // Filter bookmarks when search query changes
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredBookmarks(bookmarks);
        } else {
            const query = searchQuery.toLowerCase();
            const filtered = bookmarks.filter(
                b =>
                    b.url.toLowerCase().includes(query) ||
                    b.title.toLowerCase().includes(query) ||
                    (b.tags && b.tags.some(tag => tag.toLowerCase().includes(query)))
            );
            setFilteredBookmarks(filtered);
        }
    }, [searchQuery, bookmarks]);

    const loadBookmarks = async () => {
        try {
            setIsLoading(true);
            if (window.arc && window.arc.getAllBookmarks) {
                const result = await window.arc.getAllBookmarks();
                const allBookmarks = result.bookmarks || [];
                // Sort by createdAt descending (newest first)
                const sorted = [...allBookmarks].sort((a, b) => b.createdAt - a.createdAt);
                setBookmarks(sorted);
            }
        } catch (error) {
            console.error('Error loading bookmarks:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveBookmark = async (url: string, e: React.MouseEvent) => {
        e.stopPropagation();

        try {
            if (window.arc && window.arc.removeBookmark) {
                await window.arc.removeBookmark(url);
                setBookmarks(bookmarks.filter(b => b.url !== url));
                onBookmarkRemoved?.();
            }
        } catch (error) {
            console.error('Error removing bookmark:', error);
        }
    };

    const handleBookmarkClick = (url: string) => {
        onBookmarkClick?.(url);
    };

    const formatDate = (timestamp: number): string => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
        });
    };

    const highlightText = (text: string, query: string): React.ReactNode => {
        if (!query.trim()) return text;

        const parts = text.split(new RegExp(`(${query})`, 'gi'));
        return parts.map((part, i) =>
            part.toLowerCase() === query.toLowerCase() ? (
                <mark key={i}>{part}</mark>
            ) : (
                part
            )
        );
    };

    return (
        <div className="bookmarks-panel glass-card">
            <div className="bookmarks-header">
                <h2>Bookmarks</h2>
                <div className="bookmarks-controls">
                    <input
                        type="text"
                        className="bookmarks-search"
                        placeholder="Search bookmarks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="bookmarks-list">
                {isLoading ? (
                    <div className="bookmarks-empty">Loading bookmarks...</div>
                ) : filteredBookmarks.length === 0 ? (
                    <div className="bookmarks-empty">
                        {bookmarks.length === 0
                            ? 'No bookmarks yet. Click the star icon to add one!'
                            : 'No bookmarks match your search.'}
                    </div>
                ) : (
                    filteredBookmarks.map(bookmark => (
                        <div
                            key={bookmark.url}
                            className="bookmark-item"
                            onClick={() => handleBookmarkClick(bookmark.url)}
                        >
                            <div className="bookmark-content">
                                <div className="bookmark-title">
                                    {highlightText(bookmark.title, searchQuery)}
                                </div>
                                <div className="bookmark-url" title={bookmark.url}>
                                    {highlightText(new URL(bookmark.url).hostname, searchQuery)}
                                </div>
                                {bookmark.tags && bookmark.tags.length > 0 && (
                                    <div className="bookmark-tags">
                                        {bookmark.tags.map(tag => (
                                            <span key={tag} className="bookmark-tag">
                                                {highlightText(tag, searchQuery)}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <div className="bookmark-date">{formatDate(bookmark.createdAt)}</div>
                            </div>
                            <button
                                className="bookmark-remove"
                                onClick={(e) => handleRemoveBookmark(bookmark.url, e)}
                                title="Remove bookmark"
                                aria-label="Remove bookmark"
                            >
                                ✕
                            </button>
                        </div>
                    ))
                )}
            </div>

            <div className="bookmarks-footer">
                <span className="bookmarks-count">
                    {filteredBookmarks.length} of {bookmarks.length} bookmarks
                </span>
            </div>
        </div>
    );
};

export default BookmarksPanel;
