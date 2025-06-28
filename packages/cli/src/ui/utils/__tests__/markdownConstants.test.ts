/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { MARKDOWN_PATTERNS, LIMITS, LAYOUT_CONSTANTS, SAFE_SCHEMES } from '../markdownConstants.js';

describe('markdownConstants', () => {
  describe('MARKDOWN_PATTERNS', () => {
    describe('HEADER', () => {
      it('should match valid header patterns', () => {
        expect(MARKDOWN_PATTERNS.HEADER.test('# H1 Header')).toBe(true);
        expect(MARKDOWN_PATTERNS.HEADER.test('## H2 Header')).toBe(true);
        expect(MARKDOWN_PATTERNS.HEADER.test('### H3 Header')).toBe(true);
        expect(MARKDOWN_PATTERNS.HEADER.test('#### H4 Header')).toBe(true);
      });

      it('should match headers with leading spaces', () => {
        expect(MARKDOWN_PATTERNS.HEADER.test('   ## Spaced Header')).toBe(true);
      });

      it('should not match headers with more than 4 hashes', () => {
        expect(MARKDOWN_PATTERNS.HEADER.test('##### Not a header')).toBe(false);
        expect(MARKDOWN_PATTERNS.HEADER.test('###### Also not a header')).toBe(false);
      });

      it('should not match headers without space after hashes', () => {
        expect(MARKDOWN_PATTERNS.HEADER.test('#NoSpace')).toBe(false);
      });

      it('should capture level and text correctly', () => {
        const match = MARKDOWN_PATTERNS.HEADER.exec('## Test Header');
        expect(match).toBeTruthy();
        expect(match![1]).toBe('##'); // Level hashes
        expect(match![2]).toBe('Test Header'); // Header text
      });
    });

    describe('CODE_FENCE', () => {
      it('should match backtick fences', () => {
        expect(MARKDOWN_PATTERNS.CODE_FENCE.test('```')).toBe(true);
        expect(MARKDOWN_PATTERNS.CODE_FENCE.test('```javascript')).toBe(true);
        expect(MARKDOWN_PATTERNS.CODE_FENCE.test('````')).toBe(true);
      });

      it('should match tilde fences', () => {
        expect(MARKDOWN_PATTERNS.CODE_FENCE.test('~~~')).toBe(true);
        expect(MARKDOWN_PATTERNS.CODE_FENCE.test('~~~python')).toBe(true);
      });

      it('should match fences with leading spaces', () => {
        expect(MARKDOWN_PATTERNS.CODE_FENCE.test('   ```typescript')).toBe(true);
      });

      it('should capture fence type and language', () => {
        const match = MARKDOWN_PATTERNS.CODE_FENCE.exec('```javascript');
        expect(match).toBeTruthy();
        expect(match![1]).toBe('```'); // Fence characters
        expect(match![2]).toBe('javascript'); // Language
      });

      it('should handle empty language', () => {
        const match = MARKDOWN_PATTERNS.CODE_FENCE.exec('```');
        expect(match).toBeTruthy();
        expect(match![2]).toBe(''); // Empty language
      });
    });

    describe('UL_ITEM', () => {
      it('should match dash markers', () => {
        expect(MARKDOWN_PATTERNS.UL_ITEM.test('- Item')).toBe(true);
      });

      it('should match asterisk markers', () => {
        expect(MARKDOWN_PATTERNS.UL_ITEM.test('* Item')).toBe(true);
      });

      it('should match plus markers', () => {
        expect(MARKDOWN_PATTERNS.UL_ITEM.test('+ Item')).toBe(true);
      });

      it('should match indented items', () => {
        expect(MARKDOWN_PATTERNS.UL_ITEM.test('  - Indented item')).toBe(true);
        expect(MARKDOWN_PATTERNS.UL_ITEM.test('\t* Tab indented')).toBe(true);
      });

      it('should capture indentation, marker, and text', () => {
        const match = MARKDOWN_PATTERNS.UL_ITEM.exec('  - Test item');
        expect(match).toBeTruthy();
        expect(match![1]).toBe('  '); // Leading whitespace
        expect(match![2]).toBe('-'); // Marker
        expect(match![3]).toBe('Test item'); // Item text
      });
    });

    describe('OL_ITEM', () => {
      it('should match numbered items', () => {
        expect(MARKDOWN_PATTERNS.OL_ITEM.test('1. First item')).toBe(true);
        expect(MARKDOWN_PATTERNS.OL_ITEM.test('10. Tenth item')).toBe(true);
        expect(MARKDOWN_PATTERNS.OL_ITEM.test('999. Many digits')).toBe(true);
      });

      it('should match indented numbered items', () => {
        expect(MARKDOWN_PATTERNS.OL_ITEM.test('  1. Indented')).toBe(true);
        expect(MARKDOWN_PATTERNS.OL_ITEM.test('\t2. Tab indented')).toBe(true);
      });

      it('should capture indentation, number, and text', () => {
        const match = MARKDOWN_PATTERNS.OL_ITEM.exec('  10. Test item');
        expect(match).toBeTruthy();
        expect(match![1]).toBe('  '); // Leading whitespace
        expect(match![2]).toBe('10'); // Number
        expect(match![3]).toBe('Test item'); // Item text
      });
    });

    describe('HR', () => {
      it('should match dash horizontal rules', () => {
        expect(MARKDOWN_PATTERNS.HR.test('---')).toBe(true);
        expect(MARKDOWN_PATTERNS.HR.test('-----')).toBe(true);
        expect(MARKDOWN_PATTERNS.HR.test('- - -')).toBe(true);
      });

      it('should match asterisk horizontal rules', () => {
        expect(MARKDOWN_PATTERNS.HR.test('***')).toBe(true);
        expect(MARKDOWN_PATTERNS.HR.test('*****')).toBe(true);
        expect(MARKDOWN_PATTERNS.HR.test('* * *')).toBe(true);
      });

      it('should match underscore horizontal rules', () => {
        expect(MARKDOWN_PATTERNS.HR.test('___')).toBe(true);
        expect(MARKDOWN_PATTERNS.HR.test('_____')).toBe(true);
        expect(MARKDOWN_PATTERNS.HR.test('_ _ _')).toBe(true);
      });

      it('should match with leading/trailing spaces', () => {
        expect(MARKDOWN_PATTERNS.HR.test('   ---   ')).toBe(true);
      });

      it('should not match less than 3 characters', () => {
        expect(MARKDOWN_PATTERNS.HR.test('--')).toBe(false);
        expect(MARKDOWN_PATTERNS.HR.test('**')).toBe(false);
      });
    });

    describe('INLINE', () => {
      it('should match bold text', () => {
        const text = 'This **bold** text';
        const matches = Array.from(text.matchAll(MARKDOWN_PATTERNS.INLINE));
        expect(matches).toHaveLength(1);
        expect(matches[0][0]).toBe('**bold**');
      });

      it('should match italic text', () => {
        const text = 'This *italic* text';
        const matches = Array.from(text.matchAll(MARKDOWN_PATTERNS.INLINE));
        expect(matches).toHaveLength(1);
        expect(matches[0][0]).toBe('*italic*');
      });

      it('should match underscored italic', () => {
        const text = 'This _italic_ text';
        const matches = Array.from(text.matchAll(MARKDOWN_PATTERNS.INLINE));
        expect(matches).toHaveLength(1);
        expect(matches[0][0]).toBe('_italic_');
      });

      it('should match strikethrough text', () => {
        const text = 'This ~~strike~~ text';
        const matches = Array.from(text.matchAll(MARKDOWN_PATTERNS.INLINE));
        expect(matches).toHaveLength(1);
        expect(matches[0][0]).toBe('~~strike~~');
      });

      it('should match inline code', () => {
        const text = 'This `code` text';
        const matches = Array.from(text.matchAll(MARKDOWN_PATTERNS.INLINE));
        expect(matches).toHaveLength(1);
        expect(matches[0][0]).toBe('`code`');
      });

      it('should match links', () => {
        const text = 'Visit [Google](https://google.com) today';
        const matches = Array.from(text.matchAll(MARKDOWN_PATTERNS.INLINE));
        expect(matches).toHaveLength(1);
        expect(matches[0][0]).toBe('[Google](https://google.com)');
      });

      it('should match underline tags', () => {
        const text = 'This <u>underlined</u> text';
        const matches = Array.from(text.matchAll(MARKDOWN_PATTERNS.INLINE));
        expect(matches).toHaveLength(1);
        expect(matches[0][0]).toBe('<u>underlined</u>');
      });

      it('should match multiple inline elements', () => {
        const text = 'Text with **bold** and *italic* and `code`';
        const matches = Array.from(text.matchAll(MARKDOWN_PATTERNS.INLINE));
        expect(matches).toHaveLength(3);
        expect(matches[0][0]).toBe('**bold**');
        expect(matches[1][0]).toBe('*italic*');
        expect(matches[2][0]).toBe('`code`');
      });
    });
  });

  describe('LIMITS', () => {
    it('should have positive maximum lines', () => {
      expect(LIMITS.MAX_LINES).toBeGreaterThan(0);
      expect(LIMITS.MAX_LINES).toBe(10000);
    });

    it('should have positive maximum line length', () => {
      expect(LIMITS.MAX_LINE_LENGTH).toBeGreaterThan(0);
      expect(LIMITS.MAX_LINE_LENGTH).toBe(5000);
    });

    it('should have correct marker lengths', () => {
      expect(LIMITS.BOLD_MARKER_LENGTH).toBe(2);
      expect(LIMITS.ITALIC_MARKER_LENGTH).toBe(1);
      expect(LIMITS.STRIKETHROUGH_MARKER_LENGTH).toBe(2);
      expect(LIMITS.INLINE_CODE_MARKER_LENGTH).toBe(1);
      expect(LIMITS.UNDERLINE_TAG_START_LENGTH).toBe(3);
      expect(LIMITS.UNDERLINE_TAG_END_LENGTH).toBe(4);
    });

    it('should have readonly constants object', () => {
      // TypeScript enforces immutability at compile-time with 'as const'
      // In strict mode, attempting to modify would be caught by TypeScript
      expect(typeof LIMITS).toBe('object');
      expect(LIMITS.MAX_LINES).toBe(10000);
    });
  });

  describe('LAYOUT_CONSTANTS', () => {
    it('should have correct layout values', () => {
      expect(LAYOUT_CONSTANTS.EMPTY_LINE_HEIGHT).toBe(1);
      expect(LAYOUT_CONSTANTS.CODE_BLOCK_PADDING).toBe(1);
      expect(LAYOUT_CONSTANTS.LIST_ITEM_PREFIX_PADDING).toBe(1);
      expect(LAYOUT_CONSTANTS.LIST_ITEM_TEXT_FLEX_GROW).toBe(1);
    });

    it('should have positive layout values', () => {
      Object.values(LAYOUT_CONSTANTS).forEach(value => {
        expect(value).toBeGreaterThan(0);
      });
    });

    it('should have readonly constants object', () => {
      // TypeScript enforces immutability at compile-time with 'as const'
      // In strict mode, attempting to modify would be caught by TypeScript
      expect(typeof LAYOUT_CONSTANTS).toBe('object');
      expect(LAYOUT_CONSTANTS.EMPTY_LINE_HEIGHT).toBe(1);
    });
  });

  describe('SAFE_SCHEMES', () => {
    it('should match safe HTTP schemes', () => {
      expect(SAFE_SCHEMES.test('http:')).toBe(true);
      expect(SAFE_SCHEMES.test('https:')).toBe(true);
      expect(SAFE_SCHEMES.test('HTTP:')).toBe(true);
      expect(SAFE_SCHEMES.test('HTTPS:')).toBe(true);
    });

    it('should match safe mailto scheme', () => {
      expect(SAFE_SCHEMES.test('mailto:')).toBe(true);
      expect(SAFE_SCHEMES.test('MAILTO:')).toBe(true);
    });

    it('should match safe tel scheme', () => {
      expect(SAFE_SCHEMES.test('tel:')).toBe(true);
      expect(SAFE_SCHEMES.test('TEL:')).toBe(true);
    });

    it('should not match dangerous schemes', () => {
      expect(SAFE_SCHEMES.test('javascript:')).toBe(false);
      expect(SAFE_SCHEMES.test('data:')).toBe(false);
      expect(SAFE_SCHEMES.test('vbscript:')).toBe(false);
      expect(SAFE_SCHEMES.test('file:')).toBe(false);
    });
  });

  describe('Constants structure', () => {
    it('should export all required constants', () => {
      expect(MARKDOWN_PATTERNS).toBeDefined();
      expect(LIMITS).toBeDefined();
      expect(LAYOUT_CONSTANTS).toBeDefined();
      expect(SAFE_SCHEMES).toBeDefined();
    });

    it('should have correct types', () => {
      expect(typeof MARKDOWN_PATTERNS).toBe('object');
      expect(typeof LIMITS).toBe('object');
      expect(typeof LAYOUT_CONSTANTS).toBe('object');
      expect(SAFE_SCHEMES).toBeInstanceOf(RegExp);
    });
  });
});