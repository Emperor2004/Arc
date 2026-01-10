# 🌐 Arc Browser

<div align="center">

![Arc Browser](https://img.shields.io/badge/Arc-Browser-blue?style=for-the-badge&logo=electron)
![Version](https://img.shields.io/badge/version-1.1.0--phase10-green?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-orange?style=for-the-badge)

**A modern, intelligent browser built with Electron, React, and TypeScript**

*Featuring AI-powered recommendations through Jarvis assistant*

**🆕 Phase 10 Update**: Enhanced with session management, tab groups, advanced search, personalization, and accessibility features

[Features](#-features) • [What's New](#-whats-new-in-phase-10) • [Installation](#-installation) • [Development](#-development) • [Architecture](#-architecture) • [Contributing](#-contributing)

</div>

---

## ✨ Features

### 🧠 **Jarvis AI Assistant**
- **Smart Recommendations**: AI-powered suggestions based on your browsing history
- **Personalized Learning**: Adapts to your preferences with like/dislike feedback
- **Contextual Discovery**: Finds relevant content you might have missed
- **Chat Interface**: Interactive assistant for browsing help and suggestions
- **🆕 Custom Personalization**: Fine-tune recommendation weights for recency, frequency, and feedback

### 🌟 **Modern Browser Experience**
- **Multi-Tab Support**: Efficient tab management with normal and incognito modes
- **🆕 Tab Groups**: Organize tabs into colored, collapsible groups for better project management
- **🆕 Session Management**: Automatic session save/restore with startup dialog
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
- **Debug Overlay**: Real-time development debugging (dev mode only)
- **Hot Reload**: Fast development with Vite and React Hot Reload
- **TypeScript**: Full type safety throughout the application
- **Modern Architecture**: Clean separation of concerns with hooks and contexts
- **🆕 Property-Based Testing**: Comprehensive test coverage with formal correctness properties

---

## 🆕 What's New in Phase 10

Arc Browser Phase 10 introduces major enhancements that transform the browsing experience:

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

### 📊 **Phase 10 Statistics**
- **23 Major Features**: Completed across 6 enhancement areas
- **80+ New Tests**: Comprehensive unit and property-based testing
- **WCAG 2.1 AA**: Full accessibility compliance achieved
- **Performance Benchmarks**: All targets met for startup, search, and memory usage
- **SQLite Integration**: Enhanced data persistence and search capabilities

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v16 or higher)
- **npm** or **yarn**

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
│   │   ├── ipc.ts         # Inter-process communication
│   │   └── preload.ts     # Preload scripts
│   ├── 📁 renderer/       # React frontend
│   │   ├── 📁 components/ # UI components
│   │   ├── 📁 contexts/   # React contexts
│   │   ├── 📁 hooks/      # Custom hooks
│   │   └── 📁 styles/     # CSS styles
│   ├── 📁 core/           # Business logic
│   │   ├── types.ts       # TypeScript definitions
│   │   ├── recommender.ts # AI recommendation engine
│   │   ├── historyStore.ts# Browsing history management
│   │   ├── feedbackStore.ts# User feedback storage
│   │   ├── 🆕 sessionManager.ts    # Session save/restore
│   │   ├── 🆕 tabGroupManager.ts   # Tab group management
│   │   ├── 🆕 historySearchManager.ts # Advanced history search
│   │   ├── 🆕 personalizationManager.ts # Recommendation personalization
│   │   └── 🆕 accessibilityAuditor.ts # Accessibility compliance
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
- **🆕 Personalization Controls**: Adjust recommendation weights for recency, frequency, and feedback
- **Feedback System**: Learn from user preferences (👍/👎)
- **Chat Interface**: Interactive assistant for browsing help
- **Auto-refresh**: Updates recommendations based on navigation

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
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint code analysis |
| `npm run package` | Create distributable packages |
| `npm test` | Run unit and property-based tests |
| `npm run test:accessibility` | Run accessibility compliance tests |
| `npm run test:performance` | Run performance benchmarks |
| `npm run test:integration` | Run integration tests |

### Development Features

- **🔥 Hot Reload**: Instant updates during development
- **🐛 Debug Overlay**: Real-time state monitoring (dev mode only)
- **📊 Type Safety**: Full TypeScript coverage
- **🧪 Component Architecture**: Modular, testable components

### Debug Overlay

In development mode, Arc Browser includes a debug overlay showing:
- Current section (browser/settings)
- Layout mode status
- Active tab information
- Jarvis AI status
- Recent actions with timestamps

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
- **⚙️ Settings**: User preferences and configuration options

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

[⭐ Star this repo](https://github.com/your-username/arc-browser) • [🐛 Report Bug](https://github.com/your-username/arc-browser/issues) • [💡 Request Feature](https://github.com/your-username/arc-browser/issues)

</div>