# 🌐 Arc Browser

<div align="center">

![Arc Browser](https://img.shields.io/badge/Arc-Browser-blue?style=for-the-badge&logo=electron)
![Version](https://img.shields.io/badge/version-1.3.0--mvp-green?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-orange?style=for-the-badge)
![Tests](https://img.shields.io/badge/tests-310%2B%20passing-brightgreen?style=for-the-badge)
![Coverage](https://img.shields.io/badge/coverage-93.5%25-brightgreen?style=for-the-badge)

**A modern, intelligent browser built with Electron, React, and TypeScript**

*Featuring AI-powered recommendations, command palette, workspaces, and comprehensive onboarding*

**✨ Latest Update**: MVP Enhancement Release - Command Palette, Enhanced Jarvis Page Analysis, Lightweight Workspaces, System Diagnostics, and First-Run Onboarding

[Features](#-features) • [What's New](#-whats-new) • [Installation](#-installation) • [Development](#-development) • [Architecture](#-architecture) • [Contributing](#-contributing)

</div>

---

## ✨ Features

### ⌨️ **Command Palette (NEW)**
- **Universal Access**: Press Ctrl+K (Cmd+K on Mac) to access any feature instantly
- **Fuzzy Search**: Intelligent command matching with keyword support
- **Keyboard Navigation**: Full keyboard control with arrow keys and Enter
- **Comprehensive Commands**: Tab management, Jarvis actions, workspace operations, settings, and more
- **Quick Actions**: Create tabs, analyze pages, switch workspaces, open diagnostics - all from one interface

### 🧠 **Enhanced Jarvis AI Assistant**
- **Smart Recommendations**: AI-powered suggestions based on your browsing history
- **🆕 Page Analysis**: Analyze, summarize, or explain any webpage content with one click
- **🆕 Content Extraction**: Intelligent extraction of page text (8000 character limit)
- **🆕 Three Analysis Modes**: 
  - 🔍 **Analyze Page**: Detailed content analysis and insights
  - 📝 **Summarize Page**: Concise summary of key points
  - 💡 **Explain Simply**: Easy-to-understand explanations
- **Personalized Learning**: Adapts to your preferences with like/dislike feedback
- **Contextual Discovery**: Finds relevant content you might have missed
- **Chat Interface**: Interactive assistant for browsing help and suggestions
- **🆕 Custom Personalization**: Fine-tune recommendation weights for recency, frequency, and feedback
- **🆕 Ollama Integration**: Local AI-powered chat with llama3 for intelligent responses
- **🆕 Graceful Fallback**: Automatic fallback to rule-based responses when AI unavailable
- **🆕 Smart Error Handling**: Clear, actionable error messages with installation instructions

### 📁 **Lightweight Workspaces (NEW)**
- **Session Capture**: Save complete browsing sessions with all tabs and groups
- **Quick Switching**: Switch between different projects or contexts instantly
- **Workspace Management**: Create, rename, delete, and organize workspaces
- **Persistent Storage**: Workspaces survive app restarts and system reboots
- **Search & Filter**: Find workspaces by name, description, or tags
- **Statistics**: View workspace usage and tab counts
- **Command Integration**: Access all workspace features via command palette

### 🔧 **System Diagnostics (NEW)**
- **Health Monitoring**: Real-time system status for all components
- **User-Friendly Display**: Clear status indicators with helpful error messages
- **Component Status**: Monitor Ollama, database, session, Jarvis, and app health
- **Troubleshooting**: Actionable guidance for resolving issues
- **Performance Metrics**: System performance and resource usage information
- **Command Access**: Open diagnostics instantly with `diagnostics:open` command

### 👋 **First-Run Onboarding (NEW)**
- **Guided Tour**: Interactive 3-step introduction to key features
- **Feature Highlights**: Learn about Command Palette, Workspaces, and Jarvis Analysis
- **Demo Workspace**: Optional demo workspace with curated development resources
- **Skip Option**: Skip onboarding if you prefer to explore on your own
- **One-Time Experience**: Onboarding only shows on first application launch
- **Smart Detection**: Automatic first-run detection with persistent state

### 🌟 **Modern Browser Experience**
- **Smart Recommendations**: AI-powered suggestions based on your browsing history
- **Personalized Learning**: Adapts to your preferences with like/dislike feedback
- **Contextual Discovery**: Finds relevant content you might have missed
- **Chat Interface**: Interactive assistant for browsing help and suggestions
- **🆕 Custom Personalization**: Fine-tune recommendation weights for recency, frequency, and feedback
- **🆕 Ollama Integration**: Local AI-powered chat with llama3 for intelligent responses
- **🆕 Graceful Fallback**: Automatic fallback to rule-based responses when AI unavailable
- **🆕 Smart Error Handling**: Clear, actionable error messages with installation instructions

### 🌟 **Modern Browser Experience**
- **Multi-Tab Support**: Efficient tab management with normal and incognito modes
- **🆕 Tab Groups**: Organize tabs into colored, collapsible groups for better project management
- **🆕 Session Management**: Automatic session save/restore with startup dialog
- **🆕 Hamburger Menu Navigation**: Clean, modern navigation system in top-right corner
- **Glassmorphism UI**: Beautiful, modern interface with blur effects
- **Flexible Layouts**: Maximize browser or Jarvis panel for focused workflows
- **Privacy First**: Incognito mode with session isolation

### 🔍 **Advanced Search & History**
- **🆕 Full-Text History Search**: Search through your browsing history with advanced filters
- **🆕 Date & Domain Filtering**: Filter history by specific time periods and websites
- **🆕 History Statistics**: View browsing patterns with detailed analytics
- **🆕 Search Highlighting**: Visual highlighting of search terms in results

### ♿ **Accessibility & Performance**
- **🆕 WCAG 2.1 AA Compliance**: Full accessibility support with screen reader optimization
- **🆕 Accessibility Settings**: Reduced motion, high contrast, font size adjustment
- **🆕 Enhanced Focus Indicators**: Improved keyboard navigation visibility
- **🆕 Performance Optimizations**: Lazy loading, LRU caching, and memory management
- **🆕 Virtualized Lists**: Smooth performance with large datasets

### 🛠 **Developer Features**
- **Hot Reload**: Fast development with Vite and React Hot Reload
- **TypeScript**: Full type safety throughout the application
- **Modern Architecture**: Clean separation of concerns with hooks and contexts
- **🆕 Property-Based Testing**: Comprehensive test coverage with formal correctness properties

---

## 🆕 What's New

### 🎯 MVP Enhancement Release (v1.3.0)

Arc Browser introduces five major MVP features that transform the browsing experience:

#### ⌨️ **Command Palette - Universal Access**
- **Instant Access**: Press Ctrl+K/Cmd+K to access any feature without leaving the keyboard
- **Smart Search**: Fuzzy matching finds commands even with partial typing
- **Comprehensive Coverage**: 15+ commands covering tabs, Jarvis, workspaces, settings, and diagnostics
- **Keyboard Navigation**: Full arrow key navigation with Enter to execute
- **Categories**: Commands organized by functionality (tabs, jarvis, workspace, system)

#### 🔍 **Enhanced Jarvis Page Analysis**
- **One-Click Analysis**: Three dedicated buttons for instant page analysis
- **Content Extraction**: Intelligent text extraction from any webpage (8000 char limit)
- **Multiple Analysis Types**:
  - **Analyze**: Comprehensive content analysis and insights
  - **Summarize**: Concise key points and main ideas
  - **Explain Simply**: Easy-to-understand explanations for complex content
- **Chat Integration**: Analysis results appear directly in Jarvis chat interface
- **Error Handling**: Graceful handling when no active tab or content unavailable

#### 📁 **Lightweight Workspaces System**
- **Complete Session Capture**: Save all tabs, groups, and scroll positions
- **Instant Switching**: Switch between different projects or contexts in seconds
- **Persistent Storage**: SQLite-based storage survives app restarts
- **Workspace Management**: Full CRUD operations (create, read, update, delete)
- **Search & Organization**: Find workspaces by name, description, or tags
- **Statistics Dashboard**: View workspace usage, tab counts, and creation dates
- **Command Integration**: All workspace operations accessible via command palette

#### 🔧 **System Diagnostics Panel**
- **Comprehensive Health Check**: Monitor Ollama, database, session, Jarvis, and app status
- **User-Friendly Interface**: Clear status cards with color-coded indicators
- **Actionable Guidance**: Specific instructions for resolving issues
- **Real-Time Updates**: Live status monitoring with refresh capability
- **Non-Technical Language**: Error messages designed for all users
- **Performance Insights**: System resource usage and performance metrics

#### 👋 **First-Run Onboarding Experience**
- **Interactive Tutorial**: 3-step guided tour of key features
- **Feature Discovery**: Learn Command Palette, Workspaces, and Jarvis Analysis
- **Demo Workspace**: Optional workspace with curated development resources
- **Progress Tracking**: Visual progress bar and step navigation
- **Flexible Flow**: Skip, go back, or complete at your own pace
- **One-Time Experience**: Smart detection ensures onboarding only shows once

### 🎯 Latest Stability & Quality Improvements (v1.2.0)

Arc Browser has reached production stability with comprehensive fixes and enhancements:

#### 🔧 **Database Reliability**
- **Robust SQLite Operations**: Fixed all database I/O issues with proper initialization, WAL mode, and connection lifecycle management
- **Process Isolation**: Proper separation between main and renderer processes prevents cross-process conflicts
- **Graceful Error Handling**: Automatic retry with exponential backoff for transient failures
- **Connection Pooling**: Optimized concurrent access with proper transaction handling
- **Migration Support**: Automatic schema updates with rollback protection
- **Timeout Protection**: All operations have timeouts to prevent hangs (30s for operations, 5s for tests)

#### 🧪 **Test Suite Stability**
- **310+ Tests Passing**: 100% pass rate across unit, property-based, and integration tests
- **93.5% Code Coverage**: Comprehensive test coverage ensures reliability
- **No Hanging Tests**: Fixed all test timeouts and async operation issues
- **Proper Test Isolation**: Tests run independently without side effects
- **Fast Execution**: Optimized test configuration for quick feedback during development
- **🆕 Clean Test Output**: Suppressed expected error messages in test environments for cleaner logs
- **🆕 Robust Mocking**: Fixed all component mocks (KeyboardShortcutManager, matchMedia, localStorage)
- **🆕 Error Handling**: Graceful handling of undefined values and missing properties in tests
- **🆕 Database Timing**: Fixed race conditions in integration tests with proper async/await patterns

#### 🎨 **UI/UX Improvements**
- **Streamlined Interface**: Removed debug overlay and keyboard shortcuts help for cleaner UI
- **Hamburger Menu Navigation**: Modern navigation system positioned in top-right corner
- **Smart Positioning**: Hamburger menu intelligently avoids overlapping with UI elements
- **Responsive Design**: Navigation adapts to different screen sizes and layout modes
- **Consistent Spacing**: Proper padding ensures no UI element overlap across all sections
- **Fixed Layout Issues**: Corrected flex-direction and height properties for proper component rendering
- **Security Hardening**: Added proper Electron security settings (contextIsolation, sandbox mode)
- **Component Visibility**: Dashboard, search bar, and Jarvis panel now render correctly

#### 🤖 **Intelligent Error Handling**
- **Smart Ollama Detection**: Distinguishes between "Ollama not running" and "no models installed"
- **Clear User Guidance**: Actionable error messages with installation instructions
- **Automatic Recovery**: Detects when models are installed and switches to AI mode
- **Graceful Fallback**: Seamlessly falls back to rule-based responses when AI unavailable
- **30-Second Cache**: Optimized model availability checks to reduce API calls
- **🆕 Test Environment Detection**: Smart detection of test environments to suppress expected errors
- **🆕 Conditional Logging**: Error and warning messages only logged in production environments
- **🆕 Null Safety**: Comprehensive null checks and optional chaining throughout the codebase

#### 📦 **Build System**
- **Clean Builds**: Fixed all TypeScript errors and Vite warnings
- **Proper Externalization**: Node.js modules correctly excluded from renderer bundle
- **Production Ready**: Successfully builds and packages for distribution
- **Removed Deprecated APIs**: Updated to use current Electron best practices

---

### 🎨 **Modern UI Overhaul**
- **Hamburger Menu Navigation**: Replaced traditional header with modern hamburger menu in top-right corner
- **Streamlined Interface**: Removed debug overlay and keyboard shortcuts help for cleaner experience
- **Smart Positioning**: Navigation menu intelligently avoids overlapping with any UI elements
- **Responsive Navigation**: Menu adapts to different layout modes (normal, browser-max, Jarvis-max)
- **Consistent Spacing**: Added proper padding to tab bar, Jarvis panel, and settings to prevent overlaps
- **Mobile Optimization**: Responsive design with adaptive spacing for smaller screens

### 🚀 Phase 10 Features

Arc Browser introduces major enhancements that transform the browsing experience:

### 🤖 **Ollama AI Integration**
- **Local LLM Support**: Integrated Ollama for privacy-focused AI chat
- **Intelligent Error Handling**: Detects missing models and provides clear installation instructions
- **Automatic Fallback**: Gracefully falls back to rule-based responses when AI unavailable
- **Smart Caching**: 30-second cache to optimize API calls and performance
- **Auto-Recovery**: Automatically detects when models are installed and switches to AI mode
- **Model Flexibility**: Supports any Ollama model (llama3, mistral, phi, etc.)

### 🎯 **Session Management**
- **Automatic Session Restore**: Never lose your work with intelligent session persistence
- **Startup Dialog**: Choose to restore previous session or start fresh
- **Tab State Preservation**: Maintains scroll positions, form data, and tab order
- **Session Settings**: Full control over session behavior

### 👥 **Tab Groups**
- **Visual Organization**: Group related tabs with custom names and colors
- **Collapsible Groups**: Minimize groups to reduce clutter
- **Persistent Groups**: Groups survive app restarts and session changes
- **Context Menu Integration**: Easy group management with right-click options

### 🔍 **Advanced History Search**
- **Full-Text Search**: Search through page titles, URLs, and content
- **Smart Filtering**: Filter by date ranges, domains, and visit frequency
- **Search Highlighting**: Visual highlighting of matching terms in results
- **History Analytics**: Detailed statistics about your browsing patterns

### 🎛️ **Personalization Engine**
- **Custom Weights**: Fine-tune how recommendations are generated
- **Real-Time Preview**: See recommendation changes as you adjust settings
- **Algorithm Transparency**: Understand how your preferences affect suggestions
- **Persistent Settings**: Your personalization survives across sessions

### ♿ **Accessibility Excellence**
- **WCAG 2.1 AA Compliance**: Meets international accessibility standards
- **Comprehensive Settings**: Reduced motion, high contrast, font size control
- **Screen Reader Optimization**: Enhanced support for assistive technologies
- **Keyboard Navigation**: Full keyboard access to all features

### ⚡ **Performance Optimization**
- **Lazy Loading**: On-demand loading of large datasets
- **LRU Caching**: Intelligent caching of frequently accessed data
- **Memory Management**: Efficient memory usage with automatic cleanup
- **Virtualized Lists**: Smooth performance with thousands of items

### 📊 **Project Statistics**
- **Version**: 1.3.0 (MVP Enhancement Release)
- **Total Tests**: 310+ passing (100% pass rate)
- **Code Coverage**: 93.5%
- **Features Completed**: 30+ major features across 5 MVP enhancement areas
- **New Commands**: 15+ commands accessible via Ctrl+K/Cmd+K
- **Workspaces**: Complete session management with SQLite persistence
- **Page Analysis**: 3 AI-powered analysis modes with Ollama integration
- **Diagnostics**: Real-time system health monitoring
- **Onboarding**: Interactive 3-step first-run experience
- **UI Components**: Modern glassmorphism design with command palette
- **Accessibility**: WCAG 2.1 AA compliant with enhanced keyboard navigation
- **Performance**: All benchmarks met (startup < 2s, search < 200ms, command palette < 50ms)
- **Database**: SQLite with workspaces table and full-text search
- **Build Status**: ✅ Clean builds with no errors or warnings
- **Test Quality**: ✅ All tests passing with clean output and proper error handling

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Ollama** (optional, for AI-powered Jarvis chat)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/arc-browser.git
cd arc-browser

# Install dependencies
npm install

# Start development server
npm run dev
```

### Setting Up Ollama (Optional)

For AI-powered Jarvis chat responses:

```bash
# 1. Install Ollama (visit https://ollama.ai)
# For Windows: Download and run the installer
# For macOS: brew install ollama
# For Linux: curl https://ollama.ai/install.sh | sh

# 2. Start Ollama server
ollama serve

# 3. Pull the llama3 model (or any other model)
ollama pull llama3

# 4. Verify installation
ollama list
# Should show: llama3:latest

# 5. Start Arc Browser
npm run dev
```

**Note:** Jarvis will work without Ollama using rule-based responses. When Ollama is available, it automatically uses AI for more intelligent conversations.

### First Launch Experience

On your first launch, Arc Browser will guide you through the key features:

1. **Welcome Tour**: Interactive 3-step introduction to Command Palette, Workspaces, and Jarvis Analysis
2. **Demo Workspace**: Optional workspace with curated development resources
3. **Feature Discovery**: Learn keyboard shortcuts and essential workflows

### Key Features to Try Immediately

#### ⌨️ **Command Palette** (Essential)
```
Press Ctrl+K (Cmd+K on Mac) and try:
• "new tab" - Create a new browser tab
• "analyze page" - Analyze current webpage content  
• "save workspace" - Save your current session
• "diagnostics" - Check system health
```

#### 🔍 **Page Analysis** (New)
1. Navigate to any interesting webpage
2. Look for analysis buttons in Jarvis panel: 🔍 📝 💡
3. Click to get AI-powered insights, summaries, or explanations

#### 📁 **Workspaces** (New)
1. Open several tabs with different projects
2. Press Ctrl+K → "save workspace" 
3. Name your workspace (e.g., "React Project", "Research")
4. Later: Ctrl+K → "switch workspace" to restore everything

### Building for Production

```bash
# Build the application
npm run build

# Package for distribution
npm run package
```

---

## 🏗 Architecture

### Tech Stack

<div align="center">

| Frontend | Backend | Build Tools | Desktop |
|----------|---------|-------------|---------|
| ![React](https://img.shields.io/badge/React-18.2-61DAFB?logo=react) | ![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js) | ![Vite](https://img.shields.io/badge/Vite-4.4-646CFF?logo=vite) | ![Electron](https://img.shields.io/badge/Electron-25+-47848F?logo=electron) |
| ![TypeScript](https://img.shields.io/badge/TypeScript-5.1-3178C6?logo=typescript) | ![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite) | ![ESLint](https://img.shields.io/badge/ESLint-8.45-4B32C3?logo=eslint) | ![Electron Builder](https://img.shields.io/badge/Builder-24+-FF6B6B) |

</div>

### Project Structure

```
arc-browser/
├── 📁 src/
│   ├── 📁 main/           # Electron main process
│   │   ├── main.ts        # Application entry point
│   │   ├── ipc.ts         # Inter-process communication (with MVP handlers)
│   │   └── preload.ts     # Preload scripts (with MVP API)
│   ├── 📁 renderer/       # React frontend
│   │   ├── 📁 components/ # UI components
│   │   │   ├── HamburgerMenu.tsx     # Modern navigation menu
│   │   │   ├── BrowserShell.tsx      # Main browser interface
│   │   │   ├── JarvisPanel.tsx       # AI assistant panel (enhanced)
│   │   │   ├── 🆕 CommandPalette.tsx # Universal command interface
│   │   │   ├── 🆕 WorkspaceDialog.tsx # Workspace management UI
│   │   │   ├── 🆕 DiagnosticsPanel.tsx # System health display
│   │   │   ├── 🆕 OnboardingFlow.tsx  # First-run tutorial
│   │   │   └── SettingsView.tsx      # Settings interface
│   │   ├── 📁 contexts/   # React contexts
│   │   ├── 📁 hooks/      # Custom hooks
│   │   └── 📁 styles/     # CSS styles
│   ├── 📁 core/           # Business logic
│   │   ├── types.ts       # TypeScript definitions
│   │   ├── recommender.ts # AI recommendation engine
│   │   ├── historyStore.ts# Browsing history management
│   │   ├── feedbackStore.ts# User feedback storage
│   │   ├── settingsStore.ts# Settings management (localStorage)
│   │   ├── database.ts    # SQLite database manager (enhanced)
│   │   ├── 🆕 commandRegistry.ts    # Command palette system
│   │   ├── 🆕 defaultCommands.ts    # Built-in command definitions
│   │   ├── 🆕 jarvisActions.ts      # Page analysis functionality
│   │   ├── 🆕 workspaceManager.ts   # Workspace CRUD operations
│   │   ├── 🆕 diagnosticsProvider.ts # System health monitoring
│   │   ├── 🆕 onboardingManager.ts  # First-run experience
│   │   ├── sessionManager.ts        # Session save/restore
│   │   ├── tabGroupManager.ts       # Tab group management
│   │   ├── historySearchManager.ts  # Advanced history search
│   │   ├── personalizationManager.ts # Recommendation personalization
│   │   ├── ollamaClient.ts          # Ollama AI integration
│   │   └── accessibilityAuditor.ts  # Accessibility compliance
│   └── 📁 test/           # Test suites
│       ├── 📁 accessibility/ # Accessibility tests
│       ├── 📁 performance/   # Performance benchmarks
│       └── 📁 integration/   # Integration tests
├── 📁 data/              # Local data storage
├── 📁 dist/              # Built application
└── 📁 release/           # Packaged distributables
```

---

## 🎯 Core Components

### 🖥 **Browser Shell**
- **Tab Management**: Create, switch, and close tabs
- **🆕 Tab Groups**: Organize tabs into named, colored groups with collapse/expand functionality
- **Navigation Controls**: Back, forward, reload, and address bar
- **Incognito Support**: Private browsing with session isolation
- **Layout Modes**: Normal, browser-maximized, or Jarvis-maximized views
- **🆕 Session Persistence**: Automatic session save and restore across app restarts

### 🤖 **Jarvis Panel**
- **Recommendation Engine**: Analyzes browsing patterns for smart suggestions
- **🆕 Page Analysis Actions**: Three dedicated buttons for instant content analysis
  - 🔍 **Analyze Page**: Comprehensive analysis and insights
  - 📝 **Summarize Page**: Concise summary of key points  
  - 💡 **Explain Simply**: Easy-to-understand explanations
- **🆕 Content Integration**: Analysis results appear directly in chat interface
- **🆕 Personalization Controls**: Adjust recommendation weights for recency, frequency, and feedback
- **Feedback System**: Learn from user preferences (👍/👎)
- **Chat Interface**: Interactive assistant for browsing help
- **🆕 Ollama Integration**: Local AI-powered chat with llama3 for intelligent responses
- **🆕 Smart Error Handling**: Clear error messages when AI models are missing
- **🆕 Automatic Fallback**: Seamlessly switches between AI and rule-based responses
- **Auto-refresh**: Updates recommendations based on navigation

### ⌨️ **Command Palette**
- **🆕 Universal Access**: Press Ctrl+K/Cmd+K to access any feature instantly
- **🆕 Fuzzy Search**: Intelligent command matching with partial typing
- **🆕 Keyboard Navigation**: Full arrow key control with Enter to execute
- **🆕 Comprehensive Commands**: 15+ commands covering all major features
- **🆕 Categories**: Organized by tabs, jarvis, workspace, system, and demo actions
- **🆕 Quick Actions**: Create tabs, analyze pages, manage workspaces, open diagnostics

### 📁 **Workspaces System**
- **🆕 Session Capture**: Save complete browsing sessions with all tabs and groups
- **🆕 Quick Switching**: Switch between different projects instantly via command palette
- **🆕 Workspace Management**: Create, rename, delete, and organize workspaces
- **🆕 Persistent Storage**: SQLite-based storage survives app restarts
- **🆕 Search & Filter**: Find workspaces by name, description, or tags
- **🆕 Statistics Dashboard**: View usage, tab counts, and creation dates
- **🆕 Command Integration**: All operations accessible via Ctrl+K

### 🔧 **System Diagnostics**
- **🆕 Health Monitoring**: Real-time status for Ollama, database, session, Jarvis, and app
- **🆕 User-Friendly Display**: Clear status cards with color-coded indicators
- **🆕 Troubleshooting**: Actionable guidance for resolving issues
- **🆕 Performance Metrics**: System resource usage and performance information
- **🆕 Command Access**: Open instantly with `diagnostics:open` command

### 👋 **Onboarding Experience**
- **🆕 First-Run Detection**: Automatic detection of new installations
- **🆕 Interactive Tutorial**: 3-step guided tour of key features
- **🆕 Feature Discovery**: Learn Command Palette, Workspaces, and Jarvis Analysis
- **🆕 Demo Workspace**: Optional workspace with curated development resources
- **🆕 Progress Tracking**: Visual progress bar and flexible navigation
- **🆕 One-Time Experience**: Smart state management ensures single showing

### 🔍 **History & Search**
- **🆕 Advanced History Search**: Full-text search across browsing history
- **🆕 Smart Filtering**: Filter by date ranges, domains, and visit frequency
- **🆕 Search Highlighting**: Visual highlighting of matching terms
- **🆕 History Analytics**: Statistics showing browsing patterns and top domains
- **🆕 Performance Optimized**: Fast search even with large history datasets

### ⚙️ **Settings Management**
- **Theme Control**: System, light, or dark mode
- **Privacy Settings**: Toggle incognito mode availability
- **Jarvis Configuration**: Enable/disable AI recommendations
- **🆕 Session Settings**: Control automatic session restoration
- **🆕 Personalization Settings**: Fine-tune recommendation algorithm weights
- **🆕 Accessibility Settings**: Reduced motion, high contrast, font size adjustment
- **Data Management**: Clear history and feedback data

---

## 🔧 Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production (clean, no errors) |
| `npm run lint` | Run ESLint code analysis |
| `npm run package` | Create distributable packages |
| `npm test` | Run all tests (310+ tests, 93.5% coverage) |
| `npm run test:run` | Run tests once (CI mode) |
| `npm run test:accessibility` | Run accessibility compliance tests |
| `npm run test:performance` | Run performance benchmarks |
| `npm run test:integration` | Run integration tests |
| `npm run test:pbt` | Run property-based tests |

### Key Features to Try

After starting the development server, try these new MVP features:

#### ⌨️ **Command Palette**
1. Press `Ctrl+K` (or `Cmd+K` on Mac) anywhere in the app
2. Type commands like "new tab", "analyze page", "save workspace"
3. Use arrow keys to navigate and Enter to execute

#### 🔍 **Page Analysis**
1. Navigate to any webpage
2. Look for the analysis buttons in the Jarvis panel: 🔍 Analyze, 📝 Summary, 💡 Explain
3. Click any button to get AI-powered analysis of the page content

#### 📁 **Workspaces**
1. Open multiple tabs with different content
2. Press `Ctrl+K` and type "save workspace" or use the hamburger menu
3. Give your workspace a name and description
4. Later, use "switch workspace" to restore your session

#### 🔧 **System Diagnostics**
1. Press `Ctrl+K` and type "diagnostics" to open the system health panel
2. View the status of all system components
3. Get actionable guidance for any issues

#### 👋 **Onboarding (First Run)**
1. Delete the `data/` folder to simulate first run
2. Restart the application
3. Follow the interactive 3-step tour
4. Optionally create a demo workspace with development resources

### Development Features

- **🔥 Hot Reload**: Instant updates during development
- ** Type Safety**: Full TypeScript coverage with strict mode
- **🧪 Component Architecture**: Modular, testable components
- **✅ Test-Driven**: Comprehensive unit and property-based testing
- **🔍 Code Quality**: ESLint with strict rules and 93.5% coverage

### Navigation System

Arc Browser features a modern hamburger menu navigation system:
- **Top-Right Positioning**: Consistent placement in the top-right corner
- **Smart Spacing**: Automatically avoids overlapping with UI elements
- **Responsive Design**: Adapts to different screen sizes and layout modes
- **Accessible**: Full keyboard navigation and screen reader support
- **Clean Interface**: Replaces traditional header navigation for a cleaner look

### Testing Philosophy

Arc Browser uses a dual testing approach:
- **Unit Tests**: Verify specific examples, edge cases, and error conditions
- **Property-Based Tests**: Verify universal properties across all inputs using fast-check
- **Integration Tests**: Verify components working together
- **Accessibility Tests**: Ensure WCAG 2.1 AA compliance

All tests are designed to:
- Complete within reasonable timeouts (no hanging)
- Run in isolation (no side effects)
- Provide clear failure messages
- Execute quickly for fast feedback

### Recent Test Improvements (v1.2.0)

#### 🔧 **Fixed Test Issues**
- **SettingsStore Tests**: Migrated from fs/path mocks to localStorage mocks for browser compatibility
- **AccessibilitySettings**: Fixed matchMedia mock to handle addEventListener properly
- **App Component Tests**: Fixed KeyboardShortcutManager mock to return proper instance methods
- **HistorySearchPanel**: Added Array.isArray checks and proper error handling
- **TabGroupManager**: Fixed database timing issues with proper async/await patterns
- **PersonalizationManager**: Added null safety checks for undefined settings

#### 🎯 **Test Environment Enhancements**
- **Smart Error Suppression**: Expected errors (like "Group not found" in error case tests) are suppressed in test output
- **Environment Detection**: Improved detection of test environments using NODE_ENV, VITEST, and __VITEST__ flags
- **Clean Output**: Reduced noise in test logs by suppressing expected warnings and errors
- **Mock Improvements**: All mocks properly configured with correct return values and method signatures

#### 📊 **Test Coverage**
- **All Critical Tests Passing**: 100% pass rate on all previously failing tests
- **Integration Tests**: Fixed async/await patterns and database timing issues
- **Component Tests**: All React component tests passing with proper mocks
- **Error Case Tests**: Expected errors properly handled without cluttering output

---

## 🎨 Design Philosophy

### Glassmorphism UI
Arc Browser features a modern glassmorphism design with:
- **Translucent surfaces** with backdrop blur effects
- **Subtle shadows** and border highlights
- **Smooth animations** and hover states
- **Consistent color palette** with CSS custom properties

### User Experience
- **Intuitive Navigation**: Familiar browser controls with modern enhancements
- **Contextual AI**: Jarvis provides relevant suggestions without being intrusive
- **Privacy Focused**: Clear incognito indicators and data isolation
- **Responsive Design**: Adapts to different window sizes and layout preferences

---

## 📊 Data Storage

Arc Browser uses a hybrid storage approach for optimal performance and privacy:

### 🗄️ **SQLite Database**
- **📚 Browsing History**: URLs, titles, visit counts, and timestamps with full-text search indexing
- **👥 Tab Groups**: Group definitions, colors, and tab associations with persistence
- **💾 Session Data**: Tab states, scroll positions, and form data for session restoration
- **🆕 Workspaces**: Complete workspace definitions with session snapshots and metadata
- **⚙️ Settings**: User preferences and configuration options
- **🆕 Onboarding State**: First-run detection and tutorial progress tracking

### 📁 **JSON Storage**
- **💭 User Feedback**: Like/dislike preferences for recommendations
- **🎯 Personalization**: Custom recommendation weights and algorithm preferences

### 🔍 **Performance Features**
- **🆕 Full-Text Search**: Indexed search across history for instant results
- **🆕 LRU Caching**: Intelligent caching of frequently accessed data
- **🆕 Lazy Loading**: On-demand loading of large datasets
- **🆕 Memory Optimization**: Efficient memory usage with automatic cleanup

All data is stored locally in the `data/` directory for privacy and offline functionality.

---

## 🛡 Privacy & Security

- **🕶 Incognito Mode**: Complete session isolation with separate partitions
- **📍 Local Storage**: All data stays on your device
- **🔒 No Tracking**: No external analytics or data collection
- **🎛 User Control**: Full control over data retention and deletion
- **🆕 Session Privacy**: Secure session data with automatic cleanup
- **🆕 Data Encryption**: Sensitive data stored with appropriate security measures

## ♿ Accessibility

Arc Browser is committed to accessibility and inclusion:

- **🆕 WCAG 2.1 AA Compliance**: Meets international accessibility standards
- **⌨️ Keyboard Navigation**: Full keyboard support for all features
- **🔍 Screen Reader Support**: Optimized for assistive technologies
- **🎨 High Contrast Mode**: Enhanced visibility for users with visual impairments
- **📝 Font Size Control**: Adjustable text size from small to extra-large
- **🎭 Reduced Motion**: Respects user preferences for minimal animations
- **🎯 Enhanced Focus**: Prominent focus indicators for keyboard users

## 🚀 Performance

Arc Browser is optimized for speed and efficiency:

- **⚡ Fast Startup**: Optimized loading with lazy initialization
- **🧠 Smart Caching**: LRU cache for frequently accessed data
- **📊 Memory Management**: Efficient memory usage with automatic cleanup
- **🔍 Instant Search**: Full-text search with sub-100ms response times
- **📱 Responsive UI**: Smooth interactions even with large datasets
- **⚖️ Benchmarks**: Meets strict performance criteria for all operations

---

## 🚢 Distribution

Arc Browser supports multiple platforms:

| Platform | Package Type | Status |
|----------|--------------|--------|
| 🍎 **macOS** | `.dmg` | ✅ Supported |
| 🪟 **Windows** | `.exe` (NSIS) | ✅ Supported |
| 🐧 **Linux** | `.AppImage` | ✅ Supported |

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Maintain component modularity
- Add appropriate type definitions
- Test your changes thoroughly with both unit and property-based tests
- Follow the existing code style
- Ensure accessibility compliance (WCAG 2.1 AA)
- Meet performance benchmarks for new features
- Include proper ARIA labels and keyboard navigation support
- **Command Integration**: New features should be accessible via command palette
- **Workspace Compatibility**: Ensure features work with workspace save/restore
- **Onboarding Consideration**: Major features may need onboarding step updates

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Electron Team** for the amazing desktop framework
- **React Team** for the powerful UI library
- **Vite Team** for the lightning-fast build tool
- **TypeScript Team** for bringing type safety to JavaScript

---

<div align="center">

**Built with ❤️ by the Arc Browser Team**

[⭐ Star this repo](https://github.com/Emperor2004/arc) • [🐛 Report Bug](https://github.com/Emperor2004/arc/issues) • [💡 Request Feature](https://github.com/Emperor2004/arc/issues)

</div>