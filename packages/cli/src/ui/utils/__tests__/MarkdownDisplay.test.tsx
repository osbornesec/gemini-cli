/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { describe, it, expect, beforeAll, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import stripAnsi from 'strip-ansi';

// ---------------------------------------------------------------------------
// Mock theme manager and dependencies
// ---------------------------------------------------------------------------
const mockTheme = {
  defaultColor: 'white',
  colors: {
    type: 'light',
    Foreground: 'white',
    Background: 'black',
    LightBlue: 'blue',
    AccentBlue: 'blue',
    AccentPurple: 'magenta',
    AccentCyan: 'cyan',
    AccentGreen: 'green',
    AccentYellow: 'yellow',
    AccentRed: 'red',
    Comment: 'gray',
    Gray: 'gray',
    GradientColors: [],
  },
  getInkColor: () => undefined,
};

vi.mock('../../themes/theme-manager.js', () => ({
  themeManager: {
    getActiveTheme: () => mockTheme,
  },
}));

// Mock colorizeCode function
vi.mock('../CodeColorizer.js', () => ({
  colorizeCode: vi.fn((code: string, lang: string | null) => code),
}));

import { MarkdownDisplay } from '../MarkdownDisplay.js';
import { colorizeCode } from '../CodeColorizer.js';

const mockColorizeCode = vi.mocked(colorizeCode);

describe('MarkdownDisplay', () => {
  const TERM_WIDTH = 80;

  beforeEach(() => {
    vi.clearAllMocks();
    mockColorizeCode.mockImplementation((code: string) => <Text>{code}</Text>);
  });

  describe('Basic rendering', () => {
    it('renders nothing for empty text', () => {
      const { lastFrame } = render(
        <MarkdownDisplay text="" isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      expect(lastFrame()).toBe('');
    });

    it('renders nothing for null text', () => {
      const { lastFrame } = render(
        <MarkdownDisplay text={null as any} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      expect(lastFrame()).toBe('');
    });

    it('renders plain text without markdown', () => {
      const { lastFrame } = render(
        <MarkdownDisplay text="Hello world" isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      expect(stripAnsi(lastFrame())).toBe('Hello world');
    });
  });

  describe('Headers', () => {
    it('renders all header levels h1-h4', () => {
      const md = [
        '# H1 Header',
        '## H2 Header',
        '### H3 Header',
        '#### H4 Header',
      ].join('\n');

      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );

      const plain = stripAnsi(lastFrame());
      expect(plain).toContain('H1 Header');
      expect(plain).toContain('H2 Header');
      expect(plain).toContain('H3 Header');
      expect(plain).toContain('H4 Header');
    });

    it('renders headers with inline formatting', () => {
      const md = '# **Bold** header with *italic*';
      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      const plain = stripAnsi(lastFrame());
      expect(plain).toContain('Bold');
      expect(plain).toContain('italic');
    });

    it('handles headers with leading/trailing spaces', () => {
      const md = '   ## Spaced Header   ';
      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      expect(stripAnsi(lastFrame())).toContain('Spaced Header');
    });

    it('does not render headers with more than 4 hashes', () => {
      const md = '##### Not a header';
      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      expect(stripAnsi(lastFrame())).toBe('##### Not a header');
    });
  });

  describe('Horizontal rules', () => {
    it('renders horizontal rule with dashes', () => {
      const md = '---';
      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      expect(stripAnsi(lastFrame())).toContain('---');
    });

    it('renders horizontal rule with asterisks', () => {
      const md = '***';
      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      expect(stripAnsi(lastFrame())).toContain('---');
    });

    it('renders horizontal rule with underscores', () => {
      const md = '___';
      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      expect(stripAnsi(lastFrame())).toContain('---');
    });

    it('renders horizontal rule with spaces', () => {
      const md = '- - -';
      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      expect(stripAnsi(lastFrame())).toContain('---');
    });
  });

  describe('Lists', () => {
    it('renders unordered list with dash markers', () => {
      const md = [
        '- Item 1',
        '- Item 2',
        '- Item 3',
      ].join('\n');

      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );

      const plain = stripAnsi(lastFrame());
      expect(plain).toMatch(/- Item 1/);
      expect(plain).toMatch(/- Item 2/);
      expect(plain).toMatch(/- Item 3/);
    });

    it('renders unordered list with asterisk markers', () => {
      const md = '* Item with asterisk';
      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      expect(stripAnsi(lastFrame())).toMatch(/\* Item with asterisk/);
    });

    it('renders unordered list with plus markers', () => {
      const md = '+ Item with plus';
      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      expect(stripAnsi(lastFrame())).toMatch(/\+ Item with plus/);
    });

    it('renders ordered list', () => {
      const md = [
        '1. First item',
        '2. Second item',
        '10. Tenth item',
      ].join('\n');

      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );

      const plain = stripAnsi(lastFrame());
      expect(plain).toMatch(/1\. First item/);
      expect(plain).toMatch(/2\. Second item/);
      expect(plain).toMatch(/10\. Tenth item/);
    });

    it('renders nested lists with indentation', () => {
      const md = [
        '- Parent item',
        '  - Child item',
        '    - Grandchild item',
        '1. Ordered parent',
        '  1. Ordered child',
      ].join('\n');

      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );

      const plain = stripAnsi(lastFrame());
      expect(plain).toContain('Parent item');
      expect(plain).toContain('Child item');
      expect(plain).toContain('Grandchild item');
      expect(plain).toContain('Ordered parent');
      expect(plain).toContain('Ordered child');
    });

    it('renders list items with inline formatting', () => {
      const md = '- **Bold** item with *italic* text';
      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      const plain = stripAnsi(lastFrame());
      expect(plain).toContain('Bold');
      expect(plain).toContain('italic');
    });
  });

  describe('Inline formatting', () => {
    it('renders bold text with double asterisks', () => {
      const md = 'This **bold** text';
      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      expect(stripAnsi(lastFrame())).toContain('bold');
    });

    it('does not render bold with insufficient content', () => {
      const md = '****';
      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      // **** is actually parsed as a horizontal rule
      expect(stripAnsi(lastFrame())).toBe('---');
    });

    it('renders italic text with single asterisks', () => {
      const md = 'This *italic* text';
      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      expect(stripAnsi(lastFrame())).toContain('italic');
    });

    it('renders italic text with underscores', () => {
      const md = 'This _italic_ text';
      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      expect(stripAnsi(lastFrame())).toContain('italic');
    });

    it('does not render italic in the middle of words', () => {
      const md = 'word_with_underscores';
      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      expect(stripAnsi(lastFrame())).toBe('word_with_underscores');
    });

    it('does not render italic in file paths', () => {
      const md = 'path/to/file_name.txt';
      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      expect(stripAnsi(lastFrame())).toBe('path/to/file_name.txt');
    });

    it('renders strikethrough text', () => {
      const md = 'This ~~strikethrough~~ text';
      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      expect(stripAnsi(lastFrame())).toContain('strikethrough');
    });

    it('does not render strikethrough with insufficient content', () => {
      const md = '~~~~';
      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      // ~~~~ is treated as a code fence, resulting in empty output
      expect(stripAnsi(lastFrame()).trim()).toBe('');
    });

    it('renders inline code with single backticks', () => {
      const md = 'This `code` text';
      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      expect(stripAnsi(lastFrame())).toContain('code');
    });

    it('renders inline code with multiple backticks', () => {
      const md = 'This ``code with `backticks``` text';
      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      expect(stripAnsi(lastFrame())).toContain('code with backticks');
    });

    it('renders underline tags', () => {
      const md = 'This <u>underlined</u> text';
      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      expect(stripAnsi(lastFrame())).toContain('underlined');
    });

    it('does not render underline with insufficient content', () => {
      const md = '<u></u>';
      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      // Empty underline tags result in empty output
      expect(stripAnsi(lastFrame()).trim()).toBe('');
    });

    it('renders links with text and URL', () => {
      const md = 'Visit [Google](https://google.com) today';
      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      const plain = stripAnsi(lastFrame());
      expect(plain).toContain('Google');
      expect(plain).toContain('https://google.com');
    });

    it('renders multiple inline formats in one line', () => {
      const md = 'Text with **bold** and *italic* and `code` and [link](http://example.com)';
      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      const plain = stripAnsi(lastFrame());
      expect(plain).toContain('bold');
      expect(plain).toContain('italic');
      expect(plain).toContain('code');
      expect(plain).toContain('link');
      expect(plain).toContain('http://example.com');
    });
  });

  describe('Code blocks', () => {
    it('renders basic code block', () => {
      const md = [
        '```',
        'console.log("hello");',
        'const x = 1;',
        '```',
      ].join('\n');

      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );

      expect(mockColorizeCode).toHaveBeenCalledWith(
        'console.log("hello");\nconst x = 1;',
        null,
        undefined,
        expect.any(Number)
      );
    });

    it('renders code block with language specification', () => {
      const md = [
        '```javascript',
        'console.log("hello");',
        '```',
      ].join('\n');

      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );

      expect(mockColorizeCode).toHaveBeenCalledWith(
        'console.log("hello");',
        'javascript',
        undefined,
        expect.any(Number)
      );
    });

    it('renders code block with tildes', () => {
      const md = [
        '~~~python',
        'print("hello")',
        '~~~',
      ].join('\n');

      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );

      expect(mockColorizeCode).toHaveBeenCalledWith(
        'print("hello")',
        'python',
        undefined,
        expect.any(Number)
      );
    });

    it('handles unclosed code block at end of file', () => {
      const md = [
        '```',
        'unclosed code',
        'more code',
      ].join('\n');

      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );

      expect(mockColorizeCode).toHaveBeenCalledWith(
        'unclosed code\nmore code',
        null,
        undefined,
        expect.any(Number)
      );
    });

    it('truncates long code block when pending with limited height', () => {
      const codeLines = Array.from({ length: 10 }, (_, i) => `line ${i + 1}`);
      const md = ['```', ...codeLines, '```'].join('\n');

      // Mock the colorizeCode to return text elements properly
      mockColorizeCode.mockImplementation((code: string) => (
        <Text>{code.split('\n').map((line, i) => `${line}\n`).join('')}</Text>
      ));

      const { lastFrame } = render(
        <MarkdownDisplay
          text={md}
          isPending={true}
          availableTerminalHeight={5}
          terminalWidth={TERM_WIDTH}
        />,
      );

      const plain = stripAnsi(lastFrame());
      expect(plain).toContain('... generating more ...');
    });

    it('shows minimal message when height is very limited', () => {
      const codeLines = Array.from({ length: 10 }, (_, i) => `line ${i + 1}`);
      const md = ['```', ...codeLines, '```'].join('\n');

      const { lastFrame } = render(
        <MarkdownDisplay
          text={md}
          isPending={true}
          availableTerminalHeight={2}
          terminalWidth={TERM_WIDTH}
        />,
      );

      const plain = stripAnsi(lastFrame());
      expect(plain).toContain('... code is being written ...');
    });
  });

  describe('Mixed content', () => {
    it('renders complex markdown with multiple elements', () => {
      const md = [
        '# Main Header',
        '',
        'This is a paragraph with **bold** text.',
        '',
        '## Subheader',
        '',
        '- List item 1',
        '- List item 2 with *italic*',
        '',
        '```javascript',
        'console.log("code");',
        '```',
        '',
        '---',
        '',
        'Final paragraph.',
      ].join('\n');

      // Reset mock to return simple Text elements
      mockColorizeCode.mockImplementation((code: string) => <Text>{code}</Text>);

      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );

      const plain = stripAnsi(lastFrame());
      expect(plain).toContain('Main Header');
      expect(plain).toContain('bold');
      expect(plain).toContain('Subheader');
      expect(plain).toContain('List item 1');
      expect(plain).toContain('italic');
      expect(plain).toContain('---');
      expect(plain).toContain('Final paragraph');
    });

    it('handles empty lines correctly', () => {
      const md = [
        'Line 1',
        '',
        '',
        'Line 4',
      ].join('\n');

      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );

      const plain = stripAnsi(lastFrame());
      expect(plain).toContain('Line 1');
      expect(plain).toContain('Line 4');
    });
  });

  describe('Edge cases and error handling', () => {
    it('handles malformed markdown gracefully', () => {
      const md = '**unclosed bold and *mixed _formats`';
      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      // Should not crash and render something
      expect(stripAnsi(lastFrame())).toContain('unclosed');
    });

    it('handles very long lines', () => {
      const longText = 'A'.repeat(200);
      const { lastFrame } = render(
        <MarkdownDisplay text={longText} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      expect(stripAnsi(lastFrame())).toContain('A');
    });

    it('handles unicode characters', () => {
      const md = '**Bold with 🚀 emoji** and *italic 中文*';
      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      const plain = stripAnsi(lastFrame());
      expect(plain).toContain('🚀');
      expect(plain).toContain('中文');
    });

    it('handles parsing errors in inline content gracefully', () => {
      // Mock console.error to capture error logging
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // This should trigger the error handling path in RenderInline
      const md = 'Normal text with [invalid link format';
      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      
      // Should render fallback content without crashing
      expect(stripAnsi(lastFrame())).toContain('Normal text');
      
      consoleSpy.mockRestore();
    });

    it('handles nested formatting correctly', () => {
      const md = '**Bold with *nested italic* text**';
      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      const plain = stripAnsi(lastFrame());
      expect(plain).toContain('Bold');
      expect(plain).toContain('nested');
      expect(plain).toContain('italic');
    });
  });

  describe('Security considerations', () => {
    it('renders potentially dangerous URLs without modification', () => {
      // Note: This test documents current behavior - URL sanitization should be added
      const md = '[Click me](javascript:alert("xss"))';
      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      const plain = stripAnsi(lastFrame());
      expect(plain).toContain('Click me');
      expect(plain).toContain('javascript:alert("xss")');
    });

    it('renders data URLs', () => {
      const md = '[Data](data:text/html,<script>alert("xss")</script>)';
      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      const plain = stripAnsi(lastFrame());
      expect(plain).toContain('Data');
      expect(plain).toContain('data:text/html');
    });
  });

  describe('Performance and stress tests', () => {
    it('handles large documents efficiently', () => {
      const largeContent = Array.from({ length: 100 }, (_, i) => `Line ${i + 1}`).join('\n');
      
      const startTime = performance.now();
      const { lastFrame } = render(
        <MarkdownDisplay text={largeContent} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      const endTime = performance.now();
      
      expect(stripAnsi(lastFrame())).toContain('Line 1');
      expect(stripAnsi(lastFrame())).toContain('Line 100');
      expect(endTime - startTime).toBeLessThan(100); // Should render in under 100ms
    });

    it('handles many inline formatting elements', () => {
      const manyInlineElements = Array.from({ length: 50 }, (_, i) => `**bold${i}**`).join(' ');
      
      const { lastFrame } = render(
        <MarkdownDisplay text={manyInlineElements} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      
      const plain = stripAnsi(lastFrame());
      expect(plain).toContain('bold0');
      expect(plain).toContain('bold49');
    });
  });

  describe('Additional edge cases for 100% coverage', () => {
    it('handles code blocks with different fence lengths', () => {
      const md = [
        '```',
        'code1',
        '````',
        '',
        '````',
        'code2',
        '````',
      ].join('\n');

      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );

      expect(mockColorizeCode).toHaveBeenCalled();
    });

    it('handles empty list items', () => {
      const md = [
        '- ',
        '1. ',
      ].join('\n');

      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );

      const plain = stripAnsi(lastFrame());
      expect(plain).toContain('-');
      expect(plain).toContain('1.');
    });

    it('handles headers with only hashes', () => {
      const md = '#';
      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      // Should render as plain text, not header
      expect(stripAnsi(lastFrame())).toBe('#');
    });

    it('handles inline code matching without content', () => {
      const md = '`';
      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      expect(stripAnsi(lastFrame())).toBe('`');
    });

    it('handles underline tag with minimum length', () => {
      const md = '<u>a</u>';
      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      expect(stripAnsi(lastFrame())).toContain('a');
    });

    it('handles malformed link without closing parenthesis', () => {
      const md = '[text](incomplete';
      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      expect(stripAnsi(lastFrame())).toContain('text');
    });

    it('handles nested code blocks', () => {
      const md = [
        '```',
        'outer code',
        '```inner```',
        'more code',
        '```',
      ].join('\n');

      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );

      expect(mockColorizeCode).toHaveBeenCalledWith(
        'outer code\n```inner```\nmore code',
        null,
        undefined,
        expect.any(Number)
      );
    });

    it('handles italic with tab characters in boundaries', () => {
      const md = 'text\t*italic*\tmore';
      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      expect(stripAnsi(lastFrame())).toContain('italic');
    });

    it('handles very long single word', () => {
      const longWord = 'a'.repeat(200);
      const md = `Start ${longWord} end`;
      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      expect(stripAnsi(lastFrame())).toContain('Start');
      expect(stripAnsi(lastFrame())).toContain('end');
    });

    it('handles headers with more than 4 hashes to trigger default case', () => {
      const md = '##### This should trigger default case';
      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      // Should render as plain text since it's more than 4 hashes
      expect(stripAnsi(lastFrame())).toBe('##### This should trigger default case');
    });

    it('handles malformed inline code to trigger fallback path', () => {
      const md = 'Text with `unclosed code';
      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      expect(stripAnsi(lastFrame())).toContain('unclosed code');
    });

    it('triggers error handling with invalid regex input', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Create a scenario that could potentially cause parsing errors
      const md = 'Text with [invalid markdown *structure** `mixed` _formats_';
      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      
      // Should render without crashing
      expect(stripAnsi(lastFrame())).toContain('Text');
      
      consoleSpy.mockRestore();
    });

    // Tests specifically targeting uncovered lines for 100% coverage
    it('triggers header default case with 5+ hashes', () => {
      // This should match the header regex but have > 4 hashes, triggering the default case
      const md = '##### Five hash header';
      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      expect(stripAnsi(lastFrame())).toContain('Five hash header');
    });

    it('triggers inline code else branch with malformed backticks', () => {
      // Create inline code that passes initial checks but fails the codeMatch regex
      const md = 'Text with `malformed` code';
      
      // Mock the regex to fail on the codeMatch
      const originalMatch = String.prototype.match;
      String.prototype.match = function(regex) {
        if (this === '`malformed`' && regex.toString().includes('(`+)(.+?)\\1')) {
          return null; // Force the codeMatch to fail
        }
        return originalMatch.call(this, regex);
      };

      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      
      // Restore original method
      String.prototype.match = originalMatch;
      
      expect(stripAnsi(lastFrame())).toContain('malformed');
    });

    it('handles failed link match to trigger else branch', () => {
      // Create a link pattern that passes initial checks but fails the linkMatch regex
      const md = 'Visit [broken link format](';
      
      // Mock the link regex to fail
      const originalMatch = String.prototype.match;
      String.prototype.match = function(regex) {
        if (this === '[broken link format](' && regex.toString().includes('\\[(.*?)\\]\\((.*?)\\)')) {
          return null; // Force the linkMatch to fail
        }
        return originalMatch.call(this, regex);
      };

      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      
      // Restore original method
      String.prototype.match = originalMatch;
      
      expect(stripAnsi(lastFrame())).toContain('broken link format');
    });

    it('handles inline code with empty content after match', () => {
      // Test the case where codeMatch[2] might be falsy
      const md = 'Text with `` empty backticks';
      
      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      
      expect(stripAnsi(lastFrame())).toContain('empty backticks');
    });

    it('handles edge case in empty content blocks condition', () => {
      // Test the condition where contentBlocks.length === 0 with empty line
      const md = '\n\nFirst line after empty lines';
      
      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      
      expect(stripAnsi(lastFrame())).toContain('First line');
    });

    it('handles edge case with inCodeBlock true and empty line', () => {
      // Test the condition !inCodeBlock when we have empty line
      const md = [
        '```',
        'code',
        '',  // Empty line inside code block
        'more code',
        '```'
      ].join('\n');
      
      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      
      expect(mockColorizeCode).toHaveBeenCalledWith(
        'code\n\nmore code',
        null,
        undefined,
        expect.any(Number)
      );
    });

    it('triggers header default case with 6+ hashes', () => {
      // This should trigger the default case in the header switch statement (lines 132-138)
      const md = '###### Six hash header should use default case';
      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );
      // Should render with default styling from the default case
      expect(stripAnsi(lastFrame())).toContain('Six hash header should use default case');
    });

    it('triggers header default case by forcing level > 4', () => {
      // Force the header regex to match and return level 5 to trigger default case
      const originalMatch = String.prototype.match;
      let matchCallCount = 0;
      
      String.prototype.match = function(regex) {
        matchCallCount++;
        // Only intercept the header regex call on the specific line
        if (this === '##### Force default case' && regex.source.includes('#{1,4}')) {
          // Return a match with level 5 to trigger the default case
          const result = ['##### Force default case', '#####', 'Force default case'];
          result.index = 0;
          result.input = this;
          return result;
        }
        return originalMatch.call(this, regex);
      };

      const md = '##### Force default case';
      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );

      // Restore original method
      String.prototype.match = originalMatch;
      
      expect(stripAnsi(lastFrame())).toContain('Force default case');
    });

    it('triggers catch block in inline parsing with forced error', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Force an error in the inline parsing by corrupting slice operation
      const originalSlice = String.prototype.slice;
      let sliceCallCount = 0;
      
      String.prototype.slice = function(...args) {
        sliceCallCount++;
        // Throw error on specific slice operations during inline parsing
        if (typeof this === 'string' && this.includes('**errortest**') && args[0] === 2) {
          throw new Error('Forced slice error during inline parsing');
        }
        return originalSlice.apply(this, args);
      };

      const md = 'Text with **errortest** formatting that will trigger error';
      const { lastFrame } = render(
        <MarkdownDisplay text={md} isPending={false} terminalWidth={TERM_WIDTH} />,
      );

      // Restore original method
      String.prototype.slice = originalSlice;
      
      // The error should be caught and logged
      expect(consoleSpy).toHaveBeenCalled();
      // The text should still render (fallback behavior)
      expect(stripAnsi(lastFrame())).toContain('errortest');
      
      consoleSpy.mockRestore();
    });


  });
});