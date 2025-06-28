/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render } from 'ink-testing-library';
import { renderMarkdownElement } from '../markdownRenderer.js';
import { ParsedMarkdownElement, RenderContext } from '../markdownTypes.js';

describe('markdownRenderer', () => {
  const defaultContext: RenderContext = {
    isPending: false,
    availableTerminalHeight: 24,
    terminalWidth: 80,
    index: 0
  };

  describe('renderMarkdownElement', () => {
    it('should render header elements', () => {
      const element: ParsedMarkdownElement = {
        type: 'header',
        content: 'Test Header',
        metadata: { level: 1 },
        key: 'header-1'
      };

      const { lastFrame } = render(
        <>{renderMarkdownElement(element, defaultContext)}</>
      );

      expect(lastFrame()).toContain('Test Header');
    });

    it('should render code block elements', () => {
      const element: ParsedMarkdownElement = {
        type: 'codeBlock',
        content: 'const x = 42;\nconsole.log(x);',
        metadata: { language: 'javascript' },
        key: 'code-1'
      };

      const { lastFrame } = render(
        <>{renderMarkdownElement(element, defaultContext)}</>
      );

      expect(lastFrame()).toContain('const x = 42;');
      expect(lastFrame()).toContain('console.log(x);');
    });

    it('should render list elements', () => {
      const element: ParsedMarkdownElement = {
        type: 'list',
        content: 'Test list item',
        metadata: { listType: 'ul', marker: '-' },
        key: 'list-1'
      };

      const { lastFrame } = render(
        <>{renderMarkdownElement(element, defaultContext)}</>
      );

      expect(lastFrame()).toContain('- Test list item');
    });

    it('should render horizontal rule elements', () => {
      const element: ParsedMarkdownElement = {
        type: 'hr',
        content: '',
        key: 'hr-1'
      };

      const { lastFrame } = render(
        <>{renderMarkdownElement(element, defaultContext)}</>
      );

      expect(lastFrame()).toContain('---');
    });

    it('should render paragraph elements', () => {
      const element: ParsedMarkdownElement = {
        type: 'paragraph',
        content: 'This is a paragraph.',
        key: 'para-1'
      };

      const { lastFrame } = render(
        <>{renderMarkdownElement(element, defaultContext)}</>
      );

      expect(lastFrame()).toContain('This is a paragraph.');
    });

    it('should render empty paragraphs as empty boxes', () => {
      const element: ParsedMarkdownElement = {
        type: 'paragraph',
        content: '   ',
        key: 'empty-1'
      };

      const { lastFrame } = render(
        <>{renderMarkdownElement(element, defaultContext)}</>
      );

      // Empty lines should result in empty output with height
      expect(lastFrame()).toBe('');
    });

    it('should handle header without metadata', () => {
      const element: ParsedMarkdownElement = {
        type: 'header',
        content: 'Header without metadata',
        key: 'header-no-meta'
        // Note: no metadata property
      };

      const { lastFrame } = render(
        <>{renderMarkdownElement(element, defaultContext)}</>
      );

      expect(lastFrame()).toContain('Header without metadata');
    });

    it('should handle code block without metadata', () => {
      const element: ParsedMarkdownElement = {
        type: 'codeBlock',
        content: 'code without language',
        key: 'code-no-meta'
        // Note: no metadata property
      };

      const { lastFrame } = render(
        <>{renderMarkdownElement(element, defaultContext)}</>
      );

      expect(lastFrame()).toContain('code without language');
    });

    it('should handle list without metadata', () => {
      const element: ParsedMarkdownElement = {
        type: 'list',
        content: 'List item without metadata',
        key: 'list-no-meta'
        // Note: no metadata property
      };

      const { lastFrame } = render(
        <>{renderMarkdownElement(element, defaultContext)}</>
      );

      expect(lastFrame()).toContain('- List item without metadata');
    });

    it('should handle list with partial metadata', () => {
      const element: ParsedMarkdownElement = {
        type: 'list',
        content: 'List item with partial metadata',
        metadata: { listType: 'ol' }, // marker is missing
        key: 'list-partial-meta'
      };

      const { lastFrame } = render(
        <>{renderMarkdownElement(element, defaultContext)}</>
      );

      // When marker is missing, it defaults to '-'
      expect(lastFrame()).toContain('List item with partial metadata');
    });

    it('should handle unknown element type as paragraph', () => {
      const element: ParsedMarkdownElement = {
        type: 'unknown' as any,
        content: 'Unknown element type',
        key: 'unknown-1'
      };

      const { lastFrame } = render(
        <>{renderMarkdownElement(element, defaultContext)}</>
      );

      expect(lastFrame()).toContain('Unknown element type');
    });
  });
});