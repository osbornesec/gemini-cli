/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shellTool } from './shell.js';
import { exec } from 'child_process';

vi.mock('child_process');

describe('shellTool', () => {
  const mockExec = vi.mocked(exec);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should execute shell command successfully', async () => {
    mockExec.mockImplementation((cmd, options, callback) => {
      callback?.(null, 'command output', '');
      return {} as any;
    });

    const result = await shellTool.execute({
      command: 'echo "hello world"',
      description: 'Test echo command',
    });

    expect(result.success).toBe(true);
    expect(result.output).toContain('command output');
  });

  it('should handle command execution errors', async () => {
    mockExec.mockImplementation((cmd, options, callback) => {
      callback?.(new Error('Command failed'), '', 'error output');
      return {} as any;
    });

    const result = await shellTool.execute({
      command: 'invalid-command',
    });

    expect(result.success).toBe(false);
    expect(result.output).toContain('error output');
  });

  it('should respect working directory parameter', async () => {
    mockExec.mockImplementation((cmd, options, callback) => {
      expect(options).toMatchObject({ cwd: '/custom/directory' });
      callback?.(null, 'output', '');
      return {} as any;
    });

    await shellTool.execute({
      command: 'pwd',
      directory: '/custom/directory',
    });

    expect(mockExec).toHaveBeenCalledWith(
      'pwd',
      expect.objectContaining({ cwd: '/custom/directory' }),
      expect.any(Function)
    );
  });

  it('should validate required command parameter', async () => {
    const result = await shellTool.execute({
      command: '',
    });

    expect(result.success).toBe(false);
    expect(result.output).toContain('Command is required');
  });

  it('should handle timeout for long-running commands', async () => {
    mockExec.mockImplementation((cmd, options, callback) => {
      // Simulate timeout
      setTimeout(() => {
        callback?.(new Error('Command timed out'), '', '');
      }, 100);
      return {} as any;
    });

    const result = await shellTool.execute({
      command: 'sleep 10',
    });

    expect(result.success).toBe(false);
    expect(result.output).toContain('timed out');
  });

  it('should handle environment variables', async () => {
    mockExec.mockImplementation((cmd, options, callback) => {
      expect(options).toMatchObject({ 
        env: expect.objectContaining({ 
          TEST_VAR: 'test_value' 
        })
      });
      callback?.(null, 'output', '');
      return {} as any;
    });

    await shellTool.execute({
      command: 'echo $TEST_VAR',
      env: { TEST_VAR: 'test_value' },
    });
  });

  it('should capture both stdout and stderr', async () => {
    mockExec.mockImplementation((cmd, options, callback) => {
      callback?.(null, 'stdout content', 'stderr content');
      return {} as any;
    });

    const result = await shellTool.execute({
      command: 'test-command',
    });

    expect(result.success).toBe(true);
    expect(result.output).toContain('stdout content');
    expect(result.output).toContain('stderr content');
  });

  it('should handle commands with special characters', async () => {
    mockExec.mockImplementation((cmd, options, callback) => {
      expect(cmd).toBe('echo "hello & world"');
      callback?.(null, 'hello & world', '');
      return {} as any;
    });

    const result = await shellTool.execute({
      command: 'echo "hello & world"',
    });

    expect(result.success).toBe(true);
  });

  it('should limit command execution time', async () => {
    mockExec.mockImplementation((cmd, options, callback) => {
      expect(options).toMatchObject({ timeout: 30000 });
      callback?.(null, 'output', '');
      return {} as any;
    });

    await shellTool.execute({
      command: 'long-command',
      timeout: 30000,
    });
  });
});