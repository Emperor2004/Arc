import React, { useState, useEffect, useRef } from 'react';
import { TabGroup } from '../../core/types';

export interface TabContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  tabId: string;
  existingGroup: TabGroup | null;
  groups: TabGroup[];
  onCreateGroup: (name: string, color: TabGroup['color']) => void;
  onAddToGroup: (tabId: string, groupId: string) => void;
  onRemoveFromGroup: (tabId: string, groupId: string) => void;
  onClose: () => void;
}

const colors: TabGroup['color'][] = ['red', 'blue', 'green', 'yellow', 'purple', 'gray'];

const colorMap: Record<TabGroup['color'], string> = {
  red: '#ff4757',
  blue: '#2d7ff9',
  green: '#2ed573',
  yellow: '#fbbf24',
  purple: '#a29bfe',
  gray: '#636e72',
};

const TabContextMenu: React.FC<TabContextMenuProps> = ({
  visible,
  x,
  y,
  tabId,
  existingGroup,
  groups,
  onCreateGroup,
  onAddToGroup,
  onRemoveFromGroup,
  onClose,
}) => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedColor, setSelectedColor] = useState<TabGroup['color']>('blue');
  const menuRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
          onClose();
        }
      }
    };

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [visible, onClose]);

  const handleCreateGroup = () => {
    if (groupName.trim()) {
      onCreateGroup(groupName.trim(), selectedColor);
      setGroupName('');
      setSelectedColor('blue');
      setShowCreateDialog(false);
      onClose();
    }
  };

  const handleAddToGroup = (groupId: string) => {
    onAddToGroup(tabId, groupId);
    onClose();
  };

  const handleRemoveFromGroup = () => {
    if (existingGroup) {
      onRemoveFromGroup(tabId, existingGroup.id);
      onClose();
    }
  };

  if (!visible) {
    return null;
  }

  // Adjust position to keep menu in viewport
  let adjustedX = x;
  let adjustedY = y;

  if (typeof window !== 'undefined') {
    const menuWidth = 200;
    const menuHeight = 300;

    if (adjustedX + menuWidth > window.innerWidth) {
      adjustedX = window.innerWidth - menuWidth - 10;
    }

    if (adjustedY + menuHeight > window.innerHeight) {
      adjustedY = window.innerHeight - menuHeight - 10;
    }
  }

  return (
    <>
      <div
        ref={menuRef}
        className="context-menu context-menu--visible"
        style={{
          left: `${adjustedX}px`,
          top: `${adjustedY}px`,
        }}
      >
        {existingGroup && (
          <>
            <div className="context-menu-item" onClick={handleRemoveFromGroup}>
              Remove from "{existingGroup.name}"
            </div>
            <div className="context-menu-separator" />
          </>
        )}

        {groups.length > 0 && (
          <>
            <div className="context-menu-item context-menu-item--label">
              Add to Group
            </div>
            {groups.map((group) => (
              <div
                key={group.id}
                className={`context-menu-item ${
                  existingGroup?.id === group.id ? 'context-menu-item--disabled' : ''
                }`}
                onClick={() => handleAddToGroup(group.id)}
              >
                <div
                  className="context-menu-color-dot"
                  style={{ backgroundColor: colorMap[group.color] }}
                />
                {group.name}
              </div>
            ))}
            <div className="context-menu-separator" />
          </>
        )}

        <div
          className="context-menu-item"
          onClick={() => setShowCreateDialog(true)}
        >
          Create New Group
        </div>
      </div>

      {showCreateDialog && (
        <div
          ref={dialogRef}
          className="tab-group-dialog"
          style={{
            left: `${adjustedX}px`,
            top: `${adjustedY}px`,
          }}
        >
          <div className="tab-group-dialog-content">
            <h3>Create New Group</h3>

            <div className="tab-group-dialog-field">
              <label htmlFor="group-name">Group Name</label>
              <input
                id="group-name"
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateGroup();
                  } else if (e.key === 'Escape') {
                    setShowCreateDialog(false);
                  }
                }}
              />
            </div>

            <div className="tab-group-dialog-field">
              <label>Color</label>
              <div className="tab-group-color-picker">
                {colors.map((color) => (
                  <button
                    key={color}
                    className={`tab-group-color-option ${
                      selectedColor === color ? 'tab-group-color-option--selected' : ''
                    }`}
                    style={{ backgroundColor: colorMap[color] }}
                    onClick={() => setSelectedColor(color)}
                    title={color}
                    aria-label={`Select ${color} color`}
                  />
                ))}
              </div>
            </div>

            <div className="tab-group-dialog-actions">
              <button
                className="tab-group-dialog-btn tab-group-dialog-btn--cancel"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </button>
              <button
                className="tab-group-dialog-btn tab-group-dialog-btn--create"
                onClick={handleCreateGroup}
                disabled={!groupName.trim()}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TabContextMenu;
