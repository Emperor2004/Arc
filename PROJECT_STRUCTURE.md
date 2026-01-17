# Arc Browser - Project Structure

## Root Directory Structure

```
arc-browser/
├── 📁 .github/           # GitHub workflows and templates
├── 📁 .husky/            # Git hooks configuration
├── 📁 .kiro/             # Kiro AI assistant configuration
├── 📁 .vscode/           # VS Code workspace settings
├── 📁 build/             # Build artifacts and configuration
├── 📁 data/              # Local application data (SQLite, settings)
├── 📁 dist/              # Production build output
├── 📁 node_modules/      # NPM dependencies
├── 📁 public/            # Static assets
├── 📁 release/           # Packaged application distributables
├── 📁 scripts/           # Build and utility scripts
├── 📁 src/               # Source code
│   ├── 📁 main/          # Electron main process
│   ├── 📁 renderer/      # React frontend
│   ├── 📁 core/          # Business logic and utilities
│   └── 📁 test/          # Organized test suites
├── 📄 .eslintrc.js       # ESLint configuration
├── 📄 .gitignore         # Git ignore patterns
├── 📄 CHANGELOG.md       # Version history and changes
├── 📄 electron-builder.yml # Electron packaging configuration
├── 📄 package.json       # NPM package configuration
├── 📄 README.md          # Project documentation
├── 📄 tsconfig.json      # TypeScript configuration
├── 📄 tsconfig.main.json # TypeScript config for main process
├── 📄 vite.config.ts     # Vite build configuration
├── 📄 vitest.config.mjs  # Vitest testing configuration
└── 📄 webpack.config.js  # Webpack configuration
```

## Source Code Organization

### `/src/main/` - Electron Main Process
- `main.ts` - Application entry point
- `ipc.ts` - Inter-process communication handlers
- `preload.ts` - Preload scripts for renderer security

### `/src/renderer/` - React Frontend
- `📁 components/` - React UI components (co-located with `.test.tsx` files)
- `📁 contexts/` - React context providers
- `📁 hooks/` - Custom React hooks
- `📁 styles/` - CSS stylesheets and themes
- `App.tsx` - Main application component

### `/src/core/` - Business Logic
- Database managers (SQLite operations)
- Store managers (settings, history, feedback)
- AI integration (Ollama client)
- Utility functions and type definitions
- Co-located test files (`.test.ts`, `.pbt.test.ts`)

### `/src/test/` - Organized Test Suites
- `📁 accessibility/` - WCAG compliance and accessibility tests
- `📁 performance/` - Performance benchmarks and monitoring
- `📁 integration/` - Cross-component integration tests
- `📁 checkpoints/` - Feature validation checkpoints

## File Naming Conventions

- **Components**: `PascalCase.tsx` (e.g., `HamburgerMenu.tsx`)
- **Unit Tests**: `fileName.test.ts/tsx`
- **Property-Based Tests**: `fileName.pbt.test.ts`
- **Integration Tests**: `fileName.integration.test.ts`
- **Type Definitions**: `types.ts`
- **Utilities**: `camelCase.ts`

## Ignored Files and Directories

The following are automatically ignored by Git:
- Build outputs (`dist/`, `build/`, `release/`)
- Test results and logs (`test-results/`, `*.log`)
- Generated documentation (`*_SUMMARY.md`, `*_COMPLETE.md`)
- Temporary files (`temp-*/`, `*.tmp`)
- IDE and OS files (`.vscode/settings.json`, `.DS_Store`)
- Dependencies (`node_modules/`)
- Local data (`data/`)

## Clean Architecture Principles

1. **Separation of Concerns**: Main process, renderer, and business logic are clearly separated
2. **Co-location**: Test files are placed next to their source files
3. **Consistent Naming**: Clear naming conventions for all file types
4. **No Clutter**: Generated files and build artifacts are properly ignored
5. **Organized Testing**: Different types of tests are properly categorized

This structure supports maintainable development, clear testing strategies, and efficient build processes.