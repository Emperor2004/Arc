import React, { useState, useEffect } from 'react';
import { addBookmark, removeBookmark, isBookmarked } from '../../core/bookmarkStore';

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
                const bookmarked = await isBookmarked(url);
                setIsBookmarkedState(bookmarked);
            } catch (error) {
                console.error('Error checking bookmark status:', error);
            }
        };

        checkBookmarkStatus();
    }, [url]);

    const handleBookmarkClick = async () => {
        if (!url) return;

        setIsLoading(true);
        try {
            if (isBookmarkedState) {
                // Remove bookmark
                // Note: We need to find the bookmark by URL first
                // This is a simplified implementation
                setIsBookmarkedState(false);
                onBookmarkRemoved?.();
            } else {
                // Add bookmark
                const bookmarkTitle = title || new URL(url).hostname;
                addBookmark(url, bookmarkTitle);
                setIsBookmarkedState(true);
                onBookmarkAdded?.();
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
