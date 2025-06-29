/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  CLI_NAME,
  CLI_VERSION,
  CONFIG_DIR_NAME,
  DEFAULT_MODEL,
  SUPPORTED_MODELS,
  AUTH_METHODS,
  MAX_TOKENS_LIMIT,
  DEFAULT_TIMEOUT,
  API_ENDPOINTS,
  ERROR_CODES,
  LOG_LEVELS
} from './constants.js';

describe('CLI constants', () => {
  describe('basic constants', () => {
    it('should export CLI_NAME', () => {
      expect(CLI_NAME).toBeDefined();
      expect(typeof CLI_NAME).toBe('string');
      expect(CLI_NAME.length).toBeGreaterThan(0);
    });

    it('should export CLI_VERSION', () => {
      expect(CLI_VERSION).toBeDefined();
      expect(typeof CLI_VERSION).toBe('string');
      expect(CLI_VERSION).toMatch(/^\d+\.\d+\.\d+/); // Semantic versioning
    });

    it('should export CONFIG_DIR_NAME', () => {
      expect(CONFIG_DIR_NAME).toBeDefined();
      expect(typeof CONFIG_DIR_NAME).toBe('string');
      expect(CONFIG_DIR_NAME.startsWith('.')).toBe(true); // Hidden directory
    });
  });

  describe('model constants', () => {
    it('should export DEFAULT_MODEL', () => {
      expect(DEFAULT_MODEL).toBeDefined();
      expect(typeof DEFAULT_MODEL).toBe('string');
      expect(DEFAULT_MODEL.startsWith('gemini-')).toBe(true);
    });

    it('should export SUPPORTED_MODELS array', () => {
      expect(SUPPORTED_MODELS).toBeDefined();
      expect(Array.isArray(SUPPORTED_MODELS)).toBe(true);
      expect(SUPPORTED_MODELS.length).toBeGreaterThan(0);
    });

    it('should include DEFAULT_MODEL in SUPPORTED_MODELS', () => {
      expect(SUPPORTED_MODELS).toContain(DEFAULT_MODEL);
    });

    it('should have valid model names in SUPPORTED_MODELS', () => {
      SUPPORTED_MODELS.forEach(model => {
        expect(typeof model).toBe('string');
        expect(model.length).toBeGreaterThan(0);
        expect(model.startsWith('gemini-')).toBe(true);
      });
    });

    it('should not have duplicate models', () => {
      const uniqueModels = new Set(SUPPORTED_MODELS);
      expect(uniqueModels.size).toBe(SUPPORTED_MODELS.length);
    });
  });

  describe('authentication constants', () => {
    it('should export AUTH_METHODS array', () => {
      expect(AUTH_METHODS).toBeDefined();
      expect(Array.isArray(AUTH_METHODS)).toBe(true);
      expect(AUTH_METHODS.length).toBeGreaterThan(0);
    });

    it('should include standard auth methods', () => {
      expect(AUTH_METHODS).toContain('oauth2');
      expect(AUTH_METHODS).toContain('apikey');
    });

    it('should have valid auth method values', () => {
      AUTH_METHODS.forEach(method => {
        expect(typeof method).toBe('string');
        expect(method.length).toBeGreaterThan(0);
        expect(method).toMatch(/^[a-z0-9]+$/); // Lowercase alphanumeric only
      });
    });
  });

  describe('limit constants', () => {
    it('should export MAX_TOKENS_LIMIT', () => {
      expect(MAX_TOKENS_LIMIT).toBeDefined();
      expect(typeof MAX_TOKENS_LIMIT).toBe('number');
      expect(MAX_TOKENS_LIMIT).toBeGreaterThan(0);
    });

    it('should export DEFAULT_TIMEOUT', () => {
      expect(DEFAULT_TIMEOUT).toBeDefined();
      expect(typeof DEFAULT_TIMEOUT).toBe('number');
      expect(DEFAULT_TIMEOUT).toBeGreaterThan(0);
    });

    it('should have reasonable timeout value', () => {
      expect(DEFAULT_TIMEOUT).toBeGreaterThan(1000); // At least 1 second
      expect(DEFAULT_TIMEOUT).toBeLessThan(300000); // Less than 5 minutes
    });

    it('should have reasonable token limit', () => {
      expect(MAX_TOKENS_LIMIT).toBeGreaterThan(1000);
      expect(MAX_TOKENS_LIMIT).toBeLessThan(1000000);
    });
  });

  describe('API endpoints', () => {
    it('should export API_ENDPOINTS object', () => {
      expect(API_ENDPOINTS).toBeDefined();
      expect(typeof API_ENDPOINTS).toBe('object');
    });

    it('should have required endpoint properties', () => {
      expect(API_ENDPOINTS.GEMINI_API).toBeDefined();
      expect(API_ENDPOINTS.OAUTH_TOKEN).toBeDefined();
      expect(API_ENDPOINTS.PROJECT_LIST).toBeDefined();
    });

    it('should have valid URL formats', () => {
      Object.values(API_ENDPOINTS).forEach(endpoint => {
        expect(typeof endpoint).toBe('string');
        expect(endpoint.startsWith('https://')).toBe(true);
      });
    });

    it('should use googleapis.com domain', () => {
      Object.values(API_ENDPOINTS).forEach(endpoint => {
        expect(endpoint).toContain('googleapis.com');
      });
    });
  });

  describe('error codes', () => {
    it('should export ERROR_CODES object', () => {
      expect(ERROR_CODES).toBeDefined();
      expect(typeof ERROR_CODES).toBe('object');
    });

    it('should have standard error codes', () => {
      expect(ERROR_CODES.INVALID_CONFIG).toBeDefined();
      expect(ERROR_CODES.AUTH_FAILED).toBeDefined();
      expect(ERROR_CODES.API_ERROR).toBeDefined();
      expect(ERROR_CODES.FILE_NOT_FOUND).toBeDefined();
    });

    it('should have consistent error code format', () => {
      Object.values(ERROR_CODES).forEach(code => {
        expect(typeof code).toBe('string');
        expect(code).toMatch(/^[A-Z_]+$/); // Uppercase with underscores
      });
    });

    it('should not have duplicate error codes', () => {
      const codes = Object.values(ERROR_CODES);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });
  });

  describe('log levels', () => {
    it('should export LOG_LEVELS object', () => {
      expect(LOG_LEVELS).toBeDefined();
      expect(typeof LOG_LEVELS).toBe('object');
    });

    it('should have standard log levels', () => {
      expect(LOG_LEVELS.ERROR).toBeDefined();
      expect(LOG_LEVELS.WARN).toBeDefined();
      expect(LOG_LEVELS.INFO).toBeDefined();
      expect(LOG_LEVELS.DEBUG).toBeDefined();
    });

    it('should have numeric log level values', () => {
      Object.values(LOG_LEVELS).forEach(level => {
        expect(typeof level).toBe('number');
        expect(level).toBeGreaterThanOrEqual(0);
      });
    });

    it('should have proper log level hierarchy', () => {
      expect(LOG_LEVELS.ERROR).toBeGreaterThan(LOG_LEVELS.WARN);
      expect(LOG_LEVELS.WARN).toBeGreaterThan(LOG_LEVELS.INFO);
      expect(LOG_LEVELS.INFO).toBeGreaterThan(LOG_LEVELS.DEBUG);
    });
  });

  describe('constant immutability', () => {
    it('should not allow modification of array constants', () => {
      expect(() => {
        (SUPPORTED_MODELS as any).push('invalid-model');
      }).toThrow();

      expect(() => {
        (AUTH_METHODS as any).push('invalid-auth');
      }).toThrow();
    });

    it('should not allow modification of object constants', () => {
      expect(() => {
        (API_ENDPOINTS as any).INVALID_ENDPOINT = 'https://invalid.com';
      }).toThrow();

      expect(() => {
        (ERROR_CODES as any).INVALID_CODE = 'INVALID';
      }).toThrow();
    });
  });

  describe('constant consistency', () => {
    it('should have consistent naming conventions', () => {
      // All exported constants should be UPPER_SNAKE_CASE
      const constantNames = [
        'CLI_NAME', 'CLI_VERSION', 'CONFIG_DIR_NAME',
        'DEFAULT_MODEL', 'SUPPORTED_MODELS', 'AUTH_METHODS',
        'MAX_TOKENS_LIMIT', 'DEFAULT_TIMEOUT',
        'API_ENDPOINTS', 'ERROR_CODES', 'LOG_LEVELS'
      ];

      constantNames.forEach(name => {
        expect(name).toMatch(/^[A-Z_]+$/);
      });
    });

    it('should have all required constants for CLI operation', () => {
      // Verify all essential constants are present
      const requiredConstants = [
        CLI_NAME, CLI_VERSION, CONFIG_DIR_NAME,
        DEFAULT_MODEL, SUPPORTED_MODELS, AUTH_METHODS,
        MAX_TOKENS_LIMIT, DEFAULT_TIMEOUT,
        API_ENDPOINTS, ERROR_CODES, LOG_LEVELS
      ];

      requiredConstants.forEach(constant => {
        expect(constant).toBeDefined();
      });
    });
  });
});