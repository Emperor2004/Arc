import React from 'react';

export interface AddressBarProps {
    url: string;
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
}

const AddressBar: React.FC<AddressBarProps> = ({
    url,
    onUrlChange,
    onNavigate,
    onBack,
    onForward,
    onReload,
    onMaximize,
    isMaximized,
    canGoBack = false,
    canGoForward = false,
    hasActiveTab = true
}) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            onNavigate();
        }
    };

    return (
        <div className="browser-toolbar">
            <div className="browser-nav-buttons">
                <button 
                    className="round-btn" 
                    onClick={onBack} 
                    title="Go back"
                    disabled={!canGoBack}
                >
                    ←
                </button>
                <button 
                    className="round-btn" 
                    onClick={onForward} 
                    title="Go forward"
                    disabled={!canGoForward}
                >
                    →
                </button>
                <button 
                    className="round-btn" 
                    onClick={onReload} 
                    title="Reload page"
                    disabled={!hasActiveTab || !url}
                >
                    ↻
                </button>
            </div>

            <div className="browser-address-bar">
                <input
                    type="text"
                    className="pill-input"
                    value={url}
                    onChange={(e) => onUrlChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search or enter URL"
                />
                <button 
                    className="btn-primary" 
                    onClick={onNavigate}
                    disabled={!url.trim()}
                >
                    Go
                </button>
                {onMaximize && (
                    <button 
                        className="icon-button icon-button--glass" 
                        type="button"
                        onClick={onMaximize}
                        title={isMaximized ? "Restore browser" : "Maximize browser"}
                    >
                        ⤢
                    </button>
                )}
            </div>
        </div>
    );
};

export default AddressBar;