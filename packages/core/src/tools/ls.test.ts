/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LSTool } from './ls.js';
import * as fs from 'fs';
import * as path from 'path';
import { Config } from '../config/config.js';

vi.mock('fs');
vi.mock('path');

describe('LSTool', () => {
  let lsTool: LSTool;
  let mockConfig: Config;
  const mockFs = vi.mocked(fs);
  const mockPath = vi.mocked(path);

  beforeEach(() => {
    vi.clearAllMocks();
    mockPath.resolve.mockImplementation((p) => p);
    mockPath.join.mockImplementation((...parts) => parts.join('/'));
    mockPath.isAbsolute.mockImplementation((p) => p.startsWith('/'));
    mockPath.normalize.mockImplementation((p) => p.toString());
    mockPath.sep = '/';
    
    // Mock config
    mockConfig = {
      getFileFilteringRespectGitIgnore: () => true,
      getFileService: () => ({
        isIgnored: () => false,
        getGitIgnoredFileCount: () => 0
      }),
      getRootDirectory: () => '/'
    } as any;
    
    lsTool = new LSTool(mockConfig);
  });

  it('should list directory contents successfully', async () => {
    const mockFiles = ['file1.txt', 'file2.js', 'directory1'];
    mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);
    mockFs.readdirSync.mockReturnValue(mockFiles as any);

    const result = await lsTool.execute({ path: '/home/test/path' }, new AbortController().signal);

    expect(result.llmContent).toContain('file1.txt');
    expect(result.llmContent).toContain('file2.js');
    expect(result.llmContent).toContain('directory1');
  });

  it('should handle non-existent directory', async () => {
    mockFs.statSync.mockImplementation(() => {
      const error = new Error('ENOENT: no such file or directory') as any;
      error.code = 'ENOENT';
      throw error;
    });

    const result = await lsTool.execute({ path: '/home/non/existent/path' }, new AbortController().signal);

    expect(result.llmContent).toContain('Error');
    expect(result.llmContent).toContain('no such file or directory');
  });

  it('should handle permission denied errors', async () => {
    mockFs.statSync.mockImplementation(() => {
      const error = new Error('EACCES: permission denied') as any;
      error.code = 'EACCES';
      throw error;
    });

    const result = await lsTool.execute({ path: '/home/restricted/path' }, new AbortController().signal);

    expect(result.llmContent).toContain('Error');
    expect(result.llmContent).toContain('permission denied');
  });

  it('should validate path parameter', async () => {
    const result = await lsTool.execute({ path: '' }, new AbortController().signal);

    expect(result.llmContent).toContain('Invalid parameters');
  });

  it('should handle absolute paths', async () => {
    mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);
    mockFs.readdirSync.mockReturnValue(['index.js'] as any);

    const result = await lsTool.execute({ path: '/home/src' }, new AbortController().signal);

    expect(result.llmContent).toContain('index.js');
  });

  it('should sort directory entries alphabetically', async () => {
    const mockFiles = ['z-file', 'a-file', 'b-directory'];
    mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);
    mockFs.readdirSync.mockReturnValue(mockFiles as any);

    const result = await lsTool.execute({ path: '/home/test' }, new AbortController().signal);

    const output = result.llmContent;
    expect(output.indexOf('a-file')).toBeLessThan(output.indexOf('z-file'));
  });

  it('should handle empty directories', async () => {
    mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);
    mockFs.readdirSync.mockReturnValue([]);

    const result = await lsTool.execute({ path: '/home/empty' }, new AbortController().signal);

    expect(result.llmContent).toContain('empty');
  });

  it('should include hidden files', async () => {
    const mockFiles = ['.hidden', '.gitignore', 'visible.txt'];
    mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);
    mockFs.readdirSync.mockReturnValue(mockFiles as any);

    const result = await lsTool.execute({ path: '/home/test' }, new AbortController().signal);

    expect(result.llmContent).toContain('.hidden');
    expect(result.llmContent).toContain('.gitignore');
  });

  it('should handle symbolic links', async () => {
    mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);
    mockFs.readdirSync.mockReturnValue(['symlink'] as any);

    const result = await lsTool.execute({ path: '/home/test' }, new AbortController().signal);

    expect(result.llmContent).toContain('symlink');
  });

  it('should provide file listing information', async () => {
    mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);
    mockFs.readdirSync.mockReturnValue(['file.txt'] as any);

    const result = await lsTool.execute({ path: '/home/test' }, new AbortController().signal);

    expect(result.llmContent).toContain('file.txt');
  });
});