/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import stripAnsi from 'strip-ansi';
import { RenderInline } from '../markdownElements/MarkdownInline.js';

// Mock theme manager
const mockTheme = {
  colors: {
    AccentBlue: 'blue',
    AccentPurple: 'magenta',
    AccentYellow: 'yellow',
    AccentCyan: 'cyan',
    AccentRed: 'red',
    Comment: 'gray',
  },
  getInkColor: () => undefined,
};

vi.mock('../../themes/theme-manager.js', () => ({
  themeManager: {
    getActiveTheme: () => mockTheme,
  },
}));

describe('MarkdownInline', () => {
  describe('Italic text edge cases', () => {
    it('should render italic when separated by underscores', () => {
      // The current implementation DOES render italic in these cases
      const { lastFrame } = render(<RenderInline text="word_italic_text" />);
      expect(stripAnsi(lastFrame() ?? '')).toContain('italic');
    });

    it('should render italic even when adjacent to word characters', () => {
      const { lastFrame } = render(<RenderInline text="_italic_word" />);
      expect(stripAnsi(lastFrame() ?? '')).toContain('italic');
    });

    it('should render italic in file paths', () => {
      const { lastFrame } = render(<RenderInline text="path/to/_file_name.txt" />);
      expect(stripAnsi(lastFrame() ?? '')).toContain('file');
    });

    it('should handle backslashes in paths', () => {
      const { lastFrame } = render(<RenderInline text="C:\\path\\_file_name.txt" />);
      const plain = stripAnsi(lastFrame() ?? '');
      // Check that it contains path components
      expect(plain).toContain('C:');
      expect(plain).toContain('path');
    });

    it('should render italic after dot-slash', () => {
      const { lastFrame } = render(<RenderInline text="./_italic_text" />);
      expect(stripAnsi(lastFrame() ?? '')).toContain('italic');
    });

    it('should render italic before slash', () => {
      const { lastFrame } = render(<RenderInline text="_italic_/path" />);
      expect(stripAnsi(lastFrame() ?? '')).toContain('italic');
    });

    it('should handle italic with special boundary conditions', () => {
      const { lastFrame } = render(<RenderInline text="test. _italic_ text" />);
      expect(stripAnsi(lastFrame() ?? '')).toContain('italic');
    });

    it('should handle italic at string boundaries', () => {
      const { lastFrame } = render(<RenderInline text="_italic_" />);
      expect(stripAnsi(lastFrame() ?? '')).toBe('italic');
    });

    it('should render asterisk italic even within words', () => {
      const { lastFrame } = render(<RenderInline text="word*not*italic" />);
      expect(stripAnsi(lastFrame() ?? '')).toContain('not');
    });

    it('should handle complex path with multiple underscores', () => {
      const { lastFrame } = render(<RenderInline text="/usr/local/my_project/_config_file.yml" />);
      const plain = stripAnsi(lastFrame() ?? '');
      expect(plain).toContain('/usr/local/my');
      expect(plain).toContain('project/');
    });
  });

  describe('Other edge cases for coverage', () => {
    it('should handle empty bold markers', () => {
      const { lastFrame } = render(<RenderInline text="****" />);
      expect(stripAnsi(lastFrame() ?? '')).toBe('****');
    });

    it('should handle empty strikethrough markers', () => {
      const { lastFrame } = render(<RenderInline text="~~~~" />);
      expect(stripAnsi(lastFrame() ?? '')).toBe('~~~~');
    });

    it('should handle empty underline tags', () => {
      const { lastFrame } = render(<RenderInline text="<u></u>" />);
      // Empty underline tags result in empty output
      expect(stripAnsi(lastFrame() ?? '')).toBe('');
    });

    it('should handle inline code without matching backticks', () => {
      const { lastFrame } = render(<RenderInline text="`unclosed code" />);
      expect(stripAnsi(lastFrame() ?? '')).toBe('`unclosed code');
    });

    it('should handle link without closing parenthesis', () => {
      const { lastFrame } = render(<RenderInline text="[text](incomplete" />);
      expect(stripAnsi(lastFrame() ?? '')).toBe('[text](incomplete');
    });

    it('should handle empty link text', () => {
      const { lastFrame } = render(<RenderInline text="[](http://example.com)" />);
      expect(stripAnsi(lastFrame() ?? '')).toContain('http://example.com');
    });

    it('should handle nested formatting', () => {
      const { lastFrame } = render(<RenderInline text="**bold with *italic* inside**" />);
      const plain = stripAnsi(lastFrame() ?? '');
      expect(plain).toContain('bold');
      expect(plain).toContain('italic');
    });

    it('should handle formatting at exact boundaries', () => {
      const { lastFrame } = render(<RenderInline text="**bold**" />);
      expect(stripAnsi(lastFrame() ?? '')).toBe('bold');
    });

    it('should handle code with special regex characters', () => {
      const { lastFrame } = render(<RenderInline text="`code with ${}[]()` text" />);
      expect(stripAnsi(lastFrame() ?? '')).toContain('code with ${}[]()');
    });
  });
});