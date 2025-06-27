# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Core Development Workflow
- **Full validation**: `npm run preflight` - Run this before any PR (includes clean, install, format, lint, build, typecheck, test)
- **Build**: `npm run build` - Build the project
- **Test**: `npm test` - Run unit tests with Vitest
- **Test (E2E)**: `npm run test:e2e` - Run integration tests
- **Run single test**: `npm test -- path/to/test.ts` or `npm test -- -t "test name"`
- **Lint**: `npm run lint` - Run ESLint
- **Format**: `npm run format` - Run Prettier
- **Type check**: `npm run typecheck` - Run TypeScript compiler checks
- **Run CLI**: `npm start` - Run the CLI from source

### Container Development
- **Build with container**: `npm run build:all` - Build project and sandbox container
- **Container management**: Located in `sandbox/` directory with Dockerfile

## Architecture Overview

This is a monorepo with two main packages:

### packages/cli
- User-facing command-line interface built with React and Ink for terminal UI
- Handles user input, themes, display, and CLI configuration
- Uses TypeScript with ES modules
- Components follow React best practices with functional components and hooks

### packages/core  
- Backend functionality managing Gemini API communication
- Orchestrates tool execution and prompt construction
- Implements extensible tool system (file operations, shell, web fetch, MCP servers)
- Handles state management and conversation history

## Testing Guidelines

### Framework: Vitest (NOT Jest)
- Test files co-located with source: `*.test.ts`, `*.test.tsx`
- React components tested with ink-testing-library
- Coverage enabled with v8 provider

### Mocking Patterns
```typescript
// ES module mocking (place at top of test file)
vi.mock('os', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, homedir: vi.fn() };
});

// Hoisted mocks for early definition
const myMock = vi.hoisted(() => vi.fn());

// Setup/teardown pattern
beforeEach(() => vi.resetAllMocks());
afterEach(() => vi.restoreAllMocks());
```

### Common Mocks
- Node built-ins: `fs`, `fs/promises`, `os`, `path`, `child_process`
- External SDKs: `@google/genai`, `@modelcontextprotocol/sdk`
- Internal modules from other packages

## Code Style and Conventions

### TypeScript Best Practices
- **Prefer plain objects over classes** with TypeScript interfaces
- **Avoid `any` types** - use `unknown` when type is truly unknown
- **Type assertions should be rare** - indicates potential design issue
- **ES module encapsulation** - export public API, keep internals private

### JavaScript Patterns
- Use array operators: `.map()`, `.filter()`, `.reduce()` for functional programming
- Embrace immutability - create new objects/arrays rather than mutating
- Leverage ES module syntax for API boundaries

### React Guidelines
- **Functional components only** - no class components
- **Keep components pure** - no side effects during render
- **One-way data flow** - props down, events up
- **Immutable state updates** - never mutate state directly
- **useEffect for synchronization only** - not for event handling
- **Small, composable components** - break down complex UI
- **Let React Compiler optimize** - avoid manual memoization

## Project-Specific Patterns

### Tool System
Tools implement a standard interface and are registered in the tool registry. New tools should:
1. Follow existing tool patterns in `packages/core/src/tools/`
2. Include comprehensive error handling
3. Support cancellation tokens
4. Return structured responses

### Sandboxing
The project supports multiple sandboxing mechanisms:
- macOS Seatbelt profiles
- Container-based sandboxing (Docker/Podman)
- Configurable via settings

### MCP (Model Context Protocol) Support
MCP servers are supported for extending functionality. Configuration in `~/.gemini-cli/config.json`.

## Important Files and Locations
- Configuration: `~/.gemini-cli/config.json`
- Logs: `~/.gemini-cli/logs/`
- Test fixtures: `integration-tests/fixtures/`
- Documentation: `docs/` directory
- Development guidelines: `GEMINI.md`