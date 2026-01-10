import React from 'react';
import BookmarkButton from './BookmarkButton';

export interface AddressBarProps {
    url: string;
    title?: string;
    onUrlChange: (url: string) => void;
    onNavigate: () => void;
    onBack: () => void;
    onForward: () => void;
    onReload: () => void;
    onMaximize?: () => void;
    isMaximized?: boolean;
    canGoBack?: boolean;
    canGoForward?: boolean;
    hasActiveTab?: boolean;
    onBookmarkAdded?: () => void;
    onBookmarkRemoved?: () => void;
}

const AddressBar: React.FC<AddressBarProps> = ({
    url,
    title,
    onUrlChange,
    onNavigate,
    onBack,
    onForward,
    onReload,
    onMaximize,
    isMaximized,
    canGoBack = false,
    canGoForward = false,
    hasActiveTab = true,
    onBookmarkAdded,
    onBookmarkRemoved,
}) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            onNavigate();
        }
    };

    return (
        <div className="browser-toolbar">
            <div className="browser-nav-buttons" role="toolbar" aria-label="Browser navigation">
                <button 
                    className="round-btn" 
                    onClick={onBack} 
                    title="Go back"
                    aria-label="Go back"
                    disabled={!canGoBack}
                >
                    ←
                </button>
                <button 
                    className="round-btn" 
                    onClick={onForward} 
                    title="Go forward"
                    aria-label="Go forward"
                    disabled={!canGoForward}
                >
                    →
                </button>
                <button 
                    className="round-btn" 
                    onClick={onReload} 
                    title="Reload page"
                    aria-label="Reload page"
                    disabled={!hasActiveTab || !url}
                >
                    ↻
                </button>
            </div>

            <div className="browser-address-bar" role="search" aria-label="Address and search bar">
                <input
                    type="text"
                    className="pill-input"
                    value={url}
                    onChange={(e) => onUrlChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search or enter URL"
                    aria-label="Enter URL or search terms"
                    role="combobox"
                    aria-expanded="false"
                    aria-autocomplete="both"
                />
                <BookmarkButton
                    url={url}
                    title={title}
                    onBookmarkAdded={onBookmarkAdded}
                    onBookmarkRemoved={onBookmarkRemoved}
                />
                <button 
                    className="btn-primary" 
                    onClick={onNavigate}
                    disabled={!url.trim()}
                    aria-label="Navigate to URL or search"
                >
                    Go
                </button>
                {onMaximize && (
                    <button 
                        className="icon-button icon-button--glass" 
                        type="button"
                        onClick={onMaximize}
                        title={isMaximized ? "Restore browser" : "Maximize browser"}
                        aria-label={isMaximized ? "Restore browser window" : "Maximize browser window"}
                    >
                        ⤢
                    </button>
                )}
            </div>
        </div>
    );
};

export default AddressBar;