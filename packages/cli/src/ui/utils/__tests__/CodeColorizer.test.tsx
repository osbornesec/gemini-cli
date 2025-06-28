/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
// Mock the lowlight module first
vi.mock('lowlight', () => {
  const mockLowlight = {
    highlight: vi.fn(),
    highlightAuto: vi.fn(),
    registered: vi.fn(),
  };
  return {
    common: {},
    createLowlight: vi.fn(() => mockLowlight),
  };
});

import { colorizeCode } from '../CodeColorizer.js';
import { themeManager } from '../../themes/theme-manager.js';
import { Theme } from '../../themes/theme.js';
import { createLowlight } from 'lowlight';

// Mock the theme manager
vi.mock('../../themes/theme-manager.js', () => ({
  themeManager: {
    getActiveTheme: vi.fn(),
  },
}));

// Mock MaxSizedBox to simplify testing
vi.mock('../../components/shared/MaxSizedBox.js', () => ({
  MaxSizedBox: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  MINIMUM_MAX_HEIGHT: 5,
}));

describe('CodeColorizer', () => {
  let mockTheme: Theme;
  let consoleErrorSpy: any;
  let mockLowlight: any;

  beforeEach(() => {
    // Get the mock lowlight instance
    mockLowlight = vi.mocked(createLowlight).mock.results[0]?.value || vi.mocked(createLowlight)();
    
    // Set up mock theme
    mockTheme = {
      name: 'test-theme',
      colors: {
        Gray: 'gray',
        Red: 'red',
        Green: 'green',
        Blue: 'blue',
      },
      defaultColor: 'white',
      getInkColor: vi.fn((className: string) => {
        const colorMap: Record<string, string> = {
          'hljs-keyword': 'blue',
          'hljs-string': 'green',
          'hljs-number': 'red',
          'hljs-comment': 'gray',
        };
        return colorMap[className];
      }),
    } as any;

    vi.mocked(themeManager.getActiveTheme).mockReturnValue(mockTheme);

    // Clear mock lowlight functions
    mockLowlight.highlight.mockClear();
    mockLowlight.highlightAuto.mockClear();
    mockLowlight.registered.mockClear();

    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy.mockRestore();
  });

  describe('colorizeCode', () => {
    it('should highlight code with specified language', () => {
      const code = 'const x = 42;';
      const language = 'javascript';

      mockLowlight.registered.mockReturnValue(true);
      mockLowlight.highlight.mockReturnValue({
        type: 'root',
        children: [
          {
            type: 'element',
            properties: { className: ['hljs-keyword'] },
            children: [{ type: 'text', value: 'const' }],
          },
          { type: 'text', value: ' x = ' },
          {
            type: 'element',
            properties: { className: ['hljs-number'] },
            children: [{ type: 'text', value: '42' }],
          },
          { type: 'text', value: ';' },
        ],
      });

      const result = render(<>{colorizeCode(code, language)}</>);
      
      // The highlighted text is rendered in separate elements
      expect(result.getByText('const')).toBeTruthy();
      expect(result.getByText('42')).toBeTruthy();
      expect(result.getByText(';')).toBeTruthy();
      // The ' x = ' text exists in the DOM
      expect(result.container.textContent).toContain(' x = ');
      expect(mockLowlight.highlight).toHaveBeenCalledWith('javascript', code);
    });

    it('should auto-detect language when language is null', () => {
      const code = 'function test() {}';

      mockLowlight.highlightAuto.mockReturnValue({
        type: 'root',
        children: [
          {
            type: 'element',
            properties: { className: ['hljs-keyword'] },
            children: [{ type: 'text', value: 'function' }],
          },
          { type: 'text', value: ' test() {}' },
        ],
      });

      const result = render(<>{colorizeCode(code, null)}</>);
      
      expect(result.getByText('function')).toBeTruthy();
      // The ' test() {}' text exists in the DOM
      expect(result.container.textContent).toContain(' test() {}');
      expect(mockLowlight.highlightAuto).toHaveBeenCalledWith(code);
    });

    it('should auto-detect when language is not registered', () => {
      const code = 'some code';
      const language = 'unknown-lang';

      mockLowlight.registered.mockReturnValue(false);
      mockLowlight.highlightAuto.mockReturnValue({
        type: 'root',
        children: [{ type: 'text', value: code }],
      });

      render(<>{colorizeCode(code, language)}</>);
      
      expect(mockLowlight.highlightAuto).toHaveBeenCalledWith(code);
      expect(mockLowlight.highlight).not.toHaveBeenCalled();
    });

    it('should handle multi-line code with line numbers', () => {
      const code = 'line 1\nline 2\nline 3';
      const language = 'text';

      mockLowlight.registered.mockReturnValue(true);
      mockLowlight.highlight.mockImplementation((_, line) => ({
        type: 'root',
        children: [{ type: 'text', value: line }],
      }));

      const result = render(<>{colorizeCode(code, language)}</>);
      
      // Line numbers are padded to width 1 for 3 lines
      expect(result.container.textContent).toContain('1 line 1');
      expect(result.container.textContent).toContain('2 line 2');
      expect(result.container.textContent).toContain('3 line 3');
      expect(result.getByText('line 1')).toBeTruthy();
      expect(result.getByText('line 2')).toBeTruthy();
      expect(result.getByText('line 3')).toBeTruthy();
    });

    it('should strip trailing newline from code', () => {
      const code = 'const x = 1;\n';
      const language = 'javascript';

      mockLowlight.registered.mockReturnValue(true);
      mockLowlight.highlight.mockReturnValue({
        type: 'root',
        children: [{ type: 'text', value: 'const x = 1;' }],
      });

      render(<>{colorizeCode(code, language)}</>);
      
      expect(mockLowlight.highlight).toHaveBeenCalledWith('javascript', 'const x = 1;');
    });

    it('should handle height limit and show hidden lines count', () => {
      const lines = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`);
      const code = lines.join('\n');
      const language = 'text';
      const availableHeight = 10;

      mockLowlight.registered.mockReturnValue(true);
      mockLowlight.highlight.mockImplementation((_, line) => ({
        type: 'root',
        children: [{ type: 'text', value: line }],
      }));

      const result = render(<>{colorizeCode(code, language, availableHeight)}</>);
      
      // Should only show last 10 lines (11-20)
      expect(result.queryByText('line 10')).toBeFalsy();
      expect(result.getByText('line 11')).toBeTruthy();
      expect(result.getByText('line 20')).toBeTruthy();
      
      // Line numbers should reflect actual line positions with padding for 2-digit numbers
      expect(result.container.textContent).toContain('11 line 11');
      expect(result.container.textContent).toContain('20 line 20');
    });

    it('should respect minimum height constraint', () => {
      const lines = Array.from({ length: 10 }, (_, i) => `line ${i + 1}`);
      const code = lines.join('\n');
      const language = 'text';
      const availableHeight = 3; // Less than MINIMUM_MAX_HEIGHT (5)

      mockLowlight.registered.mockReturnValue(true);
      mockLowlight.highlight.mockImplementation((_, line) => ({
        type: 'root',
        children: [{ type: 'text', value: line }],
      }));

      const result = render(<>{colorizeCode(code, language, availableHeight)}</>);
      
      // Should show last 5 lines (6-10) due to minimum height
      expect(result.queryByText('line 5')).toBeFalsy();
      expect(result.getByText('line 6')).toBeTruthy();
      expect(result.getByText('line 10')).toBeTruthy();
    });

    it('should handle nested element structures', () => {
      const code = 'test';
      const language = 'text';

      mockLowlight.registered.mockReturnValue(true);
      mockLowlight.highlight.mockReturnValue({
        type: 'root',
        children: [
          {
            type: 'element',
            properties: { className: ['hljs-outer'] },
            children: [
              {
                type: 'element',
                properties: { className: ['hljs-inner', 'hljs-keyword'] },
                children: [{ type: 'text', value: 'test' }],
              },
            ],
          },
        ],
      });

      const result = render(<>{colorizeCode(code, language)}</>);
      
      expect(result.getByText('test')).toBeTruthy();
      // Should check all classes in the hierarchy
      expect(mockTheme.getInkColor).toHaveBeenCalledWith('hljs-outer');
      expect(mockTheme.getInkColor).toHaveBeenCalledWith('hljs-keyword');
    });

    it('should handle empty root children gracefully', () => {
      const code = 'test';
      const language = 'text';

      mockLowlight.registered.mockReturnValue(true);
      mockLowlight.highlight.mockReturnValue({
        type: 'root',
        children: [],
      });

      const result = render(<>{colorizeCode(code, language)}</>);
      
      // Should render line number with the original text since highlighting returned empty
      expect(result.container.textContent).toContain('1 test');
      expect(result.getByText('test')).toBeTruthy();
    });

    it('should handle error during highlighting and fallback to plain text', () => {
      const code = 'line 1\nline 2';
      const language = 'javascript';
      const error = new Error('Highlighting failed');

      mockLowlight.registered.mockReturnValue(true);
      mockLowlight.highlight.mockImplementation(() => {
        throw error;
      });

      const result = render(<>{colorizeCode(code, language)}</>);
      
      // Should render plain text with line numbers
      expect(result.getByText('line 1')).toBeTruthy();
      expect(result.getByText('line 2')).toBeTruthy();
      expect(result.container.textContent).toContain('1 line 1');
      expect(result.container.textContent).toContain('2 line 2');
      
      // Should log error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[colorizeCode] Error highlighting code for language "javascript":',
        error
      );
    });

    it('should handle maxWidth parameter', () => {
      const code = 'const x = 42;';
      const language = 'javascript';
      const maxWidth = 80;

      mockLowlight.registered.mockReturnValue(true);
      mockLowlight.highlight.mockReturnValue({
        type: 'root',
        children: [{ type: 'text', value: code }],
      });

      render(<>{colorizeCode(code, language, undefined, maxWidth)}</>);
      
      // Test passes if no errors thrown - maxWidth is passed to MaxSizedBox
      expect(mockLowlight.highlight).toHaveBeenCalled();
    });

    it('should handle unknown node types', () => {
      const code = 'test';
      const language = 'text';

      mockLowlight.registered.mockReturnValue(true);
      mockLowlight.highlight.mockReturnValue({
        type: 'root',
        children: [
          { type: 'unknown-type' as any, value: 'ignored' },
          { type: 'text', value: 'test' },
        ],
      });

      const result = render(<>{colorizeCode(code, language)}</>);
      
      // Should skip unknown node and render text node
      expect(result.getByText('test')).toBeTruthy();
      expect(result.queryByText('ignored')).toBeFalsy();
    });

    it('should properly pad line numbers for multi-digit counts', () => {
      const lines = Array.from({ length: 100 }, (_, i) => `line ${i + 1}`);
      const code = lines.join('\n');
      const language = 'text';
      const availableHeight = 5;

      mockLowlight.registered.mockReturnValue(true);
      mockLowlight.highlight.mockImplementation((_, line) => ({
        type: 'root',
        children: [{ type: 'text', value: line }],
      }));

      const result = render(<>{colorizeCode(code, language, availableHeight)}</>);
      
      // Line numbers should be padded to 3 digits
      // Shows lines 96-100 (last 5 lines)
      expect(result.container.textContent).toContain(' 96 '); // Space padded
      expect(result.container.textContent).toContain('100 '); // No padding needed
      expect(result.getByText('line 96')).toBeTruthy();
      expect(result.getByText('line 100')).toBeTruthy();
    });

    it('should inherit color through nested elements', () => {
      const code = 'test';
      const language = 'text';

      mockLowlight.registered.mockReturnValue(true);
      mockLowlight.highlight.mockReturnValue({
        type: 'root',
        children: [
          {
            type: 'element',
            properties: { className: ['hljs-keyword'] },
            children: [
              {
                type: 'element',
                properties: { className: [] }, // No specific color
                children: [{ type: 'text', value: 'test' }],
              },
            ],
          },
        ],
      });

      const result = render(<>{colorizeCode(code, language)}</>);
      
      expect(result.getByText('test')).toBeTruthy();
      // Inner element should inherit color from outer element
      expect(mockTheme.getInkColor).toHaveBeenCalledWith('hljs-keyword');
    });
  });
});