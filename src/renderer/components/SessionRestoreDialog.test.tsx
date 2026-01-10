import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SessionRestoreDialog from './SessionRestoreDialog';
import { SessionState, TabSession } from '../../core/sessionManager';

describe('SessionRestoreDialog', () => {
  const mockTabSession: TabSession = {
    id: 'tab-1',
    url: 'https://example.com',
    title: 'Example',
    scrollPosition: { x: 0, y: 0 },
    favicon: undefined,
  };

  const mockSession: SessionState = {
    tabs: [mockTabSession],
    activeTabId: 'tab-1',
    timestamp: Date.now(),
    version: '1.0.0',
  };

  it('should not render when session is null', () => {
    const { container } = render(
      <SessionRestoreDialog
        session={null}
        onRestore={vi.fn()}
        onStartFresh={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render dialog when session is provided', () => {
    render(
      <SessionRestoreDialog
        session={mockSession}
        onRestore={vi.fn()}
        onStartFresh={vi.fn()}
      />
    );
    expect(screen.getByText('Restore Previous Session?')).toBeTruthy();
  });

  it('should display tab count', () => {
    render(
      <SessionRestoreDialog
        session={mockSession}
        onRestore={vi.fn()}
        onStartFresh={vi.fn()}
      />
    );
    expect(screen.getByText('1 tab available:')).toBeTruthy();
  });

  it('should display tab information', () => {
    render(
      <SessionRestoreDialog
        session={mockSession}
        onRestore={vi.fn()}
        onStartFresh={vi.fn()}
      />
    );
    expect(screen.getByText('Example')).toBeTruthy();
    expect(screen.getByText('https://example.com')).toBeTruthy();
  });

  it('should call onRestore when Restore Session button is clicked', () => {
    const onRestore = vi.fn();
    render(
      <SessionRestoreDialog
        session={mockSession}
        onRestore={onRestore}
        onStartFresh={vi.fn()}
      />
    );
    
    const restoreButton = screen.getByText('Restore Session');
    fireEvent.click(restoreButton);
    
    expect(onRestore).toHaveBeenCalledWith(mockSession.tabs);
  });

  it('should call onStartFresh when Start Fresh button is clicked', () => {
    const onStartFresh = vi.fn();
    render(
      <SessionRestoreDialog
        session={mockSession}
        onRestore={vi.fn()}
        onStartFresh={onStartFresh}
      />
    );
    
    const startFreshButton = screen.getByText('Start Fresh');
    fireEvent.click(startFreshButton);
    
    expect(onStartFresh).toHaveBeenCalled();
  });

  it('should call onClose when Dismiss button is clicked', () => {
    const onClose = vi.fn();
    render(
      <SessionRestoreDialog
        session={mockSession}
        onRestore={vi.fn()}
        onStartFresh={vi.fn()}
        onClose={onClose}
      />
    );
    
    const dismissButton = screen.getByText('Dismiss');
    fireEvent.click(dismissButton);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('should display multiple tabs', () => {
    const multiTabSession: SessionState = {
      tabs: [
        mockTabSession,
        {
          id: 'tab-2',
          url: 'https://google.com',
          title: 'Google',
          scrollPosition: { x: 0, y: 0 },
        },
        {
          id: 'tab-3',
          url: 'https://github.com',
          title: 'GitHub',
          scrollPosition: { x: 0, y: 0 },
        },
      ],
      activeTabId: 'tab-1',
      timestamp: Date.now(),
      version: '1.0.0',
    };

    render(
      <SessionRestoreDialog
        session={multiTabSession}
        onRestore={vi.fn()}
        onStartFresh={vi.fn()}
      />
    );
    
    expect(screen.getByText('3 tabs available:')).toBeTruthy();
    expect(screen.getByText('Example')).toBeTruthy();
    expect(screen.getByText('Google')).toBeTruthy();
    expect(screen.getByText('GitHub')).toBeTruthy();
  });

  it('should display more tabs indicator when more than 5 tabs', () => {
    const manyTabsSession: SessionState = {
      tabs: Array.from({ length: 8 }, (_, i) => ({
        id: `tab-${i}`,
        url: `https://example${i}.com`,
        title: `Tab ${i}`,
        scrollPosition: { x: 0, y: 0 },
      })),
      activeTabId: 'tab-0',
      timestamp: Date.now(),
      version: '1.0.0',
    };

    render(
      <SessionRestoreDialog
        session={manyTabsSession}
        onRestore={vi.fn()}
        onStartFresh={vi.fn()}
      />
    );
    
    expect(screen.getByText('8 tabs available:')).toBeTruthy();
    expect(screen.getByText('+3 more tabs')).toBeTruthy();
  });

  it('should format timestamp correctly', () => {
    const recentSession: SessionState = {
      tabs: [mockTabSession],
      activeTabId: 'tab-1',
      timestamp: Date.now() - 60000, // 1 minute ago
      version: '1.0.0',
    };

    render(
      <SessionRestoreDialog
        session={recentSession}
        onRestore={vi.fn()}
        onStartFresh={vi.fn()}
      />
    );
    
    const timeElement = screen.getByText(/Last session: 1 minute ago/);
    expect(timeElement).toBeTruthy();
  });
});
