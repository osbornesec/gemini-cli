/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import type { 
  ParsedMarkdownElement, 
  MarkdownParsingContext, 
  MarkdownDisplayProps, 
  RenderContext 
} from '../markdownTypes.js';

describe('markdownTypes', () => {
  describe('ParsedMarkdownElement', () => {
    it('should validate header element structure', () => {
      const headerElement: ParsedMarkdownElement = {
        type: 'header',
        content: 'Test Header',
        metadata: {
          level: 2
        },
        key: 'header-1'
      };

      expect(headerElement.type).toBe('header');
      expect(headerElement.content).toBe('Test Header');
      expect(headerElement.metadata?.level).toBe(2);
      expect(headerElement.key).toBe('header-1');
    });

    it('should validate code block element structure', () => {
      const codeElement: ParsedMarkdownElement = {
        type: 'codeBlock',
        content: 'console.log("hello");',
        metadata: {
          language: 'javascript'
        },
        key: 'code-1'
      };

      expect(codeElement.type).toBe('codeBlock');
      expect(codeElement.content).toBe('console.log("hello");');
      expect(codeElement.metadata?.language).toBe('javascript');
      expect(codeElement.key).toBe('code-1');
    });

    it('should validate list element structure', () => {
      const listElement: ParsedMarkdownElement = {
        type: 'list',
        content: 'List item text',
        metadata: {
          listType: 'ul',
          marker: '-',
          leadingWhitespace: '  '
        },
        key: 'list-1'
      };

      expect(listElement.type).toBe('list');
      expect(listElement.content).toBe('List item text');
      expect(listElement.metadata?.listType).toBe('ul');
      expect(listElement.metadata?.marker).toBe('-');
      expect(listElement.metadata?.leadingWhitespace).toBe('  ');
      expect(listElement.key).toBe('list-1');
    });

    it('should validate ordered list element structure', () => {
      const olElement: ParsedMarkdownElement = {
        type: 'list',
        content: 'Ordered item',
        metadata: {
          listType: 'ol',
          marker: '1',
          leadingWhitespace: ''
        },
        key: 'ol-1'
      };

      expect(olElement.type).toBe('list');
      expect(olElement.metadata?.listType).toBe('ol');
      expect(olElement.metadata?.marker).toBe('1');
    });

    it('should validate paragraph element structure', () => {
      const paragraphElement: ParsedMarkdownElement = {
        type: 'paragraph',
        content: 'Regular paragraph text',
        key: 'para-1'
      };

      expect(paragraphElement.type).toBe('paragraph');
      expect(paragraphElement.content).toBe('Regular paragraph text');
      expect(paragraphElement.metadata).toBeUndefined();
      expect(paragraphElement.key).toBe('para-1');
    });

    it('should validate horizontal rule element structure', () => {
      const hrElement: ParsedMarkdownElement = {
        type: 'hr',
        content: '---',
        key: 'hr-1'
      };

      expect(hrElement.type).toBe('hr');
      expect(hrElement.content).toBe('---');
      expect(hrElement.key).toBe('hr-1');
    });

    it('should allow optional metadata', () => {
      const simpleElement: ParsedMarkdownElement = {
        type: 'paragraph',
        content: 'Simple text',
        key: 'simple-1'
      };

      expect(simpleElement.metadata).toBeUndefined();
      expect(simpleElement.type).toBe('paragraph');
    });
  });

  describe('MarkdownParsingContext', () => {
    it('should validate parsing context structure', () => {
      const context: MarkdownParsingContext = {
        inCodeBlock: true,
        codeBlockContent: ['line 1', 'line 2'],
        codeBlockLang: 'typescript',
        codeBlockFence: '```'
      };

      expect(context.inCodeBlock).toBe(true);
      expect(context.codeBlockContent).toEqual(['line 1', 'line 2']);
      expect(context.codeBlockLang).toBe('typescript');
      expect(context.codeBlockFence).toBe('```');
    });

    it('should handle null language in context', () => {
      const context: MarkdownParsingContext = {
        inCodeBlock: false,
        codeBlockContent: [],
        codeBlockLang: null,
        codeBlockFence: ''
      };

      expect(context.codeBlockLang).toBeNull();
      expect(context.inCodeBlock).toBe(false);
    });

    it('should handle empty arrays and strings', () => {
      const context: MarkdownParsingContext = {
        inCodeBlock: false,
        codeBlockContent: [],
        codeBlockLang: null,
        codeBlockFence: ''
      };

      expect(Array.isArray(context.codeBlockContent)).toBe(true);
      expect(context.codeBlockContent.length).toBe(0);
      expect(context.codeBlockFence).toBe('');
    });
  });

  describe('MarkdownDisplayProps', () => {
    it('should validate required props', () => {
      const props: MarkdownDisplayProps = {
        text: 'Sample markdown',
        isPending: false,
        terminalWidth: 80
      };

      expect(props.text).toBe('Sample markdown');
      expect(props.isPending).toBe(false);
      expect(props.terminalWidth).toBe(80);
      expect(props.availableTerminalHeight).toBeUndefined();
    });

    it('should validate props with optional height', () => {
      const props: MarkdownDisplayProps = {
        text: 'Sample markdown',
        isPending: true,
        availableTerminalHeight: 24,
        terminalWidth: 120
      };

      expect(props.text).toBe('Sample markdown');
      expect(props.isPending).toBe(true);
      expect(props.availableTerminalHeight).toBe(24);
      expect(props.terminalWidth).toBe(120);
    });

    it('should handle empty text', () => {
      const props: MarkdownDisplayProps = {
        text: '',
        isPending: false,
        terminalWidth: 80
      };

      expect(props.text).toBe('');
      expect(props.isPending).toBe(false);
    });

    it('should handle pending state variations', () => {
      const pendingProps: MarkdownDisplayProps = {
        text: 'Loading...',
        isPending: true,
        terminalWidth: 80
      };

      const completedProps: MarkdownDisplayProps = {
        text: 'Complete text',
        isPending: false,
        terminalWidth: 80
      };

      expect(pendingProps.isPending).toBe(true);
      expect(completedProps.isPending).toBe(false);
    });
  });

  describe('RenderContext', () => {
    it('should validate render context structure', () => {
      const context: RenderContext = {
        isPending: false,
        availableTerminalHeight: 30,
        terminalWidth: 100,
        index: 5
      };

      expect(context.isPending).toBe(false);
      expect(context.availableTerminalHeight).toBe(30);
      expect(context.terminalWidth).toBe(100);
      expect(context.index).toBe(5);
    });

    it('should handle context without height', () => {
      const context: RenderContext = {
        isPending: true,
        terminalWidth: 80,
        index: 0
      };

      expect(context.availableTerminalHeight).toBeUndefined();
      expect(context.isPending).toBe(true);
      expect(context.index).toBe(0);
    });

    it('should validate index boundaries', () => {
      const firstContext: RenderContext = {
        isPending: false,
        terminalWidth: 80,
        index: 0
      };

      const lastContext: RenderContext = {
        isPending: false,
        terminalWidth: 80,
        index: 999
      };

      expect(firstContext.index).toBe(0);
      expect(lastContext.index).toBe(999);
    });
  });

  describe('Type safety and constraints', () => {
    it('should enforce element type constraints', () => {
      // This test validates TypeScript compilation more than runtime behavior
      const validTypes: Array<ParsedMarkdownElement['type']> = [
        'header', 'codeBlock', 'list', 'paragraph', 'hr'
      ];

      validTypes.forEach(type => {
        const element: ParsedMarkdownElement = {
          type,
          content: 'test',
          key: 'test-key'
        };
        expect(element.type).toBe(type);
      });
    });

    it('should enforce list type constraints', () => {
      const ulList: ParsedMarkdownElement = {
        type: 'list',
        content: 'UL item',
        metadata: { listType: 'ul' },
        key: 'ul-1'
      };

      const olList: ParsedMarkdownElement = {
        type: 'list',
        content: 'OL item',
        metadata: { listType: 'ol' },
        key: 'ol-1'
      };

      expect(ulList.metadata?.listType).toBe('ul');
      expect(olList.metadata?.listType).toBe('ol');
    });

    it('should validate header level constraints', () => {
      const levels = [1, 2, 3, 4];
      
      levels.forEach(level => {
        const header: ParsedMarkdownElement = {
          type: 'header',
          content: `H${level} header`,
          metadata: { level },
          key: `h${level}-1`
        };
        
        expect(header.metadata?.level).toBe(level);
        expect(header.metadata?.level).toBeGreaterThanOrEqual(1);
        expect(header.metadata?.level).toBeLessThanOrEqual(4);
      });
    });
  });
});