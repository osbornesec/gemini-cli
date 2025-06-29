/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  loadSettings, 
  saveSettings, 
  validateSettings,
  getDefaultSettings,
  LoadedSettings,
  Settings 
} from './settings.js';
import * as fs from 'fs/promises';
import * as os from 'os';

vi.mock('fs/promises');
vi.mock('os');

describe('settings configuration', () => {
  const mockFs = vi.mocked(fs);
  const mockOs = vi.mocked(os);

  beforeEach(() => {
    vi.clearAllMocks();
    mockOs.homedir.mockReturnValue('/mock/home');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getDefaultSettings', () => {
    it('should return valid default settings', () => {
      const defaults = getDefaultSettings();
      
      expect(defaults).toBeDefined();
      expect(defaults.model).toBeDefined();
      expect(defaults.authMethod).toBeDefined();
      expect(defaults.apiKey).toBe('');
      expect(typeof defaults.autoAccept).toBe('boolean');
    });

    it('should have consistent default values', () => {
      const defaults1 = getDefaultSettings();
      const defaults2 = getDefaultSettings();
      
      expect(defaults1).toEqual(defaults2);
    });
  });

  describe('loadSettings', () => {
    const mockSettingsPath = '/mock/home/.gemini-cli/settings.json';

    it('should load existing settings successfully', async () => {
      const mockSettings: Settings = {
        model: 'gemini-2.5-pro',
        authMethod: 'oauth2',
        apiKey: '',
        autoAccept: false,
        projectId: 'test-project',
        maxTokens: 1000
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockSettings));

      const result = await loadSettings();

      expect(result.success).toBe(true);
      expect(result.settings).toEqual(mockSettings);
      expect(mockFs.readFile).toHaveBeenCalledWith(mockSettingsPath, 'utf-8');
    });

    it('should create default settings when file does not exist', async () => {
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' });
      mockFs.mkdir.mockResolvedValue();
      mockFs.writeFile.mockResolvedValue();

      const result = await loadSettings();

      expect(result.success).toBe(true);
      expect(result.settings).toEqual(getDefaultSettings());
      expect(mockFs.mkdir).toHaveBeenCalledWith('/mock/home/.gemini-cli', { recursive: true });
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should handle malformed JSON gracefully', async () => {
      mockFs.readFile.mockResolvedValue('{ invalid json }');
      mockFs.mkdir.mockResolvedValue();
      mockFs.writeFile.mockResolvedValue();

      const result = await loadSettings();

      expect(result.success).toBe(true);
      expect(result.settings).toEqual(getDefaultSettings());
    });

    it('should validate and sanitize loaded settings', async () => {
      const invalidSettings = {
        model: 'invalid-model',
        authMethod: 'invalid-auth',
        apiKey: 123,
        autoAccept: 'not-boolean',
        projectId: '',
        maxTokens: -1
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(invalidSettings));

      const result = await loadSettings();

      expect(result.success).toBe(true);
      expect(result.settings.model).toBe(getDefaultSettings().model);
      expect(result.settings.authMethod).toBe(getDefaultSettings().authMethod);
      expect(typeof result.settings.autoAccept).toBe('boolean');
    });

    it('should handle permission errors', async () => {
      mockFs.readFile.mockRejectedValue({ code: 'EACCES' });

      const result = await loadSettings();

      expect(result.success).toBe(false);
      expect(result.error).toContain('permission');
    });

    it('should merge partial settings with defaults', async () => {
      const partialSettings = {
        model: 'gemini-2.5-flash',
        autoAccept: true
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(partialSettings));

      const result = await loadSettings();

      expect(result.success).toBe(true);
      expect(result.settings.model).toBe('gemini-2.5-flash');
      expect(result.settings.autoAccept).toBe(true);
      expect(result.settings.authMethod).toBe(getDefaultSettings().authMethod);
    });
  });

  describe('saveSettings', () => {
    const mockSettingsPath = '/mock/home/.gemini-cli/settings.json';

    beforeEach(() => {
      mockFs.mkdir.mockResolvedValue();
      mockFs.writeFile.mockResolvedValue();
    });

    it('should save valid settings successfully', async () => {
      const settings: Settings = {
        model: 'gemini-2.5-pro',
        authMethod: 'oauth2',
        apiKey: '',
        autoAccept: false,
        projectId: 'my-project',
        maxTokens: 2000
      };

      const result = await saveSettings(settings);

      expect(result.success).toBe(true);
      expect(mockFs.mkdir).toHaveBeenCalledWith('/mock/home/.gemini-cli', { recursive: true });
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        mockSettingsPath,
        JSON.stringify(settings, null, 2),
        'utf-8'
      );
    });

    it('should validate settings before saving', async () => {
      const invalidSettings = {
        model: '',
        authMethod: 'invalid',
        apiKey: 123,
      } as any;

      const result = await saveSettings(invalidSettings);

      expect(result.success).toBe(false);
      expect(result.error).toContain('validation');
    });

    it('should handle file system errors', async () => {
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'));

      const settings = getDefaultSettings();
      const result = await saveSettings(settings);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Permission denied');
    });

    it('should handle disk full errors', async () => {
      mockFs.writeFile.mockRejectedValue({ code: 'ENOSPC' });

      const settings = getDefaultSettings();
      const result = await saveSettings(settings);

      expect(result.success).toBe(false);
      expect(result.error).toContain('ENOSPC');
    });
  });

  describe('validateSettings', () => {
    it('should validate correct settings', () => {
      const validSettings: Settings = {
        model: 'gemini-2.5-pro',
        authMethod: 'oauth2',
        apiKey: '',
        autoAccept: false,
        projectId: 'valid-project',
        maxTokens: 1000
      };

      const result = validateSettings(validSettings);
      expect(result).toBeNull();
    });

    it('should reject invalid model', () => {
      const settings = { ...getDefaultSettings(), model: 'invalid-model' };
      const result = validateSettings(settings);
      expect(result).toContain('Invalid model');
    });

    it('should reject invalid auth method', () => {
      const settings = { ...getDefaultSettings(), authMethod: 'invalid' as any };
      const result = validateSettings(settings);
      expect(result).toContain('Invalid auth method');
    });

    it('should validate API key format when using apikey method', () => {
      const settings = { 
        ...getDefaultSettings(), 
        authMethod: 'apikey' as const,
        apiKey: 'invalid-key'
      };
      const result = validateSettings(settings);
      expect(result).toContain('Invalid API key');
    });

    it('should validate project ID format', () => {
      const settings = { ...getDefaultSettings(), projectId: 'invalid project id!' };
      const result = validateSettings(settings);
      expect(result).toContain('Invalid project ID');
    });

    it('should validate maxTokens range', () => {
      const settingsNegative = { ...getDefaultSettings(), maxTokens: -1 };
      const settingsZero = { ...getDefaultSettings(), maxTokens: 0 };
      const settingsTooHigh = { ...getDefaultSettings(), maxTokens: 1000000 };

      expect(validateSettings(settingsNegative)).toContain('maxTokens must be positive');
      expect(validateSettings(settingsZero)).toContain('maxTokens must be positive');
      expect(validateSettings(settingsTooHigh)).toContain('maxTokens too high');
    });

    it('should handle null and undefined settings', () => {
      expect(validateSettings(null as any)).toContain('Settings object is required');
      expect(validateSettings(undefined as any)).toContain('Settings object is required');
    });
  });

  describe('integration tests', () => {
    it('should handle complete settings lifecycle', async () => {
      // Load non-existent settings (creates defaults)
      mockFs.readFile.mockRejectedValueOnce({ code: 'ENOENT' });
      mockFs.mkdir.mockResolvedValue();
      mockFs.writeFile.mockResolvedValue();

      const loadResult = await loadSettings();
      expect(loadResult.success).toBe(true);

      // Modify settings
      const modifiedSettings = {
        ...loadResult.settings,
        model: 'gemini-2.5-flash',
        autoAccept: true
      };

      // Save modified settings
      const saveResult = await saveSettings(modifiedSettings);
      expect(saveResult.success).toBe(true);

      // Load saved settings
      mockFs.readFile.mockResolvedValue(JSON.stringify(modifiedSettings));
      const reloadResult = await loadSettings();
      
      expect(reloadResult.success).toBe(true);
      expect(reloadResult.settings).toEqual(modifiedSettings);
    });

    it('should handle settings migration from old format', async () => {
      const oldFormatSettings = {
        geminiModel: 'gemini-1.5-pro',
        authType: 'oauth',
        autoApprove: false
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(oldFormatSettings));
      mockFs.mkdir.mockResolvedValue();
      mockFs.writeFile.mockResolvedValue();

      const result = await loadSettings();

      // Should fallback to defaults for unknown format
      expect(result.success).toBe(true);
      expect(result.settings).toEqual(getDefaultSettings());
    });
  });

  describe('edge cases', () => {
    it('should handle very large settings files', async () => {
      const largeSettings = {
        ...getDefaultSettings(),
        largeProperty: 'x'.repeat(100000)
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(largeSettings));

      const result = await loadSettings();
      expect(result.success).toBe(true);
    });

    it('should handle concurrent access to settings', async () => {
      const settings1 = { ...getDefaultSettings(), model: 'gemini-2.5-pro' };
      const settings2 = { ...getDefaultSettings(), model: 'gemini-2.5-flash' };

      mockFs.mkdir.mockResolvedValue();
      mockFs.writeFile.mockResolvedValue();

      const promise1 = saveSettings(settings1);
      const promise2 = saveSettings(settings2);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });

    it('should preserve additional properties in settings', async () => {
      const settingsWithExtra = {
        ...getDefaultSettings(),
        customProperty: 'value',
        nestedObject: { key: 'value' }
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(settingsWithExtra));

      const result = await loadSettings();

      expect(result.success).toBe(true);
      expect((result.settings as any).customProperty).toBe('value');
      expect((result.settings as any).nestedObject).toEqual({ key: 'value' });
    });
  });
});
