/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  validateAuthMethod, 
  AuthMethod, 
  isValidApiKey, 
  getAuthConfig,
  saveAuthConfig,
  clearAuthConfig,
  AUTH_METHODS
} from './auth.js';
import * as fs from 'fs/promises';
import * as path from 'path';

vi.mock('fs/promises');
vi.mock('os', () => ({
  homedir: () => '/mock/home'
}));

describe('auth configuration', () => {
  const mockFs = vi.mocked(fs);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('AUTH_METHODS constant', () => {
    it('should export supported auth methods', () => {
      expect(AUTH_METHODS).toBeDefined();
      expect(Array.isArray(AUTH_METHODS)).toBe(true);
      expect(AUTH_METHODS).toContain('oauth2');
      expect(AUTH_METHODS).toContain('apikey');
    });

    it('should have valid auth method values', () => {
      AUTH_METHODS.forEach(method => {
        expect(typeof method).toBe('string');
        expect(method.length).toBeGreaterThan(0);
      });
    });
  });

  describe('AuthMethod enum/type', () => {
    it('should define OAuth2 method', () => {
      expect(AuthMethod.OAUTH2).toBe('oauth2');
    });

    it('should define API Key method', () => {
      expect(AuthMethod.API_KEY).toBe('apikey');
    });
  });

  describe('validateAuthMethod', () => {
    it('should validate oauth2 auth method', () => {
      const result = validateAuthMethod('oauth2');
      expect(result).toBeNull();
    });

    it('should validate apikey auth method', () => {
      const result = validateAuthMethod('apikey');
      expect(result).toBeNull();
    });

    it('should validate using AuthMethod enum', () => {
      expect(validateAuthMethod(AuthMethod.OAUTH2)).toBeNull();
      expect(validateAuthMethod(AuthMethod.API_KEY)).toBeNull();
    });

    it('should reject invalid auth methods', () => {
      const result = validateAuthMethod('invalid-method');
      expect(result).toContain('Invalid auth method');
      expect(result).toContain('oauth2');
      expect(result).toContain('apikey');
    });

    it('should reject empty auth method', () => {
      const result = validateAuthMethod('');
      expect(result).toContain('Auth method is required');
    });

    it('should handle case sensitivity', () => {
      expect(validateAuthMethod('OAuth2')).toContain('Invalid auth method');
      expect(validateAuthMethod('OAUTH2')).toContain('Invalid auth method');
      expect(validateAuthMethod('ApiKey')).toContain('Invalid auth method');
    });

    it('should handle null and undefined values', () => {
      expect(validateAuthMethod(null as any)).toContain('Auth method is required');
      expect(validateAuthMethod(undefined as any)).toContain('Auth method is required');
    });

    it('should handle whitespace-only values', () => {
      expect(validateAuthMethod('   ')).toContain('Auth method is required');
      expect(validateAuthMethod('\t\n')).toContain('Auth method is required');
    });

    it('should handle special characters', () => {
      expect(validateAuthMethod('oauth2!')).toContain('Invalid auth method');
      expect(validateAuthMethod('api-key')).toContain('Invalid auth method');
    });
  });

  describe('isValidApiKey', () => {
    it('should validate properly formatted API keys', () => {
      expect(isValidApiKey('AIza1234567890abcdefghijklmnopqrstuvwxyz')).toBe(true);
      expect(isValidApiKey('AIzaSyDKs1234567890abcdefghijklmnopqrstuvw')).toBe(true);
    });

    it('should reject invalid API key formats', () => {
      expect(isValidApiKey('')).toBe(false);
      expect(isValidApiKey('invalid-key')).toBe(false);
      expect(isValidApiKey('AIza123')).toBe(false); // too short
      expect(isValidApiKey('1234567890abcdefghijklmnopqrstuvwxyz')).toBe(false); // no AIza prefix
    });

    it('should handle null and undefined values', () => {
      expect(isValidApiKey(null as any)).toBe(false);
      expect(isValidApiKey(undefined as any)).toBe(false);
    });

    it('should handle whitespace in API keys', () => {
      expect(isValidApiKey(' AIza1234567890abcdefghijklmnopqrstuvwxyz ')).toBe(false);
      expect(isValidApiKey('AIza1234567890abcdefghijklmno pqrstuvwxyz')).toBe(false);
    });

    it('should validate API key length requirements', () => {
      const validKey = 'AIza' + 'a'.repeat(35); // 39 chars total
      const tooShort = 'AIza' + 'a'.repeat(10);
      const tooLong = 'AIza' + 'a'.repeat(50);

      expect(isValidApiKey(validKey)).toBe(true);
      expect(isValidApiKey(tooShort)).toBe(false);
      expect(isValidApiKey(tooLong)).toBe(false);
    });
  });

  describe('getAuthConfig', () => {
    const mockConfigPath = '/mock/home/.gemini-cli/auth.json';

    it('should load existing auth configuration', async () => {
      const mockConfig = {
        authMethod: 'oauth2',
        apiKey: '',
        refreshToken: 'mock-refresh-token',
        accessToken: 'mock-access-token',
        tokenExpiry: Date.now() + 3600000
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockConfig));

      const result = await getAuthConfig();

      expect(result).toEqual(mockConfig);
      expect(mockFs.readFile).toHaveBeenCalledWith(mockConfigPath, 'utf-8');
    });

    it('should return default config when file does not exist', async () => {
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' });

      const result = await getAuthConfig();

      expect(result).toEqual({
        authMethod: 'oauth2',
        apiKey: '',
        refreshToken: '',
        accessToken: '',
        tokenExpiry: 0
      });
    });

    it('should handle permission errors', async () => {
      mockFs.readFile.mockRejectedValue({ code: 'EACCES' });

      await expect(getAuthConfig()).rejects.toThrow();
    });

    it('should handle malformed JSON gracefully', async () => {
      mockFs.readFile.mockResolvedValue('{ invalid json }');

      const result = await getAuthConfig();

      expect(result).toEqual({
        authMethod: 'oauth2',
        apiKey: '',
        refreshToken: '',
        accessToken: '',
        tokenExpiry: 0
      });
    });

    it('should sanitize invalid auth method in config', async () => {
      const invalidConfig = {
        authMethod: 'invalid-method',
        apiKey: 'test-key'
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(invalidConfig));

      const result = await getAuthConfig();

      expect(result.authMethod).toBe('oauth2'); // Should default to valid method
    });
  });

  describe('saveAuthConfig', () => {
    const mockConfigPath = '/mock/home/.gemini-cli/auth.json';
    const mockConfigDir = '/mock/home/.gemini-cli';

    beforeEach(() => {
      mockFs.mkdir.mockResolvedValue();
      mockFs.writeFile.mockResolvedValue();
    });

    it('should save valid auth configuration', async () => {
      const config = {
        authMethod: 'oauth2' as const,
        apiKey: '',
        refreshToken: 'mock-refresh-token',
        accessToken: 'mock-access-token',
        tokenExpiry: Date.now() + 3600000
      };

      await saveAuthConfig(config);

      expect(mockFs.mkdir).toHaveBeenCalledWith(mockConfigDir, { recursive: true });
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        mockConfigPath,
        JSON.stringify(config, null, 2),
        'utf-8'
      );
    });

    it('should validate auth method before saving', async () => {
      const invalidConfig = {
        authMethod: 'invalid' as any,
        apiKey: 'test-key'
      };

      await expect(saveAuthConfig(invalidConfig)).rejects.toThrow('Invalid auth method');
    });

    it('should validate API key format when using apikey method', async () => {
      const configWithInvalidKey = {
        authMethod: 'apikey' as const,
        apiKey: 'invalid-key',
        refreshToken: '',
        accessToken: '',
        tokenExpiry: 0
      };

      await expect(saveAuthConfig(configWithInvalidKey)).rejects.toThrow('Invalid API key format');
    });

    it('should handle file system errors', async () => {
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'));

      const config = {
        authMethod: 'oauth2' as const,
        apiKey: '',
        refreshToken: '',
        accessToken: '',
        tokenExpiry: 0
      };

      await expect(saveAuthConfig(config)).rejects.toThrow('Permission denied');
    });

    it('should create config directory if it does not exist', async () => {
      const config = {
        authMethod: 'oauth2' as const,
        apiKey: '',
        refreshToken: '',
        accessToken: '',
        tokenExpiry: 0
      };

      await saveAuthConfig(config);

      expect(mockFs.mkdir).toHaveBeenCalledWith(mockConfigDir, { recursive: true });
    });
  });

  describe('clearAuthConfig', () => {
    const mockConfigPath = '/mock/home/.gemini-cli/auth.json';

    it('should delete auth configuration file', async () => {
      mockFs.unlink.mockResolvedValue();

      await clearAuthConfig();

      expect(mockFs.unlink).toHaveBeenCalledWith(mockConfigPath);
    });

    it('should handle missing file gracefully', async () => {
      mockFs.unlink.mockRejectedValue({ code: 'ENOENT' });

      await expect(clearAuthConfig()).resolves.not.toThrow();
    });

    it('should propagate other file system errors', async () => {
      mockFs.unlink.mockRejectedValue(new Error('Permission denied'));

      await expect(clearAuthConfig()).rejects.toThrow('Permission denied');
    });
  });

  describe('integration tests', () => {
    it('should handle complete auth flow for OAuth2', async () => {
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' });
      mockFs.mkdir.mockResolvedValue();
      mockFs.writeFile.mockResolvedValue();

      // Start with no config
      const initialConfig = await getAuthConfig();
      expect(initialConfig.authMethod).toBe('oauth2');

      // Save OAuth2 config
      const oauthConfig = {
        ...initialConfig,
        refreshToken: 'new-refresh-token',
        accessToken: 'new-access-token',
        tokenExpiry: Date.now() + 3600000
      };

      await saveAuthConfig(oauthConfig);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/mock/home/.gemini-cli/auth.json',
        JSON.stringify(oauthConfig, null, 2),
        'utf-8'
      );
    });

    it('should handle complete auth flow for API key', async () => {
      mockFs.readFile.mockRejectedValue({ code: 'ENOENT' });
      mockFs.mkdir.mockResolvedValue();
      mockFs.writeFile.mockResolvedValue();

      const apiKeyConfig = {
        authMethod: 'apikey' as const,
        apiKey: 'AIza1234567890abcdefghijklmnopqrstuvwxyz',
        refreshToken: '',
        accessToken: '',
        tokenExpiry: 0
      };

      await saveAuthConfig(apiKeyConfig);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/mock/home/.gemini-cli/auth.json',
        JSON.stringify(apiKeyConfig, null, 2),
        'utf-8'
      );
    });

    it('should handle auth method switching', async () => {
      mockFs.mkdir.mockResolvedValue();
      mockFs.writeFile.mockResolvedValue();

      // Switch from OAuth2 to API key
      const oauthConfig = {
        authMethod: 'oauth2' as const,
        apiKey: '',
        refreshToken: 'refresh-token',
        accessToken: 'access-token',
        tokenExpiry: Date.now() + 3600000
      };

      await saveAuthConfig(oauthConfig);

      const apiKeyConfig = {
        authMethod: 'apikey' as const,
        apiKey: 'AIza1234567890abcdefghijklmnopqrstuvwxyz',
        refreshToken: '',
        accessToken: '',
        tokenExpiry: 0
      };

      await saveAuthConfig(apiKeyConfig);

      expect(mockFs.writeFile).toHaveBeenCalledTimes(2);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle concurrent access to config file', async () => {
      mockFs.readFile.mockRejectedValue({ code: 'EMFILE' });

      await expect(getAuthConfig()).rejects.toThrow();
    });

    it('should handle disk full errors during save', async () => {
      mockFs.writeFile.mockRejectedValue({ code: 'ENOSPC' });

      const config = {
        authMethod: 'oauth2' as const,
        apiKey: '',
        refreshToken: '',
        accessToken: '',
        tokenExpiry: 0
      };

      await expect(saveAuthConfig(config)).rejects.toThrow();
    });

    it('should validate token expiry values', async () => {
      const configWithInvalidExpiry = {
        authMethod: 'oauth2' as const,
        apiKey: '',
        refreshToken: 'token',
        accessToken: 'token',
        tokenExpiry: -1
      };

      // Should handle negative expiry gracefully
      await expect(saveAuthConfig(configWithInvalidExpiry)).resolves.not.toThrow();
    });

    it('should handle very large config files', async () => {
      const largeConfigData = 'x'.repeat(10000);
      mockFs.readFile.mockResolvedValue(largeConfigData);

      const result = await getAuthConfig();

      // Should fallback to default config for invalid JSON
      expect(result.authMethod).toBe('oauth2');
    });
  });
});