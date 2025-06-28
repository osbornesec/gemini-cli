/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { findLastSafeSplitPoint } from './markdownUtilities.js';

// Export internal functions for testing
const isIndexInsideCodeBlock = (
  content: string,
  indexToTest: number,
): boolean => {
  let fenceCount = 0;
  let searchPos = 0;
  while (searchPos < content.length) {
    const nextFence = content.indexOf('```', searchPos);
    if (nextFence === -1 || nextFence >= indexToTest) {
      break;
    }
    fenceCount++;
    searchPos = nextFence + 3;
  }
  return fenceCount % 2 === 1;
};

const findEnclosingCodeBlockStart = (
  content: string,
  index: number,
): number => {
  if (!isIndexInsideCodeBlock(content, index)) {
    return -1;
  }
  let currentSearchPos = 0;
  while (currentSearchPos < index) {
    const blockStartIndex = content.indexOf('```', currentSearchPos);
    if (blockStartIndex === -1 || blockStartIndex >= index) {
      break;
    }
    const blockEndIndex = content.indexOf('```', blockStartIndex + 3);
    if (blockStartIndex < index) {
      if (blockEndIndex === -1 || index < blockEndIndex + 3) {
        return blockStartIndex;
      }
    }
    if (blockEndIndex === -1) break;
    currentSearchPos = blockEndIndex + 3;
  }
  return -1;
};

describe('markdownUtilities', () => {
  describe('isIndexInsideCodeBlock', () => {
    it('should return false when no code blocks exist', () => {
      const content = 'Just some plain text without code blocks';
      expect(isIndexInsideCodeBlock(content, 10)).toBe(false);
      expect(isIndexInsideCodeBlock(content, 0)).toBe(false);
      expect(isIndexInsideCodeBlock(content, content.length - 1)).toBe(false);
    });

    it('should return true when index is inside a code block', () => {
      const content = 'Before```\ncode\n```After';
      expect(isIndexInsideCodeBlock(content, 10)).toBe(true); // Inside "code"
      expect(isIndexInsideCodeBlock(content, 11)).toBe(true);
      expect(isIndexInsideCodeBlock(content, 14)).toBe(true); // Just before closing ```
    });

    it('should return false when index is outside code blocks', () => {
      const content = 'Before```\ncode\n```After';
      expect(isIndexInsideCodeBlock(content, 0)).toBe(false); // Before opening ```
      expect(isIndexInsideCodeBlock(content, 5)).toBe(false); // Still before
      expect(isIndexInsideCodeBlock(content, 18)).toBe(false); // After closing ```
    });

    it('should handle multiple code blocks correctly', () => {
      const content = 'Text```\ncode1\n```Middle```\ncode2\n```End';
      // Positions: Text(0-3), ```(4-6), code1(8-12), ```(14-16), Middle(17-22), ```(23-25), code2(27-31), ```(33-35), End(36-38)
      expect(isIndexInsideCodeBlock(content, 9)).toBe(true); // Inside code1
      expect(isIndexInsideCodeBlock(content, 20)).toBe(false); // In Middle
      expect(isIndexInsideCodeBlock(content, 28)).toBe(true); // Inside code2
      expect(isIndexInsideCodeBlock(content, 37)).toBe(false); // In End
    });

    it('should handle unclosed code blocks', () => {
      const content = 'Before```\ncode without end';
      expect(isIndexInsideCodeBlock(content, 15)).toBe(true); // Inside unclosed block
      expect(isIndexInsideCodeBlock(content, content.length - 1)).toBe(true);
    });

    it('should handle code blocks at the beginning', () => {
      const content = '```\ncode\n```Rest';
      expect(isIndexInsideCodeBlock(content, 4)).toBe(true); // Inside code
      expect(isIndexInsideCodeBlock(content, 12)).toBe(false); // In Rest
    });

    it('should handle empty content', () => {
      expect(isIndexInsideCodeBlock('', 0)).toBe(false);
    });

    it('should handle index at the exact position of fence markers', () => {
      const content = 'Before```\ncode\n```After';
      expect(isIndexInsideCodeBlock(content, 6)).toBe(false); // At the ``` position
      expect(isIndexInsideCodeBlock(content, 9)).toBe(true); // After ``` (inside)
    });
  });

  describe('findEnclosingCodeBlockStart', () => {
    it('should return -1 when index is not inside a code block', () => {
      const content = 'Text without code blocks';
      expect(findEnclosingCodeBlockStart(content, 5)).toBe(-1);
    });

    it('should find the start of enclosing code block', () => {
      const content = 'Before```\ncode\n```After';
      expect(findEnclosingCodeBlockStart(content, 10)).toBe(6); // Returns position of ```
      expect(findEnclosingCodeBlockStart(content, 11)).toBe(6);
      expect(findEnclosingCodeBlockStart(content, 14)).toBe(6);
    });

    it('should handle multiple code blocks and find the correct one', () => {
      const content = 'Text```\ncode1\n```Middle```\ncode2\n```End';
      expect(findEnclosingCodeBlockStart(content, 9)).toBe(4); // Inside code1
      expect(findEnclosingCodeBlockStart(content, 28)).toBe(23); // Inside code2
      expect(findEnclosingCodeBlockStart(content, 20)).toBe(-1); // In Middle (not in block)
    });

    it('should handle unclosed code blocks', () => {
      const content = 'Before```\ncode without end';
      expect(findEnclosingCodeBlockStart(content, 15)).toBe(6);
      expect(findEnclosingCodeBlockStart(content, content.length - 1)).toBe(6);
    });

    it('should handle code block at the beginning', () => {
      const content = '```\ncode\n```Rest';
      expect(findEnclosingCodeBlockStart(content, 4)).toBe(0);
      expect(findEnclosingCodeBlockStart(content, 7)).toBe(0);
    });

    it('should handle nested-like patterns (though markdown doesnt support nested code blocks)', () => {
      const content = '```\ncode with ``` inside\n```';
      // The second ``` at position 14 ends the block, so position 15 is outside
      expect(findEnclosingCodeBlockStart(content, 15)).toBe(-1); // Actually outside the block
    });

    it('should return -1 for empty content', () => {
      expect(findEnclosingCodeBlockStart('', 0)).toBe(-1);
    });
  });

  describe('findLastSafeSplitPoint', () => {
    it('should split at the last double newline if not in a code block', () => {
      const content = 'paragraph1\n\nparagraph2\n\nparagraph3';
      expect(findLastSafeSplitPoint(content)).toBe(24); // After the second \n\n
    });

    it('should return content.length if no safe split point is found', () => {
      const content = 'longstringwithoutanysafesplitpoint';
      expect(findLastSafeSplitPoint(content)).toBe(content.length);
    });

    it('should prioritize splitting at \n\n over being at the very end of the string if the end is not in a code block', () => {
      const content = 'Some text here.\n\nAnd more text here.';
      expect(findLastSafeSplitPoint(content)).toBe(17); // after the \n\n
    });

    it('should return content.length if the only \n\n is inside a code block and the end of content is not', () => {
      const content = '```\nignore this\n\nnewline\n```KeepThis';
      expect(findLastSafeSplitPoint(content)).toBe(content.length);
    });

    it('should correctly identify the last \n\n even if it is followed by text not in a code block', () => {
      const content =
        'First part.\n\nSecond part.\n\nThird part, then some more text.';
      // Split should be after "Second part.\n\n"
      // "First part.\n\n" is 13 chars. "Second part.\n\n" is 14 chars. Total 27.
      expect(findLastSafeSplitPoint(content)).toBe(27);
    });

    it('should return content.length if content is empty', () => {
      const content = '';
      expect(findLastSafeSplitPoint(content)).toBe(0);
    });

    it('should return content.length if content has no newlines and no code blocks', () => {
      const content = 'Single line of text';
      expect(findLastSafeSplitPoint(content)).toBe(content.length);
    });

    it('should split before code block when content ends inside a code block', () => {
      const content = 'Some text\n\n```\ncode that is not closed';
      expect(findLastSafeSplitPoint(content)).toBe(11); // Before the ```
    });

    it('should handle code blocks with content after them', () => {
      const content = '```\ncode\n```\n\nSome text after';
      expect(findLastSafeSplitPoint(content)).toBe(14); // After \n\n following the code block
    });

    it('should skip double newlines inside code blocks when searching', () => {
      const content = 'Text before\n\n```\ncode\n\nmore code\n```\n\nText after';
      expect(findLastSafeSplitPoint(content)).toBe(38); // After the \n\n following the code block
    });

    it('should handle content with only single newlines', () => {
      const content = 'Line 1\nLine 2\nLine 3';
      expect(findLastSafeSplitPoint(content)).toBe(content.length); // No double newlines
    });

    it('should handle double newline at the very end', () => {
      const content = 'Some text\n\n';
      expect(findLastSafeSplitPoint(content)).toBe(11); // After the \n\n
    });

    it('should handle multiple consecutive newlines', () => {
      const content = 'Text\n\n\n\nMore text';
      // The function finds the LAST double newline, which is at position 6 (\n\n at indices 6-7)
      expect(findLastSafeSplitPoint(content)).toBe(8); // After the last \n\n
    });

    it('should handle code block that starts at beginning and ends inside content', () => {
      const content = '```\ncode block\n```';
      expect(findLastSafeSplitPoint(content)).toBe(content.length); // No safe split before
    });

    it('should handle search progression when double newlines are in code blocks', () => {
      const content = 'Start\n\n```\nhas\n\nnewline\n```\n\nEnd section\n\nFinal';
      // The \n\n inside code block should be skipped
      // Should find the last safe \n\n which is after "End section"
      expect(findLastSafeSplitPoint(content)).toBe(42); // After "End section\n\n"
    });

    it('should handle edge case where searchStartIndex becomes negative', () => {
      const content = '\n\n```\ncode\n```Rest';
      // There's a \n\n at the beginning (position 0-1), so split point is after it at position 2
      expect(findLastSafeSplitPoint(content)).toBe(2); // After the initial \n\n
    });
  });
});
