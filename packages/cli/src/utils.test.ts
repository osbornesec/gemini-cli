/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatDuration,
  formatFileSize,
  sanitizeFilename,
  validateProjectId,
  parseCommandLine,
  debounce,
  throttle,
  retry,
  createLogger,
  LogLevel
} from './utils.js';

describe('CLI utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('formatDuration', () => {
    it('should format milliseconds correctly', () => {
      expect(formatDuration(500)).toBe('500ms');
      expect(formatDuration(999)).toBe('999ms');
    });

    it('should format seconds correctly', () => {
      expect(formatDuration(1000)).toBe('1.0s');
      expect(formatDuration(1500)).toBe('1.5s');
      expect(formatDuration(30000)).toBe('30.0s');
    });

    it('should format minutes correctly', () => {
      expect(formatDuration(60000)).toBe('1m 0s');
      expect(formatDuration(90000)).toBe('1m 30s');
      expect(formatDuration(120000)).toBe('2m 0s');
    });

    it('should format hours correctly', () => {
      expect(formatDuration(3600000)).toBe('1h 0m');
      expect(formatDuration(3660000)).toBe('1h 1m');
      expect(formatDuration(7200000)).toBe('2h 0m');
    });

    it('should handle zero duration', () => {
      expect(formatDuration(0)).toBe('0ms');
    });

    it('should handle negative durations', () => {
      expect(formatDuration(-1000)).toBe('0ms');
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(512)).toBe('512 B');
      expect(formatFileSize(1023)).toBe('1023 B');
    });

    it('should format kilobytes correctly', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1024 * 1024 - 1)).toBe('1024.0 KB');
    });

    it('should format megabytes correctly', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
      expect(formatFileSize(1024 * 1024 * 1.5)).toBe('1.5 MB');
    });

    it('should format gigabytes correctly', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.0 GB');
      expect(formatFileSize(1024 * 1024 * 1024 * 2.5)).toBe('2.5 GB');
    });

    it('should handle negative sizes', () => {
      expect(formatFileSize(-1024)).toBe('0 B');
    });
  });

  describe('sanitizeFilename', () => {
    it('should remove illegal characters', () => {
      expect(sanitizeFilename('file<>:"/\\|?*.txt')).toBe('file.txt');
    });

    it('should replace spaces with underscores', () => {
      expect(sanitizeFilename('my file name.txt')).toBe('my_file_name.txt');
    });

    it('should handle special cases', () => {
      expect(sanitizeFilename('CON')).toBe('CON_');
      expect(sanitizeFilename('PRN')).toBe('PRN_');
      expect(sanitizeFilename('AUX')).toBe('AUX_');
    });

    it('should truncate long filenames', () => {
      const longName = 'a'.repeat(300);
      const result = sanitizeFilename(longName);
      expect(result.length).toBeLessThanOrEqual(255);
    });

    it('should handle empty strings', () => {
      expect(sanitizeFilename('')).toBe('unnamed');
      expect(sanitizeFilename('   ')).toBe('unnamed');
    });

    it('should preserve file extensions', () => {
      expect(sanitizeFilename('my file.txt')).toBe('my_file.txt');
      expect(sanitizeFilename('archive.tar.gz')).toBe('archive.tar.gz');
    });
  });

  describe('validateProjectId', () => {
    it('should validate correct project IDs', () => {
      expect(validateProjectId('my-project-123')).toBe(true);
      expect(validateProjectId('test-project')).toBe(true);
      expect(validateProjectId('project123')).toBe(true);
    });

    it('should reject invalid project IDs', () => {
      expect(validateProjectId('')).toBe(false);
      expect(validateProjectId('my_project')).toBe(false); // Underscores not allowed
      expect(validateProjectId('my project')).toBe(false); // Spaces not allowed
      expect(validateProjectId('My-Project')).toBe(false); // Uppercase not allowed
    });

    it('should check project ID length', () => {
      expect(validateProjectId('a')).toBe(false); // Too short
      expect(validateProjectId('a'.repeat(31))).toBe(false); // Too long
      expect(validateProjectId('a'.repeat(6))).toBe(true); // Valid length
    });

    it('should reject project IDs starting with numbers', () => {
      expect(validateProjectId('123-project')).toBe(false);
      expect(validateProjectId('1project')).toBe(false);
    });

    it('should handle null and undefined', () => {
      expect(validateProjectId(null as any)).toBe(false);
      expect(validateProjectId(undefined as any)).toBe(false);
    });
  });

  describe('parseCommandLine', () => {
    it('should parse simple commands', () => {
      const result = parseCommandLine('ls -la');
      expect(result).toEqual(['ls', '-la']);
    });

    it('should handle quoted arguments', () => {
      const result = parseCommandLine('echo "hello world"');
      expect(result).toEqual(['echo', 'hello world']);
    });

    it('should handle single quotes', () => {
      const result = parseCommandLine("echo 'hello world'");
      expect(result).toEqual(['echo', 'hello world']);
    });

    it('should handle mixed quotes', () => {
      const result = parseCommandLine('command "arg with spaces" \'another arg\'');
      expect(result).toEqual(['command', 'arg with spaces', 'another arg']);
    });

    it('should handle escaped characters', () => {
      const result = parseCommandLine('echo "hello \\"world\\""');
      expect(result).toEqual(['echo', 'hello "world"']);
    });

    it('should handle empty strings', () => {
      expect(parseCommandLine('')).toEqual([]);
      expect(parseCommandLine('   ')).toEqual([]);
    });

    it('should handle complex commands', () => {
      const result = parseCommandLine('git commit -m "Initial commit" --author="John Doe <john@example.com>"');
      expect(result).toEqual(['git', 'commit', '-m', 'Initial commit', '--author=John Doe <john@example.com>']);
    });
  });

  describe('debounce', () => {
    it('should delay function execution', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledOnce();
    });

    it('should cancel previous calls', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledOnce();
    });

    it('should pass arguments correctly', () => {
      const fn = vi.fn();
      const debouncedFn = debounce(fn, 100);

      debouncedFn('arg1', 'arg2');
      vi.advanceTimersByTime(100);

      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should preserve this context', () => {
      const obj = {
        value: 42,
        method: function(this: any) {
          return this.value;
        }
      };

      const debouncedMethod = debounce(obj.method, 100);
      const result = debouncedMethod.call(obj);

      vi.advanceTimersByTime(100);
      expect(result).toBe(42);
    });
  });

  describe('throttle', () => {
    it('should limit function execution rate', () => {
      const fn = vi.fn();
      const throttledFn = throttle(fn, 100);

      throttledFn();
      throttledFn();
      throttledFn();

      expect(fn).toHaveBeenCalledOnce();

      vi.advanceTimersByTime(100);
      throttledFn();

      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should execute immediately on first call', () => {
      const fn = vi.fn();
      const throttledFn = throttle(fn, 100);

      throttledFn();
      expect(fn).toHaveBeenCalledOnce();
    });

    it('should pass latest arguments', () => {
      const fn = vi.fn();
      const throttledFn = throttle(fn, 100);

      throttledFn('first');
      throttledFn('second');
      throttledFn('third');

      expect(fn).toHaveBeenCalledWith('first');

      vi.advanceTimersByTime(100);
      throttledFn('fourth');

      expect(fn).toHaveBeenCalledWith('fourth');
    });
  });

  describe('retry', () => {
    it('should retry failed operations', async () => {
      let callCount = 0;
      const fn = vi.fn(async () => {
        callCount++;
        if (callCount < 3) {
          throw new Error('Failed');
        }
        return 'success';
      });

      const result = await retry(fn, { maxAttempts: 3, delay: 10 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should fail after max attempts', async () => {
      const fn = vi.fn(async () => {
        throw new Error('Always fails');
      });

      await expect(retry(fn, { maxAttempts: 2, delay: 10 })).rejects.toThrow('Always fails');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should respect delay between retries', async () => {
      const fn = vi.fn(async () => {
        throw new Error('Failed');
      });

      const promise = retry(fn, { maxAttempts: 2, delay: 100 });
      
      // Fast forward time to trigger retries
      vi.advanceTimersByTime(100);
      
      await expect(promise).rejects.toThrow();
    });

    it('should use exponential backoff', async () => {
      const delays: number[] = [];
      const originalSetTimeout = setTimeout;
      
      vi.stubGlobal('setTimeout', (fn: () => void, delay: number) => {
        delays.push(delay);
        return originalSetTimeout(fn, 0);
      });

      const fn = vi.fn(async () => {
        throw new Error('Failed');
      });

      await expect(retry(fn, { 
        maxAttempts: 3, 
        delay: 100, 
        exponentialBackoff: true 
      })).rejects.toThrow();

      expect(delays).toEqual([100, 200]);
    });
  });

  describe('createLogger', () => {
    it('should create logger with specified level', () => {
      const logger = createLogger(LogLevel.INFO);
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should respect log level filtering', () => {
      const mockConsole = {
        log: vi.fn(),
        error: vi.fn(),
        warn: vi.fn()
      };
      
      vi.stubGlobal('console', mockConsole);

      const logger = createLogger(LogLevel.WARN);
      
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(mockConsole.log).not.toHaveBeenCalled(); // debug/info filtered out
      expect(mockConsole.warn).toHaveBeenCalledWith('warn message');
      expect(mockConsole.error).toHaveBeenCalledWith('error message');
    });

    it('should format log messages with timestamp', () => {
      const mockConsole = { log: vi.fn() };
      vi.stubGlobal('console', mockConsole);

      const logger = createLogger(LogLevel.INFO);
      logger.info('test message');

      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] INFO: test message/)
      );
    });
  });
});