/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { isBinary, getAsciiArtWidth, toCodePoints, cpLen, cpSlice } from './textUtils';

describe('textUtils', () => {
  describe('isBinary', () => {
    it('should return true for a buffer containing a null byte', () => {
      const buffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x1a, 0x0a, 0x00,
      ]);
      expect(isBinary(buffer)).toBe(true);
    });

    it('should return false for a buffer containing only text', () => {
      const buffer = Buffer.from('This is a test string.');
      expect(isBinary(buffer)).toBe(false);
    });

    it('should return false for an empty buffer', () => {
      const buffer = Buffer.from([]);
      expect(isBinary(buffer)).toBe(false);
    });

    it('should return false for a null or undefined buffer', () => {
      expect(isBinary(null)).toBe(false);
      expect(isBinary(undefined)).toBe(false);
    });

    it('should only check the sample size', () => {
      const longBufferWithNullByteAtEnd = Buffer.concat([
        Buffer.from('a'.repeat(1024)),
        Buffer.from([0x00]),
      ]);
      expect(isBinary(longBufferWithNullByteAtEnd, 512)).toBe(false);
    });
  });

  describe('getAsciiArtWidth', () => {
    it('should return 0 for empty string', () => {
      expect(getAsciiArtWidth('')).toBe(0);
    });

    it('should return 0 for null/undefined', () => {
      expect(getAsciiArtWidth(null as any)).toBe(0);
      expect(getAsciiArtWidth(undefined as any)).toBe(0);
    });

    it('should return width of single line', () => {
      expect(getAsciiArtWidth('Hello World')).toBe(11);
    });

    it('should return width of longest line in multi-line string', () => {
      const asciiArt = `
  ____
 / ___| ___ _ __ ___  _   _
| |  _ / _ \\ '_ \` _ \\| | | |
| |_| |  __/ | | | | | |_| |
 \\____|\\___|_| |_| |_|\\__, |
                      |___/`;
      expect(getAsciiArtWidth(asciiArt)).toBe(28); // The second line is the longest
    });

    it('should handle strings with only newlines', () => {
      expect(getAsciiArtWidth('\n\n\n')).toBe(0);
    });
  });

  describe('toCodePoints', () => {
    it('should handle empty string', () => {
      expect(toCodePoints('')).toEqual([]);
    });

    it('should handle ASCII characters', () => {
      expect(toCodePoints('abc')).toEqual(['a', 'b', 'c']);
    });

    it('should handle emoji with surrogate pairs', () => {
      expect(toCodePoints('👨‍👩‍👧‍👦')).toEqual(['👨', '‍', '👩', '‍', '👧', '‍', '👦']);
    });

    it('should handle mixed content', () => {
      expect(toCodePoints('Hi 👋 there')).toEqual(['H', 'i', ' ', '👋', ' ', 't', 'h', 'e', 'r', 'e']);
    });
  });

  describe('cpLen', () => {
    it('should return 0 for empty string', () => {
      expect(cpLen('')).toBe(0);
    });

    it('should count ASCII characters correctly', () => {
      expect(cpLen('Hello')).toBe(5);
    });

    it('should count emoji as single code points', () => {
      expect(cpLen('👋')).toBe(1);
      expect(cpLen('Hello 👋 World')).toBe(13);
    });

    it('should handle complex emoji sequences', () => {
      // Family emoji is made of multiple code points
      expect(cpLen('👨‍👩‍👧‍👦')).toBe(7); // 4 people + 3 ZWJ characters
    });
  });

  describe('cpSlice', () => {
    it('should handle empty string', () => {
      expect(cpSlice('', 0)).toBe('');
      expect(cpSlice('', 0, 5)).toBe('');
    });

    it('should slice ASCII strings', () => {
      expect(cpSlice('Hello World', 0, 5)).toBe('Hello');
      expect(cpSlice('Hello World', 6)).toBe('World');
      expect(cpSlice('Hello World', 6, 11)).toBe('World');
    });

    it('should slice strings with emoji correctly', () => {
      const str = 'Hi 👋 there';
      expect(cpSlice(str, 0, 2)).toBe('Hi');
      expect(cpSlice(str, 3, 4)).toBe('👋');
      expect(cpSlice(str, 5)).toBe('there');
    });

    it('should handle negative indices', () => {
      expect(cpSlice('Hello', -2)).toBe('lo');
      expect(cpSlice('Hello', -3, -1)).toBe('ll');
    });

    it('should handle out of bounds indices', () => {
      expect(cpSlice('Hi', 0, 10)).toBe('Hi');
      expect(cpSlice('Hi', 5)).toBe('');
    });
  });
});
