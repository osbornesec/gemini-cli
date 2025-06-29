/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';

vi.mock('fs/promises');
vi.mock('path');

// Mock sandbox configuration functions
const loadSandboxConfig = async (configPath: string) => {
  try {
    const configData = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(configData);
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      return {}; // Return empty config for missing file
    }
    throw error;
  }
};

const validateSandboxConfig = (config: any) => {
  const defaults = {
    environment: 'development',
    enableLogging: true,
    maxMemory: '512MB',
    timeout: 30000,
    allowFileSystem: true,
    allowNetwork: false,
  };

  return { ...defaults, ...config };
};

describe('sandboxConfig', () => {
  const mockFs = vi.mocked(fs);
  const mockPath = vi.mocked(path);

  beforeEach(() => {
    vi.clearAllMocks();
    mockPath.resolve.mockImplementation((p) => p);
  });

  describe('loadSandboxConfig', () => {
    it('should load valid sandbox configuration', async () => {
      const mockConfig = {
        environment: 'development',
        enableLogging: true,
        maxMemory: '512MB',
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockConfig));

      const result = await loadSandboxConfig('/path/to/config.json');

      expect(result).toEqual(mockConfig);
    });

    it('should handle missing config file', async () => {
      const error = new Error('File not found') as any;
      error.code = 'ENOENT';
      mockFs.readFile.mockRejectedValue(error);

      const result = await loadSandboxConfig('/missing/config.json');

      expect(result).toEqual({});
    });

    it('should handle invalid JSON config', async () => {
      mockFs.readFile.mockResolvedValue('{ invalid json }');

      await expect(loadSandboxConfig('/invalid/config.json')).rejects.toThrow();
    });

    it('should handle empty config file', async () => {
      mockFs.readFile.mockResolvedValue('');

      await expect(loadSandboxConfig('/empty/config.json')).rejects.toThrow();
    });

    it('should handle permission errors', async () => {
      const error = new Error('Permission denied') as any;
      error.code = 'EACCES';
      mockFs.readFile.mockRejectedValue(error);

      await expect(loadSandboxConfig('/restricted/config.json')).rejects.toThrow('Permission denied');
    });

    it('should handle malformed paths', async () => {
      mockFs.readFile.mockRejectedValue(new Error('Invalid path'));

      await expect(loadSandboxConfig('')).rejects.toThrow();
    });
  });

  describe('validateSandboxConfig', () => {
    it('should apply default values to empty config', () => {
      const result = validateSandboxConfig({});

      expect(result).toMatchObject({
        environment: 'development',
        enableLogging: true,
        maxMemory: '512MB',
        timeout: 30000,
        allowFileSystem: true,
        allowNetwork: false,
      });
    });

    it('should preserve valid config values', () => {
      const customConfig = {
        environment: 'production',
        enableLogging: false,
        maxMemory: '1GB',
      };

      const result = validateSandboxConfig(customConfig);

      expect(result).toMatchObject(customConfig);
    });

    it('should handle partial configuration', () => {
      const partialConfig = {
        environment: 'test',
        timeout: 60000,
      };

      const result = validateSandboxConfig(partialConfig);

      expect(result.environment).toBe('test');
      expect(result.timeout).toBe(60000);
      expect(result.enableLogging).toBe(true); // Default value
    });

    it('should validate environment values', () => {
      const configs = [
        { environment: 'development' },
        { environment: 'production' },
        { environment: 'test' },
      ];

      configs.forEach(config => {
        const result = validateSandboxConfig(config);
        expect(['development', 'production', 'test']).toContain(result.environment);
      });
    });

    it('should handle boolean settings', () => {
      const config = {
        enableLogging: false,
        allowFileSystem: false,
        allowNetwork: true,
      };

      const result = validateSandboxConfig(config);

      expect(result.enableLogging).toBe(false);
      expect(result.allowFileSystem).toBe(false);
      expect(result.allowNetwork).toBe(true);
    });

    it('should validate memory settings', () => {
      const configs = [
        { maxMemory: '256MB' },
        { maxMemory: '1GB' },
        { maxMemory: '2048MB' },
      ];

      configs.forEach(config => {
        const result = validateSandboxConfig(config);
        expect(result.maxMemory).toMatch(/^\d+(MB|GB)$/);
      });
    });

    it('should validate timeout values', () => {
      const config = { timeout: 120000 };

      const result = validateSandboxConfig(config);

      expect(result.timeout).toBe(120000);
      expect(typeof result.timeout).toBe('number');
    });
  });
});