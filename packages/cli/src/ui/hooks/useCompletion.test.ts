/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCompletion } from './useCompletion.js';
import * as fs from 'fs/promises';

vi.mock('fs/promises');

describe('useCompletion', () => {
  const mockFs = vi.mocked(fs);

  beforeEach(() => {
    mockFs.readdir.mockResolvedValue([]);
    mockFs.stat.mockResolvedValue({ isDirectory: () => false } as any);
    vi.clearAllMocks();
  });

  it('should return empty completions for empty input', async () => {
    const { result } = renderHook(() => useCompletion());

    await act(async () => {
      const completions = await result.current.getCompletions('', 0);
      expect(completions).toEqual([]);
    });
  });

  it('should suggest file completions for paths', async () => {
    mockFs.readdir.mockResolvedValue(['file1.ts', 'file2.js'] as any);

    const { result } = renderHook(() => useCompletion());

    await act(async () => {
      const completions = await result.current.getCompletions('./src/', 6);
      expect(completions).toContain('file1.ts');
      expect(completions).toContain('file2.js');
    });
  });

  it('should handle file system errors gracefully', async () => {
    mockFs.readdir.mockRejectedValue(new Error('Permission denied'));

    const { result } = renderHook(() => useCompletion());

    await act(async () => {
      const completions = await result.current.getCompletions('./forbidden/', 12);
      expect(completions).toEqual([]);
    });
  });

  it('should filter completions based on partial input', async () => {
    mockFs.readdir.mockResolvedValue(['test.ts', 'example.js', 'testing.md'] as any);

    const { result } = renderHook(() => useCompletion());

    await act(async () => {
      const completions = await result.current.getCompletions('./test', 6);
      expect(completions).toContain('test.ts');
      expect(completions).toContain('testing.md');
      expect(completions).not.toContain('example.js');
    });
  });

  it('should distinguish between files and directories', async () => {
    mockFs.readdir.mockResolvedValue(['file.txt', 'directory'] as any);
    mockFs.stat.mockImplementation((path) => {
      const isDir = path.toString().includes('directory');
      return Promise.resolve({ isDirectory: () => isDir } as any);
    });

    const { result } = renderHook(() => useCompletion());

    await act(async () => {
      const completions = await result.current.getCompletions('./', 2);
      expect(completions).toContain('file.txt');
      expect(completions).toContain('directory/');
    });
  });

  it('should handle absolute paths', async () => {
    mockFs.readdir.mockResolvedValue(['root-file.txt'] as any);

    const { result } = renderHook(() => useCompletion());

    await act(async () => {
      const completions = await result.current.getCompletions('/usr/local/', 11);
      expect(completions).toContain('root-file.txt');
    });
  });

  it('should handle hidden files', async () => {
    mockFs.readdir.mockResolvedValue(['.hidden', '.gitignore', 'visible.txt'] as any);

    const { result } = renderHook(() => useCompletion());

    await act(async () => {
      const completions = await result.current.getCompletions('./', 2);
      expect(completions).toContain('.hidden');
      expect(completions).toContain('.gitignore');
      expect(completions).toContain('visible.txt');
    });
  });

  it('should cache completions for performance', async () => {
    mockFs.readdir.mockResolvedValue(['cached.txt'] as any);

    const { result } = renderHook(() => useCompletion());

    await act(async () => {
      await result.current.getCompletions('./cache/', 8);
      await result.current.getCompletions('./cache/', 8);
    });

    // Should only call readdir once due to caching
    expect(mockFs.readdir).toHaveBeenCalledTimes(1);
  });
});