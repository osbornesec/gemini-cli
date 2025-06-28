/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkForUpdates } from '../updateCheck.js';

// Mock the update-notifier module
vi.mock('update-notifier', () => ({
  default: vi.fn(),
}));

// Mock the getPackageJson function
vi.mock('../../../utils/package.js', () => ({
  getPackageJson: vi.fn(),
}));

describe('updateCheck', () => {
  let updateNotifierMock: any;
  let getPackageJsonMock: any;
  let consoleWarnSpy: any;

  beforeEach(async () => {
    // Reset mocks
    updateNotifierMock = vi.mocked((await import('update-notifier')).default);
    getPackageJsonMock = vi.mocked((await import('../../../utils/package.js')).getPackageJson);
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    consoleWarnSpy.mockRestore();
  });

  describe('checkForUpdates', () => {
    it('should return null when packageJson is null', async () => {
      getPackageJsonMock.mockResolvedValue(null);
      
      const result = await checkForUpdates();
      
      expect(result).toBeNull();
      expect(updateNotifierMock).not.toHaveBeenCalled();
    });

    it('should return null when packageJson has no name', async () => {
      getPackageJsonMock.mockResolvedValue({ version: '1.0.0' });
      
      const result = await checkForUpdates();
      
      expect(result).toBeNull();
      expect(updateNotifierMock).not.toHaveBeenCalled();
    });

    it('should return null when packageJson has no version', async () => {
      getPackageJsonMock.mockResolvedValue({ name: '@google/gemini-cli' });
      
      const result = await checkForUpdates();
      
      expect(result).toBeNull();
      expect(updateNotifierMock).not.toHaveBeenCalled();
    });

    it('should return null when no update is available', async () => {
      getPackageJsonMock.mockResolvedValue({
        name: '@google/gemini-cli',
        version: '1.0.0',
      });

      const notifierInstance = {
        update: null,
      };
      updateNotifierMock.mockReturnValue(notifierInstance);
      
      const result = await checkForUpdates();
      
      expect(result).toBeNull();
      expect(updateNotifierMock).toHaveBeenCalledWith({
        pkg: {
          name: '@google/gemini-cli',
          version: '1.0.0',
        },
        updateCheckInterval: 0,
        shouldNotifyInNpmScript: true,
      });
    });

    it('should return update message when update is available', async () => {
      const packageJson = {
        name: '@google/gemini-cli',
        version: '1.0.0',
      };
      getPackageJsonMock.mockResolvedValue(packageJson);

      const notifierInstance = {
        update: {
          current: '1.0.0',
          latest: '2.0.0',
        },
      };
      updateNotifierMock.mockReturnValue(notifierInstance);
      
      const result = await checkForUpdates();
      
      expect(result).toBe(
        'Gemini CLI update available! 1.0.0 → 2.0.0\n' +
        'Run npm install -g @google/gemini-cli to update'
      );
      expect(updateNotifierMock).toHaveBeenCalledWith({
        pkg: {
          name: '@google/gemini-cli',
          version: '1.0.0',
        },
        updateCheckInterval: 0,
        shouldNotifyInNpmScript: true,
      });
    });

    it('should handle errors gracefully and return null', async () => {
      const error = new Error('Failed to fetch package info');
      getPackageJsonMock.mockRejectedValue(error);
      
      const result = await checkForUpdates();
      
      expect(result).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to check for updates: ' + error);
    });

    it('should handle update-notifier errors', async () => {
      getPackageJsonMock.mockResolvedValue({
        name: '@google/gemini-cli',
        version: '1.0.0',
      });
      
      const error = new Error('Network error');
      updateNotifierMock.mockImplementation(() => {
        throw error;
      });
      
      const result = await checkForUpdates();
      
      expect(result).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to check for updates: ' + error);
    });

    it('should pass correct configuration to update-notifier', async () => {
      const packageJson = {
        name: '@google/gemini-cli',
        version: '1.5.3',
      };
      getPackageJsonMock.mockResolvedValue(packageJson);

      const notifierInstance = {
        update: null,
      };
      updateNotifierMock.mockReturnValue(notifierInstance);
      
      await checkForUpdates();
      
      expect(updateNotifierMock).toHaveBeenCalledWith({
        pkg: {
          name: '@google/gemini-cli',
          version: '1.5.3',
        },
        updateCheckInterval: 0,
        shouldNotifyInNpmScript: true,
      });
    });
  });
});