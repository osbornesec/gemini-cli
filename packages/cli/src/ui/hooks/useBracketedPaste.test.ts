/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBracketedPaste } from './useBracketedPaste.js';

describe('useBracketedPaste', () => {
  let mockStdout: any;
  let originalStdout: any;

  beforeEach(() => {
    originalStdout = process.stdout;
    mockStdout = {
      write: vi.fn(),
    };
    
    Object.defineProperty(process, 'stdout', {
      value: mockStdout,
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(process, 'stdout', {
      value: originalStdout,
      writable: true,
    });
    vi.clearAllMocks();
  });

  it('should enable bracketed paste mode on mount', () => {
    renderHook(() => useBracketedPaste());

    expect(mockStdout.write).toHaveBeenCalledWith('\x1b[?2004h');
  });

  it('should disable bracketed paste mode on unmount', () => {
    const { unmount } = renderHook(() => useBracketedPaste());

    unmount();

    expect(mockStdout.write).toHaveBeenCalledWith('\x1b[?2004l');
  });

  it('should handle multiple mount/unmount cycles', () => {
    const { unmount, rerender } = renderHook(() => useBracketedPaste());

    rerender();
    unmount();

    expect(mockStdout.write).toHaveBeenCalledTimes(2);
    expect(mockStdout.write).toHaveBeenLastCalledWith('\x1b[?2004l');
  });

  it('should handle stdout write errors gracefully', () => {
    mockStdout.write.mockImplementation(() => {
      throw new Error('Write error');
    });

    expect(() => renderHook(() => useBracketedPaste())).not.toThrow();
  });

  it('should not interfere with other stdout operations', () => {
    renderHook(() => useBracketedPaste());
    
    // Reset mock to track only new calls
    mockStdout.write.mockClear();
    
    process.stdout.write('test output');
    
    expect(mockStdout.write).toHaveBeenCalledWith('test output');
  });

  it('should handle rapid mount/unmount', () => {
    const { unmount: unmount1 } = renderHook(() => useBracketedPaste());
    const { unmount: unmount2 } = renderHook(() => useBracketedPaste());
    
    unmount1();
    unmount2();

    // Should have enabled twice and disabled twice
    expect(mockStdout.write).toHaveBeenCalledTimes(4);
  });
});