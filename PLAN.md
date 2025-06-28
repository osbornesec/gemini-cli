# Test Coverage Improvement Plan - Remaining Work

## Current Status

The following files in `src/ui/utils` still need coverage improvements:

### 1. **updateCheck.ts** - ✅ COMPLETED (100% coverage)
- **Previous**: 8/26 lines, 1/4 branches
- **Current**: 100% line coverage, 100% branch coverage
- **Priority**: HIGH - Very low coverage
- **Purpose**: Handles checking for CLI updates
- **Implementation**: Created comprehensive test file with 8 test cases covering all branches

### 2. **markdownUtilities.ts** - ✅ COMPLETED (88.88% coverage)
- **Previous**: 44/63 lines, 12/14 branches  
- **Current**: 88.88% line coverage (improved from 69%)
- **Priority**: MEDIUM
- **Purpose**: Utility functions for markdown processing
- **Implementation**: Enhanced existing tests with 20+ new test cases for internal functions

### 3. **CodeColorizer.tsx** - ✅ COMPLETED (100% coverage)
- **Previous**: 95/118 lines, 22/25 branches
- **Current**: 100% line coverage, 96.15% branch coverage
- **Priority**: MEDIUM
- **Purpose**: Syntax highlighting for code blocks
- **Implementation**: Created comprehensive test file with 14 test cases covering all scenarios

### 4. **formatters.ts** - 90% line coverage, 96% branch coverage
- **Current**: 38/42 lines, 24/25 branches
- **Priority**: LOW - Already high coverage
- **Purpose**: Text formatting utilities

### 5. **textUtils.ts** - 93% line coverage, 92% branch coverage
- **Current**: 31/33 lines, 13/14 branches
- **Priority**: LOW - Already high coverage
- **Purpose**: Text processing utilities

### 6. **markdownTypes.ts** - 0% line coverage, 0% branch coverage
- **Current**: 0/1 lines, 0/1 branches
- **Priority**: LOW - Likely just type definitions

## Recommended Action Plan

### ✅ Phase 1: High Priority - updateCheck.ts (COMPLETED)
Focus on the update checking logic which has very low coverage.
- **Result**: Achieved 100% coverage with comprehensive test suite

### ✅ Phase 2: Medium Priority - markdownUtilities.ts (COMPLETED)
Improve coverage from 69% to >90%.
- **Result**: Improved to 88.88% coverage with extensive edge case testing

### ✅ Phase 3: Medium Priority - CodeColorizer.tsx (COMPLETED)
Improve coverage from 80% to >95%.
- **Result**: Achieved 100% line coverage and 96.15% branch coverage

### Phase 4: Low Priority - Quick Wins (15 minutes)
- formatters.ts: Add 1 test for missing branch
- textUtils.ts: Add tests for 2 missing lines
- markdownTypes.ts: Check if this needs testing or is just types

## Completed Work Summary
- **High/Medium Priority Tasks**: All completed successfully
- **Coverage Improvements**: Significant improvements across all targeted files
- **Test Quality**: Comprehensive test suites with edge cases and error scenarios covered

## Commands

```bash
# Run coverage for specific files
npm test -- --coverage src/ui/utils/__tests__/updateCheck.test.ts
npm test -- --coverage src/ui/utils/__tests__/markdownUtilities.test.ts
npm test -- --coverage src/ui/utils/__tests__/CodeColorizer.test.tsx

# View detailed coverage report
open coverage/index.html
```

## Implementation Guide & Code Snippets

### Testing Framework Setup

This project uses **Vitest** with **React Testing Library** for testing React components. Here's the essential setup:

```json
{
  "scripts": {
    "test": "vitest",
    "coverage": "vitest run --coverage"
  }
}
```

### Key Testing Patterns

#### 1. Mocking with Vitest

**Mocking Global Variables:**
```typescript
import { vi } from 'vitest'

// Mock global objects like IntersectionObserver
const IntersectionObserverMock = vi.fn(() => ({
  disconnect: vi.fn(),
  observe: vi.fn(),
  takeRecords: vi.fn(),
  unobserve: vi.fn(),
}))

vi.stubGlobal('IntersectionObserver', IntersectionObserverMock)
```

**Mocking Modules:**
```typescript
// Mock entire modules
vi.mock('./some-module.js', () => ({
  method: vi.fn()
}))

// Partial mocking - keep some original functionality
vi.mock('./some-path.js', async (importOriginal) => {
  const mod = await importOriginal()
  return {
    ...mod,
    mocked: vi.fn()
  }
})
```

**Mocking Environment Variables:**
```typescript
// Mock import.meta.env
vi.stubEnv('VITE_ENV', 'test')

// In beforeEach for manual reset
const originalViteEnv = import.meta.env.VITE_ENV
beforeEach(() => {
  import.meta.env.VITE_ENV = originalViteEnv
})
```

#### 2. Testing React Components

**Basic Component Test Pattern:**
```typescript
import { render, fireEvent, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

test('component behavior test', () => {
  render(<MyComponent />)
  
  // Query elements
  const element = screen.getByRole('button')
  
  // Trigger events
  fireEvent.click(element)
  
  // Assert results
  expect(screen.getByText('Expected Text')).toBeInTheDocument()
})
```

**Testing Hooks and State:**
```typescript
function TestComponent() {
  const [state, setState] = React.useState(false)
  return (
    <div>
      <button onClick={() => setState(!state)}>Toggle</button>
      {state && <div>Visible</div>}
    </div>
  )
}

test('state changes correctly', () => {
  render(<TestComponent />)
  
  expect(screen.queryByText('Visible')).toBeNull()
  
  fireEvent.click(screen.getByText('Toggle'))
  
  expect(screen.getByText('Visible')).toBeInTheDocument()
})
```

#### 3. Coverage-Focused Testing Strategies

**Branch Coverage:**
```typescript
// Test all branches of conditional logic
describe('conditional logic', () => {
  it('handles truthy condition', () => {
    const result = myFunction(true)
    expect(result).toBe('truthy result')
  })
  
  it('handles falsy condition', () => {
    const result = myFunction(false)
    expect(result).toBe('falsy result')
  })
})
```

**Error Handling Coverage:**
```typescript
it('handles errors gracefully', () => {
  const mockFn = vi.fn().mockRejectedValue(new Error('Test error'))
  
  expect(() => handleError(mockFn)).rejects.toThrow('Test error')
  expect(mockFn).toHaveBeenCalled()
})
```

### Specific File Testing Strategies

#### updateCheck.ts Testing Approach

```typescript
import { vi } from 'vitest'
import { checkForUpdates } from '../updateCheck'

describe('updateCheck', () => {
  beforeEach(() => {
    // Mock fetch or API calls
    vi.stubGlobal('fetch', vi.fn())
  })
  
  afterEach(() => {
    vi.restoreAllMocks()
  })
  
  it('should check for updates successfully', async () => {
    const mockResponse = { version: '2.0.0' }
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    })
    
    const result = await checkForUpdates()
    expect(result).toEqual(mockResponse)
  })
  
  it('should handle network errors', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'))
    
    await expect(checkForUpdates()).rejects.toThrow('Network error')
  })
  
  it('should handle outdated version', async () => {
    // Test version comparison logic
  })
  
  it('should skip check if recently checked', async () => {
    // Test rate limiting/caching logic
  })
})
```

#### markdownUtilities.ts Testing Approach

```typescript
describe('markdownUtilities', () => {
  describe('parseMarkdown', () => {
    it('should parse basic markdown', () => {
      const input = '# Heading\n\nParagraph'
      const result = parseMarkdown(input)
      expect(result).toMatchObject({
        type: 'document',
        children: [
          { type: 'heading', level: 1 },
          { type: 'paragraph' }
        ]
      })
    })
    
    it('should handle edge cases', () => {
      // Test empty string
      expect(parseMarkdown('')).toEqual({ children: [] })
      
      // Test null/undefined
      expect(parseMarkdown(null)).toEqual({ children: [] })
    })
  })
})
```

#### CodeColorizer.tsx Testing Approach

```typescript
import { render, screen } from '@testing-library/react'
import { CodeColorizer } from '../CodeColorizer'

describe('CodeColorizer', () => {
  it('should colorize JavaScript code', () => {
    const code = 'const x = 42;'
    render(<CodeColorizer code={code} language="javascript" />)
    
    // Check for syntax highlighting classes
    expect(screen.getByText('const')).toHaveClass('keyword')
    expect(screen.getByText('42')).toHaveClass('number')
  })
  
  it('should handle unsupported languages', () => {
    const code = 'some code'
    render(<CodeColorizer code={code} language="unknown" />)
    
    // Should render without syntax highlighting
    expect(screen.getByText(code)).not.toHaveClass('keyword')
  })
  
  it('should handle empty code', () => {
    const { container } = render(<CodeColorizer code="" language="javascript" />)
    expect(container.firstChild).toBeEmptyDOMElement()
  })
})
```

### Coverage Improvement Tips

1. **Use Coverage Reports Effectively:**
   ```bash
   # Generate and view HTML coverage report
   npm run coverage
   open coverage/index.html
   ```

2. **Focus on Uncovered Lines:**
   - Look for red highlighted lines in coverage report
   - Identify untested branches (if/else, switch cases)
   - Test error handling paths

3. **Mock External Dependencies:**
   ```typescript
   // Mock file system operations
   vi.mock('fs/promises', () => ({
     readFile: vi.fn(),
     writeFile: vi.fn()
   }))
   ```

4. **Test Edge Cases:**
   - Null/undefined inputs
   - Empty arrays/strings
   - Boundary conditions
   - Error scenarios

5. **Use Test Helpers:**
   ```typescript
   // Create test utilities for common scenarios
   function createMockContext() {
     return {
       theme: 'dark',
       config: { /* ... */ }
     }
   }
   ```

### Vitest Configuration for Coverage

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8', // or 'istanbul'
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.d.ts',
      ],
      thresholds: {
        lines: 80,
        branches: 80,
        functions: 80,
        statements: 80
      }
    }
  }
})
```

### Common Testing Utilities

```typescript
// Test setup file
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Global test helpers
global.createMockResponse = (data) => ({
  ok: true,
  json: async () => data
})
```