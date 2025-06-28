# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Gemini CLI is a command-line AI workflow tool that connects to Google's Gemini API. It consists of a monorepo with two main packages:
- **CLI Package** (`packages/cli`): Terminal UI using React/Ink for user interaction
- **Core Package** (`packages/core`): Backend logic, API client, and tool execution

## Development Commands

### Essential Commands
```bash
# Initial setup
npm install

# Build
npm run build          # Build all packages
npm run build:cli      # Build CLI package only
npm run build:core     # Build Core package only

# Development
npm start              # Run the CLI
npm run debug          # Start with Node debugger (inspect-brk)

# Testing
npm test               # Run unit tests in all packages
npm run test:e2e       # Run integration tests
# Run specific test file (from package directory)
cd packages/cli && npx vitest run src/ui/utils/__tests__/MarkdownDisplay.test.tsx

# Code Quality
npm run lint           # Run ESLint
npm run lint:fix       # Auto-fix ESLint issues
npm run format         # Format with Prettier
npm run typecheck      # TypeScript type checking
npm run preflight      # Complete pre-commit check (clean, format, lint, build, test)
```

### Advanced Commands
```bash
# Sandbox/Container
npm run build:sandbox      # Build Docker/Podman sandbox container
npm run build:all          # Build packages + sandbox

# Publishing
npm run publish:release    # Full release process

# Testing with different sandbox modes
npm run test:integration:sandbox:none    # No sandbox
npm run test:integration:sandbox:docker  # Docker sandbox
npm run test:integration:sandbox:podman  # Podman sandbox
```

## Architecture & Key Concepts

### Tool System
The Core package implements an extensible tool system (`packages/core/src/tools/`) that allows Gemini to interact with:
- File system operations (read, write, edit, pattern matching)
- Shell command execution (with user approval for modifications)
- Web fetching and search capabilities
- Model Context Protocol (MCP) server integration

Tools are invoked by the Gemini API through the Core package, with safety checks for destructive operations.

### UI Components
The CLI package uses Ink (React for terminals) with custom components in `packages/cli/src/ui/`:
- Theme system supporting multiple color schemes
- Security-hardened markdown rendering with XSS protection
- Command input handling and history management
- Real-time response streaming

### Testing Strategy
- **Unit Tests**: Vitest with jsdom for React components
- **Coverage Target**: 100% (enforced in CI)
- **Test Reports**: Multiple formats including JUnit XML for CI
- **Integration Tests**: Separate E2E suite with sandbox variations

### Recent Enhancements
The markdown rendering system was recently refactored for security:
- Separated into distinct modules: parser, constants, security, and types
- Comprehensive test coverage achieved
- XSS protection and safe rendering implemented

### Build System
- **TypeScript**: Strict mode with ES2022 target
- **Bundling**: esbuild for fast builds
- **Module System**: ES modules throughout
- **Node Version**: 18+ required

### Authentication
The CLI supports multiple authentication methods:
- Personal Google accounts (default, 60 requests/minute)
- API keys from Google AI Studio
- Google Workspace accounts

### Configuration
- CLI config: `packages/cli/src/config/`
- Core config: `packages/core/src/config/`
- User themes and preferences stored locally

## Code Style Guidelines

1. TypeScript strict mode is enforced - no `any` types
2. ES modules used throughout - no CommonJS
3. React components use functional style with hooks
4. Test files co-located with source using `__tests__` directories
5. Prettier formatting is mandatory (run before commits)
6. ESLint with custom rules prevents cross-package relative imports

## Common Development Tasks

### Adding a New Tool
1. Create tool in `packages/core/src/tools/`
2. Register in the tool system
3. Add tests with mock implementations
4. Update documentation

### Modifying UI Components
1. Components in `packages/cli/src/ui/components/`
2. Use Ink's component library for terminal UI
3. Test with ink-testing-library
4. Consider theme compatibility

### Debugging
- VS Code launch configuration available (F5 to debug)
- React DevTools support with `DEV=true npm start`
- Use `npm run debug` for Node.js debugging