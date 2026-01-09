# Design Document: Arc Browser Enhancements

## Overview

This design document outlines the implementation strategy for Arc Browser enhancements across testing infrastructure, core features (bookmarks, search), algorithm improvements, and user experience enhancements. The design prioritizes maintainability, testability, and incremental delivery.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Arc Browser Application                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │  Renderer Layer  │  │   Main Process   │                 │
│  │  (React UI)      │  │  (Electron)      │                 │
│  └────────┬─────────┘  └────────┬─────────┘                 │
│           │                     │                            │
│           └──────────┬──────────┘                            │
│                      │ IPC                                   │
│           ┌──────────▼──────────┐                           │
│           │   Core Layer        │                           │
│           │  (Business Logic)   │                           │
│           └──────────┬──────────┘                           │
│                      │                                       │
│  ┌────────────────────┼────────────────────┐               │
│  │                    │                    │               │
│  ▼                    ▼                    ▼               │
│ ┌──────────┐  ┌──────────────┐  ┌──────────────┐          │
│ │Recommender│ │BookmarkStore │ │SearchEngine  │          │
│ │ Engine   │ │              │ │Integration   │          │
│ └──────────┘ │              │ └──────────────┘          │
│              └──────────────┘                            │
│                                                           │
│  ┌──────────────────────────────────────────┐           │
│  │      Data Layer (Local Storage)          │           │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ │           │
│  │  │ History  │ │Bookmarks │ │Feedback  │ │           │
│  │  │  Store   │ │  Store   │ │  Store   │ │           │
│  │  └──────────┘ └──────────┘ └──────────┘ │           │
│  └──────────────────────────────────────────┘           │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Testing Infrastructure

#### Unit Testing Framework
- **Framework**: Vitest (lightweight, fast, TypeScript-native)
- **Location**: `src/**/*.test.ts` and `src/**/*.test.tsx`
- **Coverage Target**: 80% for core modules

#### Property-Based Testing Framework
- **Framework**: fast-check (JavaScript property-based testing)
- **Location**: `src/**/*.pbt.test.ts`
- **Configuration**: Minimum 100 iterations per property test

#### Test Structure
```typescript
// Unit test example
describe('Recommender', () => {
  it('should return empty array when history is empty', () => {
    // Test implementation
  });
});

// Property-based test example
describe('Recommender Properties', () => {
  it('should maintain invariant: recommendations length <= limit', () => {
    fc.assert(
      fc.property(fc.array(fc.record({...})), (history) => {
        // Property validation
      })
    );
  });
});
```

### 2. Bookmarks System

#### BookmarkStore Interface
```typescript
interface Bookmark {
  id: string;
  url: string;
  title: string;
  createdAt: number;
  tags?: string[];
}

interface BookmarkStore {
  addBookmark(url: string, title: string): Promise<Bookmark>;
  removeBookmark(id: string): Promise<void>;
  getAllBookmarks(): Promise<Bookmark[]>;
  searchBookmarks(query: string): Promise<Bookmark[]>;
  updateBookmark(id: string, updates: Partial<Bookmark>): Promise<Bookmark>;
}
```

#### Storage
- **Format**: JSON file at `data/bookmarks.json`
- **Persistence**: Synchronous write on each change
- **Backup**: Automatic backup on application startup

### 3. Search Engine Integration

#### SearchEngine Interface
```typescript
type SearchEngineType = 'google' | 'duckduckgo' | 'bing' | 'custom';

interface SearchEngine {
  name: string;
  type: SearchEngineType;
  searchUrl: string; // Template with {query} placeholder
  suggestionsUrl?: string;
}

interface SearchEngineManager {
  getAvailableEngines(): SearchEngine[];
  setDefaultEngine(type: SearchEngineType): Promise<void>;
  getDefaultEngine(): Promise<SearchEngine>;
  buildSearchUrl(query: string): string;
  isSearchQuery(input: string): boolean;
}
```

#### Search Query Detection
- **Logic**: If input doesn't match URL pattern and contains spaces or common search keywords, treat as search
- **URL Pattern**: `/^https?:\/\/|^[a-z0-9-]+\.[a-z]{2,}$/i`

### 4. Improved Recommendation Algorithm

#### Temporal Weighting Function
```typescript
function calculateTemporalWeight(visitedAt: number, now: number): number {
  const daysSinceVisit = (now - visitedAt) / (1000 * 60 * 60 * 24);
  
  if (daysSinceVisit <= 7) return 1.0;           // Recent: full weight
  if (daysSinceVisit <= 30) return 0.7;          // Recent-ish: 70% weight
  if (daysSinceVisit <= 90) return 0.4;          // Older: 40% weight
  return 0.1;                                     // Very old: 10% weight
}

function calculateRecommendationScore(
  baseScore: number,
  temporalWeight: number,
  feedbackAdjustment: number
): number {
  return baseScore * temporalWeight * feedbackAdjustment;
}
```

#### Algorithm Flow
1. Aggregate browsing history by domain
2. Calculate base score (visit frequency normalized)
3. Apply temporal weighting (recency decay)
4. Apply feedback adjustments (likes/dislikes)
5. Filter out heavily disliked sites
6. Sort by final score and return top N

### 5. Keyboard Shortcuts System

#### KeyboardShortcutManager Interface
```typescript
interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: string;
  platform?: 'win32' | 'darwin' | 'linux';
}

interface KeyboardShortcutManager {
  registerShortcut(shortcut: KeyboardShortcut): void;
  handleKeyDown(event: KeyboardEvent): void;
  getShortcuts(): KeyboardShortcut[];
}
```

#### Shortcut Mapping
- Ctrl+T / Cmd+T: New Tab
- Ctrl+N / Cmd+N: New Incognito Tab
- Ctrl+W / Cmd+W: Close Tab
- Ctrl+Tab: Next Tab
- Ctrl+Shift+Tab: Previous Tab
- Ctrl+L / Cmd+L: Focus Address Bar
- Ctrl+R / Cmd+R: Reload Page
- Ctrl+Shift+Delete: Clear Data

### 6. Dark Mode Implementation

#### Theme System
```typescript
type Theme = 'system' | 'light' | 'dark';

interface ThemeManager {
  getCurrentTheme(): Theme;
  setTheme(theme: Theme): Promise<void>;
  getEffectiveTheme(): 'light' | 'dark';
  onThemeChange(callback: (theme: 'light' | 'dark') => void): void;
}
```

#### CSS Variables
```css
:root {
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f5f5f5;
  --color-text-primary: #000000;
  --color-text-secondary: #666666;
  --color-border: #e0e0e0;
}

[data-theme="dark"] {
  --color-bg-primary: #1e1e1e;
  --color-bg-secondary: #2d2d2d;
  --color-text-primary: #ffffff;
  --color-text-secondary: #b0b0b0;
  --color-border: #404040;
}
```

### 7. Tab Drag-and-Drop

#### TabReorderManager Interface
```typescript
interface TabReorderManager {
  startDrag(tabId: string): void;
  onDragOver(targetTabId: string): void;
  completeDrag(targetTabId: string): void;
  cancelDrag(): void;
  getTabOrder(): string[];
}
```

#### Implementation
- Use React drag-and-drop library (react-beautiful-dnd or similar)
- Store tab order in memory during session
- Persist order to settings on change

### 8. Data Export/Import

#### DataManager Interface
```typescript
interface ExportData {
  version: string;
  exportedAt: number;
  history: HistoryEntry[];
  bookmarks: Bookmark[];
  feedback: RecommendationFeedback[];
  settings: ArcSettings;
}

interface DataManager {
  exportData(): Promise<ExportData>;
  importData(data: ExportData, mode: 'merge' | 'replace'): Promise<void>;
  validateExportData(data: unknown): boolean;
}
```

## Data Models

### Enhanced Settings Model
```typescript
interface ArcSettings {
  theme: 'system' | 'light' | 'dark';
  jarvisEnabled: boolean;
  useHistoryForRecommendations: boolean;
  incognitoEnabled: boolean;
  searchEngine: SearchEngineType;
  tabOrder: string[];
  keyboardShortcutsEnabled: boolean;
}
```

### Bookmark Model
```typescript
interface Bookmark {
  id: string;
  url: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  tags?: string[];
  favicon?: string;
}
```

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Recommendation Score Invariant
**For any** browsing history and feedback set, the recommendation score should always be non-negative and not exceed 1.0 after normalization.
**Validates: Requirements 4.1, 4.6**

### Property 2: Temporal Weight Monotonicity
**For any** two visits where visit A is more recent than visit B, the temporal weight of visit A should be greater than or equal to the temporal weight of visit B.
**Validates: Requirements 4.2, 4.3**

### Property 3: Bookmark Persistence Round-Trip
**For any** bookmark added to the system, querying the bookmark store after persistence should return an equivalent bookmark.
**Validates: Requirements 2.5**

### Property 4: Search Query Detection Consistency
**For any** input string, the search query detection should consistently classify it as either a search query or a URL across multiple invocations.
**Validates: Requirements 3.1, 3.2**

### Property 5: Theme Application Idempotence
**For any** theme setting, applying the theme twice should result in the same visual state as applying it once.
**Validates: Requirements 6.3, 6.4**

### Property 6: Tab Order Preservation
**For any** sequence of tab reordering operations, the final tab order should match the sequence of drag-and-drop operations performed.
**Validates: Requirements 7.3, 7.4**

### Property 7: Data Export-Import Round-Trip
**For any** valid export data, importing that data and then exporting again should produce equivalent data (modulo timestamps).
**Validates: Requirements 8.2, 8.3, 8.4**

### Property 8: Keyboard Shortcut Uniqueness
**For any** keyboard shortcut configuration, no two shortcuts should map to the same key combination on the same platform.
**Validates: Requirements 5.1 through 5.8**

## Error Handling

### Recommendation Engine Errors
- **Empty History**: Return empty recommendations array gracefully
- **Invalid Feedback Data**: Skip malformed feedback entries and log warning
- **Calculation Overflow**: Clamp scores to valid range [0, 1]

### Bookmarks System Errors
- **Duplicate Bookmarks**: Allow duplicates but warn user
- **Invalid URL**: Validate URL format before saving
- **Storage Failure**: Retry with exponential backoff, show error dialog

### Search Engine Errors
- **Invalid Search Query**: Fall back to URL navigation
- **Network Error**: Show error message and suggest retry
- **Malformed Search URL**: Log error and use default search engine

### Theme System Errors
- **Invalid Theme Value**: Fall back to 'system' theme
- **CSS Loading Failure**: Use fallback colors
- **OS Theme Detection Failure**: Default to light theme

### Data Import Errors
- **Invalid File Format**: Show validation error with details
- **Version Mismatch**: Offer migration or rejection
- **Corrupted Data**: Offer rollback to previous state

## Testing Strategy

### Unit Testing Approach
- Test each module in isolation with mocked dependencies
- Cover happy paths, edge cases, and error conditions
- Aim for 80%+ code coverage on core modules
- Use descriptive test names that explain the scenario

### Property-Based Testing Approach
- Validate universal properties across 100+ generated inputs
- Use generators that constrain to valid input space
- Test invariants, round-trips, and monotonicity properties
- Each property test references a design property number

### Integration Testing Approach
- Test IPC communication between main and renderer processes
- Verify data persistence and retrieval
- Test component interactions and state management
- Use realistic data scenarios

### Test Organization
```
src/
├── core/
│   ├── recommender.ts
│   ├── recommender.test.ts          # Unit tests
│   ├── recommender.pbt.test.ts      # Property-based tests
│   ├── bookmarkStore.ts
│   ├── bookmarkStore.test.ts
│   └── bookmarkStore.pbt.test.ts
├── renderer/
│   ├── components/
│   │   ├── BrowserShell.tsx
│   │   └── BrowserShell.test.tsx
│   └── hooks/
│       ├── useTheme.ts
│       └── useTheme.test.ts
└── test/
    ├── fixtures/                    # Test data
    ├── helpers.ts                   # Test utilities
    └── setup.ts                     # Test configuration
```

### Test Configuration
- **Framework**: Vitest for unit tests
- **Property Testing**: fast-check
- **Mocking**: Vitest mocking utilities
- **Coverage**: c8 for coverage reporting
- **Minimum Iterations**: 100 per property test

