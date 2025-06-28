/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { parseMarkdownToElements } from '../markdownParser.js';

describe('markdownParser', () => {
  describe('parseMarkdownToElements', () => {
    it('should return empty array for empty input', () => {
      expect(parseMarkdownToElements('')).toEqual([]);
      expect(parseMarkdownToElements(null as unknown as string)).toEqual([]);
      expect(parseMarkdownToElements(undefined as unknown as string)).toEqual([]);
    });

    it('should parse headers correctly', () => {
      const result = parseMarkdownToElements('# Header 1\n## Header 2\n### Header 3\n#### Header 4');
      expect(result).toEqual([
        {
          type: 'header',
          content: 'Header 1',
          metadata: { level: 1 },
          key: 'line-0'
        },
        {
          type: 'header', 
          content: 'Header 2',
          metadata: { level: 2 },
          key: 'line-1'
        },
        {
          type: 'header', 
          content: 'Header 3',
          metadata: { level: 3 },
          key: 'line-2'
        },
        {
          type: 'header', 
          content: 'Header 4',
          metadata: { level: 4 },
          key: 'line-3'
        }
      ]);
    });

    it('should parse code blocks correctly', () => {
      const result = parseMarkdownToElements('```js\nconst x = 1;\nconst y = 2;\n```');
      expect(result).toEqual([
        {
          type: 'codeBlock',
          content: 'const x = 1;\nconst y = 2;',
          metadata: { language: 'js' },
          key: 'line-3'
        }
      ]);
    });

    it('should parse code blocks with different fence types', () => {
      const result = parseMarkdownToElements('~~~python\nprint("hello")\n~~~');
      expect(result).toEqual([
        {
          type: 'codeBlock',
          content: 'print("hello")',
          metadata: { language: 'python' },
          key: 'line-2'
        }
      ]);
    });

    it('should handle unclosed code blocks', () => {
      const result = parseMarkdownToElements('```js\nconst x = 1;');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'codeBlock',
        content: 'const x = 1;',
        metadata: { language: 'js' },
        key: 'eof'
      });
    });

    it('should parse unordered lists correctly', () => {
      const result = parseMarkdownToElements('- Item 1\n* Item 2\n+ Item 3');
      expect(result).toEqual([
        {
          type: 'list',
          content: 'Item 1',
          metadata: { listType: 'ul', marker: '-', leadingWhitespace: '' },
          key: 'line-0'
        },
        {
          type: 'list',
          content: 'Item 2',
          metadata: { listType: 'ul', marker: '*', leadingWhitespace: '' },
          key: 'line-1'
        },
        {
          type: 'list',
          content: 'Item 3',
          metadata: { listType: 'ul', marker: '+', leadingWhitespace: '' },
          key: 'line-2'
        }
      ]);
    });

    it('should parse ordered lists correctly', () => {
      const result = parseMarkdownToElements('1. First\n2. Second\n10. Tenth');
      expect(result).toEqual([
        {
          type: 'list',
          content: 'First',
          metadata: { listType: 'ol', marker: '1', leadingWhitespace: '' },
          key: 'line-0'
        },
        {
          type: 'list',
          content: 'Second',
          metadata: { listType: 'ol', marker: '2', leadingWhitespace: '' },
          key: 'line-1'
        },
        {
          type: 'list',
          content: 'Tenth',
          metadata: { listType: 'ol', marker: '10', leadingWhitespace: '' },
          key: 'line-2'
        }
      ]);
    });

    it('should parse horizontal rules correctly', () => {
      const result = parseMarkdownToElements('---\n***\n___\n- - -');
      expect(result).toEqual([
        { type: 'hr', content: '---', key: 'line-0' },
        { type: 'hr', content: '---', key: 'line-1' },
        { type: 'hr', content: '---', key: 'line-2' },
        { type: 'hr', content: '---', key: 'line-3' }
      ]);
    });

    it('should parse paragraphs correctly', () => {
      const result = parseMarkdownToElements('This is a paragraph.\nThis is another paragraph.');
      expect(result).toEqual([
        {
          type: 'paragraph',
          content: 'This is a paragraph.',
          key: 'line-0'
        },
        {
          type: 'paragraph',
          content: 'This is another paragraph.',
          key: 'line-1'
        }
      ]);
    });

    it('should handle empty lines correctly', () => {
      const result = parseMarkdownToElements('Line 1\n\nLine 2');
      expect(result).toEqual([
        {
          type: 'paragraph',
          content: 'Line 1',
          key: 'line-0'
        },
        {
          type: 'paragraph',
          content: 'Line 2',
          key: 'line-2'
        }
      ]);
    });

    it('should handle indented list items', () => {
      const result = parseMarkdownToElements('  - Indented item\n    * More indented');
      expect(result).toEqual([
        {
          type: 'list',
          content: 'Indented item',
          metadata: { listType: 'ul', marker: '-', leadingWhitespace: '  ' },
          key: 'line-0'
        },
        {
          type: 'list',
          content: 'More indented',
          metadata: { listType: 'ul', marker: '*', leadingWhitespace: '    ' },
          key: 'line-1'
        }
      ]);
    });

    it('should apply size limits correctly', () => {
      // Test max line length
      const longLine = 'a'.repeat(6000);
      const result = parseMarkdownToElements(longLine);
      expect(result[0].content).toHaveLength(5003); // 5000 + '...'
      expect(result[0].content.endsWith('...')).toBe(true);
    });

    it('should handle max lines limit', () => {
      // Create more than 10000 lines
      const manyLines = Array(15000).fill('Line').map((_, i) => `Line ${i}`).join('\n');
      const result = parseMarkdownToElements(manyLines);
      // Should keep last 10000 lines
      expect(result).toHaveLength(10000);
      expect(result[0].content).toBe('Line 5000');
      expect(result[9999].content).toBe('Line 14999');
    });

    it('should handle mixed content correctly', () => {
      const markdown = `# Title
This is a paragraph.

\`\`\`js
const code = true;
\`\`\`

- List item 1
- List item 2

---

## Subtitle`;

      const result = parseMarkdownToElements(markdown);
      expect(result).toEqual([
        { type: 'header', content: 'Title', metadata: { level: 1 }, key: 'line-0' },
        { type: 'paragraph', content: 'This is a paragraph.', key: 'line-1' },
        { type: 'codeBlock', content: 'const code = true;', metadata: { language: 'js' }, key: 'line-5' },
        { type: 'list', content: 'List item 1', metadata: { listType: 'ul', marker: '-', leadingWhitespace: '' }, key: 'line-7' },
        { type: 'list', content: 'List item 2', metadata: { listType: 'ul', marker: '-', leadingWhitespace: '' }, key: 'line-8' },
        { type: 'hr', content: '---', key: 'line-10' },
        { type: 'header', content: 'Subtitle', metadata: { level: 2 }, key: 'line-12' }
      ]);
    });

    it('should handle code block with no language', () => {
      const result = parseMarkdownToElements('```\nplain code\n```');
      expect(result).toEqual([
        {
          type: 'codeBlock',
          content: 'plain code',
          metadata: { language: undefined },
          key: 'line-2'
        }
      ]);
    });

    it('should handle nested code fences correctly', () => {
      const result = parseMarkdownToElements('````\n```\nnested\n```\n````');
      expect(result).toEqual([
        {
          type: 'codeBlock',
          content: '```\nnested\n```',
          metadata: { language: undefined },
          key: 'line-4'
        }
      ]);
    });

    it('should parse headers with special characters', () => {
      const result = parseMarkdownToElements('# Header with `code` and **bold**');
      expect(result).toEqual([
        {
          type: 'header',
          content: 'Header with `code` and **bold**',
          metadata: { level: 1 },
          key: 'line-0'
        }
      ]);
    });

    it('should parse list items with special characters', () => {
      const result = parseMarkdownToElements('- Item with `code` and **bold**');
      expect(result).toEqual([
        {
          type: 'list',
          content: 'Item with `code` and **bold**',
          metadata: { listType: 'ul', marker: '-', leadingWhitespace: '' },
          key: 'line-0'
        }
      ]);
    });
  });
});