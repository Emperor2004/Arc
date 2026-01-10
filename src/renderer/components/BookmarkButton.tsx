import React, { useState, useEffect } from 'react';

export interface BookmarkButtonProps {
    url: string;
    title?: string;
    onBookmarkAdded?: () => void;
    onBookmarkRemoved?: () => void;
}

const BookmarkButton: React.FC<BookmarkButtonProps> = ({
    url,
    title,
    onBookmarkAdded,
    onBookmarkRemoved,
}) => {
    const [isBookmarkedState, setIsBookmarkedState] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Check if URL is bookmarked on mount and when URL changes
    useEffect(() => {
        const checkBookmarkStatus = async () => {
            if (!url) {
                setIsBookmarkedState(false);
                return;
            }

            try {
                if (window.arc && window.arc.isBookmarked) {
                    const result = await window.arc.isBookmarked(url);
                    setIsBookmarkedState(result.bookmarked || false);
                }
            } catch (error) {
                console.error('Error checking bookmark status:', error);
            }
        };

        checkBookmarkStatus();
    }, [url]);

    const handleBookmarkClick = async () => {
        if (!url || !window.arc) return;

        setIsLoading(true);
        try {
            if (isBookmarkedState) {
                // Remove bookmark
                if (window.arc.removeBookmark) {
                    await window.arc.removeBookmark(url);
                    setIsBookmarkedState(false);
                    onBookmarkRemoved?.();
                }
            } else {
                // Add bookmark
                if (window.arc.addBookmark) {
                    const bookmarkTitle = title || new URL(url).hostname;
                    await window.arc.addBookmark(url, bookmarkTitle);
                    setIsBookmarkedState(true);
                    onBookmarkAdded?.();
                }
            }
        } catch (error) {
            console.error('Error toggling bookmark:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button
            className={`icon-button icon-button--glass ${isBookmarkedState ? 'icon-button--active' : ''}`}
            onClick={handleBookmarkClick}
            disabled={isLoading || !url}
            title={isBookmarkedState ? 'Remove bookmark' : 'Add bookmark'}
            aria-label={isBookmarkedState ? 'Remove bookmark' : 'Add bookmark'}
        >
            {isBookmarkedState ? '★' : '☆'}
        </button>
    );
};

export default BookmarkButton;
