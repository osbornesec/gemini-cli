/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { lsTool } from './ls.js';
import * as fs from 'fs/promises';
import * as path from 'path';

vi.mock('fs/promises');
vi.mock('path');

describe('lsTool', () => {
  const mockFs = vi.mocked(fs);
  const mockPath = vi.mocked(path);

  beforeEach(() => {
    vi.clearAllMocks();
    mockPath.resolve.mockImplementation((p) => p);
    mockPath.join.mockImplementation((...parts) => parts.join('/'));
  });

  it('should list directory contents successfully', async () => {
    const mockFiles = ['file1.txt', 'file2.js', 'directory1'];
    mockFs.readdir.mockResolvedValue(mockFiles as any);
    mockFs.stat.mockImplementation((filePath) => {
      const isDir = filePath.toString().includes('directory');
      return Promise.resolve({ isDirectory: () => isDir } as any);
    });

    const result = await lsTool.execute({ path: '/test/path' });

    expect(result.success).toBe(true);
    expect(result.output).toContain('file1.txt');
    expect(result.output).toContain('file2.js');
    expect(result.output).toContain('directory1/');
  });

  it('should handle non-existent directory', async () => {
    mockFs.readdir.mockRejectedValue(new Error('ENOENT: no such file or directory'));

    const result = await lsTool.execute({ path: '/non/existent/path' });

    expect(result.success).toBe(false);
    expect(result.output).toContain('Error');
    expect(result.output).toContain('no such file or directory');
  });

  it('should handle permission denied errors', async () => {
    mockFs.readdir.mockRejectedValue(new Error('EACCES: permission denied'));

    const result = await lsTool.execute({ path: '/restricted/path' });

    expect(result.success).toBe(false);
    expect(result.output).toContain('permission denied');
  });

  it('should validate path parameter', async () => {
    const result = await lsTool.execute({ path: '' });

    expect(result.success).toBe(false);
    expect(result.output).toContain('Path is required');
  });

  it('should handle relative paths', async () => {
    mockFs.readdir.mockResolvedValue(['index.js'] as any);
    mockFs.stat.mockResolvedValue({ isDirectory: () => false } as any);

    const result = await lsTool.execute({ path: './src' });

    expect(result.success).toBe(true);
    expect(mockFs.readdir).toHaveBeenCalledWith('./src');
  });

  it('should sort directory entries alphabetically', async () => {
    const mockFiles = ['z-file', 'a-file', 'b-directory'];
    mockFs.readdir.mockResolvedValue(mockFiles as any);
    mockFs.stat.mockResolvedValue({ isDirectory: () => false } as any);

    const result = await lsTool.execute({ path: '/test' });

    expect(result.success).toBe(true);
    const output = result.output;
    expect(output.indexOf('a-file')).toBeLessThan(output.indexOf('z-file'));
  });

  it('should handle empty directories', async () => {
    mockFs.readdir.mockResolvedValue([]);

    const result = await lsTool.execute({ path: '/empty' });

    expect(result.success).toBe(true);
    expect(result.output).toContain('No files found');
  });

  it('should include hidden files', async () => {
    const mockFiles = ['.hidden', '.gitignore', 'visible.txt'];
    mockFs.readdir.mockResolvedValue(mockFiles as any);
    mockFs.stat.mockResolvedValue({ isDirectory: () => false } as any);

    const result = await lsTool.execute({ path: '/test' });

    expect(result.success).toBe(true);
    expect(result.output).toContain('.hidden');
    expect(result.output).toContain('.gitignore');
  });

  it('should handle symbolic links', async () => {
    mockFs.readdir.mockResolvedValue(['symlink'] as any);
    mockFs.stat.mockResolvedValue({ 
      isDirectory: () => false,
      isSymbolicLink: () => true 
    } as any);

    const result = await lsTool.execute({ path: '/test' });

    expect(result.success).toBe(true);
    expect(result.output).toContain('symlink');
  });

  it('should provide detailed file information when requested', async () => {
    mockFs.readdir.mockResolvedValue(['file.txt'] as any);
    mockFs.stat.mockResolvedValue({ 
      isDirectory: () => false,
      size: 1024,
      mtime: new Date('2023-01-01'),
    } as any);

    const result = await lsTool.execute({ path: '/test', detailed: true });

    expect(result.success).toBe(true);
    expect(result.output).toContain('1024');
    expect(result.output).toContain('2023');
  });
});