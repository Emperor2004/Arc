# 🌐 Arc Browser

<div align="center">

![Arc Browser](https://img.shields.io/badge/Arc-Browser-blue?style=for-the-badge&logo=electron)
![Version](https://img.shields.io/badge/version-1.0.0-green?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-orange?style=for-the-badge)

**A modern, intelligent browser built with Electron, React, and TypeScript**

*Featuring AI-powered recommendations through Jarvis assistant*

[Features](#-features) • [Installation](#-installation) • [Development](#-development) • [Architecture](#-architecture) • [Contributing](#-contributing)

</div>

---

## ✨ Features

### 🧠 **Jarvis AI Assistant**
- **Smart Recommendations**: AI-powered suggestions based on your browsing history
- **Personalized Learning**: Adapts to your preferences with like/dislike feedback
- **Contextual Discovery**: Finds relevant content you might have missed
- **Chat Interface**: Interactive assistant for browsing help and suggestions

### 🌟 **Modern Browser Experience**
- **Multi-Tab Support**: Efficient tab management with normal and incognito modes
- **Glassmorphism UI**: Beautiful, modern interface with blur effects
- **Flexible Layouts**: Maximize browser or Jarvis panel for focused workflows
- **Privacy First**: Incognito mode with session isolation

### 🛠 **Developer Features**
- **Debug Overlay**: Real-time development debugging (dev mode only)
- **Hot Reload**: Fast development with Vite and React Hot Reload
- **TypeScript**: Full type safety throughout the application
- **Modern Architecture**: Clean separation of concerns with hooks and contexts

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
│   └── 📁 core/           # Business logic
│       ├── types.ts       # TypeScript definitions
│       ├── recommender.ts # AI recommendation engine
│       ├── historyStore.ts# Browsing history management
│       └── feedbackStore.ts# User feedback storage
├── 📁 data/              # Local data storage
├── 📁 dist/              # Built application
└── 📁 release/           # Packaged distributables
```

---

## 🎯 Core Components

### 🖥 **Browser Shell**
- **Tab Management**: Create, switch, and close tabs
- **Navigation Controls**: Back, forward, reload, and address bar
- **Incognito Support**: Private browsing with session isolation
- **Layout Modes**: Normal, browser-maximized, or Jarvis-maximized views

### 🤖 **Jarvis Panel**
- **Recommendation Engine**: Analyzes browsing patterns for smart suggestions
- **Feedback System**: Learn from user preferences (👍/👎)
- **Chat Interface**: Interactive assistant for browsing help
- **Auto-refresh**: Updates recommendations based on navigation

### ⚙️ **Settings Management**
- **Theme Control**: System, light, or dark mode
- **Privacy Settings**: Toggle incognito mode availability
- **Jarvis Configuration**: Enable/disable AI recommendations
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

Arc Browser uses JSON-based local storage for:

- **📚 Browsing History**: URLs, titles, visit counts, and timestamps
- **💭 User Feedback**: Like/dislike preferences for recommendations
- **⚙️ Settings**: User preferences and configuration options

All data is stored locally in the `data/` directory for privacy and offline functionality.

---

## 🛡 Privacy & Security

- **🕶 Incognito Mode**: Complete session isolation with separate partitions
- **📍 Local Storage**: All data stays on your device
- **🔒 No Tracking**: No external analytics or data collection
- **🎛 User Control**: Full control over data retention and deletion

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
- Test your changes thoroughly
- Follow the existing code style

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