# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2024-01-XX

### Added
- Tab Groups: Organize tabs into named, colored, collapsible groups
- Session Management: Automatic session save/restore with startup dialog
- Advanced History Search: Full-text search with date/domain filtering and highlighting
- Recommendation Personalization: Customizable weights for recency, frequency, and feedback
- Ollama AI Integration: Local AI-powered chat with graceful fallback
- Accessibility Features: WCAG 2.1 AA compliance with keyboard navigation and screen reader support
- Performance Optimizations: Lazy loading, LRU caching, and virtualized lists

### Changed
- Enhanced error boundary with improved fallback UI
- Security settings now conditional on NODE_ENV (sandbox enabled in production)
- Improved error handling for missing window.arc API

### Fixed
- Database reliability: Fixed all database I/O issues with proper initialization and WAL mode
- Test suite stability: All 310 tests passing with 93.5% code coverage
- UI rendering issues: Fixed layout problems and component visibility
- Build system: Clean builds with proper externalization of Node.js modules
- Version mismatch: Synchronized package.json version with README

### Security
- Re-enabled sandbox mode in production builds
- Re-enabled webSecurity in production builds
- DevTools only enabled in development mode

## [1.0.0] - Initial Release

### Added
- Multi-tab browser with incognito mode support
- Jarvis AI Assistant with recommendation engine
- Browsing history management
- User feedback system (like/dislike)
- Settings management
- Glassmorphism UI design
- Debug overlay for development

[1.2.0]: https://github.com/your-username/arc-browser/compare/v1.0.0...v1.2.0
[1.0.0]: https://github.com/your-username/arc-browser/releases/tag/v1.0.0
