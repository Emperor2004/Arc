import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Command, getCommandRegistry } from '../../core/commandRegistry';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filteredCommands, setFilteredCommands] = useState<Command[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const commandRegistry = getCommandRegistry();

  // Update filtered commands when query changes
  useEffect(() => {
    if (isOpen) {
      const commands = commandRegistry.findCommands(query);
      setFilteredCommands(commands);
      setSelectedIndex(0);
    }
  }, [query, isOpen, commandRegistry]);

  // Focus input when palette opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      // Load initial commands
      const commands = commandRegistry.getAllCommands();
      setFilteredCommands(commands);
      setSelectedIndex(0);
    } else if (!isOpen) {
      // Reset state when closing
      setQuery('');
      setSelectedIndex(0);
      setFilteredCommands([]);
      setIsExecuting(false);
    }
  }, [isOpen, commandRegistry]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && filteredCommands.length > 0) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [selectedIndex, filteredCommands]);

  const handleKeyDown = useCallback(async (event: React.KeyboardEvent) => {
    if (isExecuting) return;

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        onClose();
        break;
      
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
        break;
      
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        );
        break;
      
      case 'Enter':
        event.preventDefault();
        if (filteredCommands.length > 0 && selectedIndex >= 0) {
          await executeCommand(filteredCommands[selectedIndex]);
        }
        break;
      
      case 'Tab':
        event.preventDefault();
        // Tab cycles through commands like arrow down
        setSelectedIndex(prev => 
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
        break;
    }
  }, [filteredCommands, selectedIndex, onClose, isExecuting]);

  const executeCommand = async (command: Command) => {
    if (isExecuting) return;
    
    setIsExecuting(true);
    try {
      await commandRegistry.executeCommand(command.id);
      onClose();
    } catch (error) {
      console.error('Failed to execute command:', error);
      // Show error but keep palette open
      setIsExecuting(false);
    }
  };

  const handleCommandClick = (command: Command, index: number) => {
    setSelectedIndex(index);
    executeCommand(command);
  };

  const getCategoryIcon = (category: Command['category']): string => {
    switch (category) {
      case 'tab': return '📑';
      case 'jarvis': return '🤖';
      case 'workspace': return '🗂️';
      case 'system': return '⚙️';
      default: return '•';
    }
  };

  const getCategoryColor = (category: Command['category']): string => {
    switch (category) {
      case 'tab': return '#3b82f6';
      case 'jarvis': return '#8b5cf6';
      case 'workspace': return '#10b981';
      case 'system': return '#f59e0b';
      default: return 'var(--text-secondary)';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="command-palette-backdrop"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: '20vh'
        }}
        onClick={onClose}
      >
        {/* Command Palette Modal */}
        <div
          className="command-palette glass-card"
          style={{
            width: '600px',
            maxWidth: '90vw',
            maxHeight: '60vh',
            backgroundColor: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-lg)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handleKeyDown}
          role="dialog"
          aria-modal="true"
          aria-labelledby="command-palette-title"
        >
          {/* Header */}
          <div style={{ padding: '20px 20px 0 20px' }}>
            <h2 
              id="command-palette-title" 
              style={{ 
                margin: 0, 
                fontSize: '18px', 
                fontWeight: 600, 
                color: 'var(--text-primary)',
                marginBottom: '12px'
              }}
            >
              Command Palette
            </h2>
            
            {/* Search Input */}
            <input
              ref={inputRef}
              type="text"
              placeholder="Type a command or search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '16px',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--text-primary)',
                outline: 'none',
                transition: 'border-color 0.2s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--accent)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--glass-border)';
              }}
              disabled={isExecuting}
              aria-label="Search commands"
              aria-expanded="true"
              aria-controls="command-list"
              role="combobox"
              aria-activedescendant={filteredCommands.length > 0 ? `command-${selectedIndex}` : undefined}
            />
          </div>

          {/* Command List */}
          <div
            ref={listRef}
            id="command-list"
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '12px 0',
              margin: '0 20px 20px 20px',
              borderTop: '1px solid var(--glass-border)',
              marginTop: '16px'
            }}
            role="listbox"
            aria-label="Available commands"
          >
            {filteredCommands.length === 0 ? (
              <div
                style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: 'var(--text-secondary)',
                  fontSize: '14px'
                }}
                role="status"
              >
                {query ? `No commands found for "${query}"` : 'No commands available'}
              </div>
            ) : (
              filteredCommands.map((command, index) => (
                <div
                  key={command.id}
                  id={`command-${index}`}
                  className={`command-item ${index === selectedIndex ? 'selected' : ''}`}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    backgroundColor: index === selectedIndex 
                      ? 'rgba(255, 255, 255, 0.1)' 
                      : 'transparent',
                    border: index === selectedIndex 
                      ? '1px solid var(--accent)' 
                      : '1px solid transparent',
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'all 0.15s ease',
                    opacity: isExecuting ? 0.6 : 1
                  }}
                  onClick={() => handleCommandClick(command, index)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  role="option"
                  aria-selected={index === selectedIndex}
                  tabIndex={-1}
                >
                  {/* Category Icon */}
                  <div
                    style={{
                      fontSize: '16px',
                      minWidth: '20px',
                      textAlign: 'center'
                    }}
                    aria-hidden="true"
                  >
                    {getCategoryIcon(command.category)}
                  </div>

                  {/* Command Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        marginBottom: command.description ? '2px' : 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {command.title}
                    </div>
                    {command.description && (
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {command.description}
                      </div>
                    )}
                  </div>

                  {/* Category Badge */}
                  <div
                    style={{
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      color: getCategoryColor(command.category),
                      fontWeight: 500,
                      flexShrink: 0
                    }}
                  >
                    {command.category}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '12px 20px',
              borderTop: '1px solid var(--glass-border)',
              fontSize: '11px',
              color: 'var(--text-secondary)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div>
              {filteredCommands.length > 0 && (
                <span>
                  {selectedIndex + 1} of {filteredCommands.length}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <span>↑↓ Navigate</span>
              <span>↵ Execute</span>
              <span>Esc Close</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CommandPalette;