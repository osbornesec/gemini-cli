/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  ApprovalMode,
  ToolResult,
  Tool,
  GeminiModel,
  AuthMethod,
  ConfigurationError,
  AuthenticationError,
  ToolExecutionError,
  isValidToolResult,
  isValidModel,
  isValidAuthMethod,
  createToolResult
} from './types.js';

describe('Core types', () => {
  describe('ApprovalMode enum', () => {
    it('should have AUTO mode', () => {
      expect(ApprovalMode.AUTO).toBe('auto');
    });

    it('should have MANUAL mode', () => {
      expect(ApprovalMode.MANUAL).toBe('manual');
    });

    it('should have valid enum values', () => {
      const modes = Object.values(ApprovalMode);
      expect(modes).toContain('auto');
      expect(modes).toContain('manual');
      expect(modes.length).toBe(2);
    });
  });

  describe('GeminiModel type', () => {
    it('should validate gemini-2.5-pro model', () => {
      expect(isValidModel('gemini-2.5-pro')).toBe(true);
    });

    it('should validate gemini-2.5-flash model', () => {
      expect(isValidModel('gemini-2.5-flash')).toBe(true);
    });

    it('should validate gemini-1.5-pro model', () => {
      expect(isValidModel('gemini-1.5-pro')).toBe(true);
    });

    it('should reject invalid models', () => {
      expect(isValidModel('invalid-model')).toBe(false);
      expect(isValidModel('')).toBe(false);
      expect(isValidModel('gpt-4')).toBe(false);
    });

    it('should handle case sensitivity', () => {
      expect(isValidModel('GEMINI-2.5-PRO')).toBe(false);
      expect(isValidModel('Gemini-2.5-Pro')).toBe(false);
    });
  });

  describe('AuthMethod type', () => {
    it('should validate oauth2 method', () => {
      expect(isValidAuthMethod('oauth2')).toBe(true);
    });

    it('should validate apikey method', () => {
      expect(isValidAuthMethod('apikey')).toBe(true);
    });

    it('should reject invalid auth methods', () => {
      expect(isValidAuthMethod('invalid')).toBe(false);
      expect(isValidAuthMethod('')).toBe(false);
      expect(isValidAuthMethod('bearer')).toBe(false);
    });

    it('should handle case sensitivity', () => {
      expect(isValidAuthMethod('OAuth2')).toBe(false);
      expect(isValidAuthMethod('APIKEY')).toBe(false);
    });
  });

  describe('ToolResult interface', () => {
    it('should validate complete tool result', () => {
      const validResult: ToolResult = {
        success: true,
        output: 'Command executed successfully',
        error: null,
        metadata: { duration: 1000 }
      };

      expect(isValidToolResult(validResult)).toBe(true);
    });

    it('should validate minimal tool result', () => {
      const minimalResult: ToolResult = {
        success: false,
        output: '',
        error: 'Execution failed'
      };

      expect(isValidToolResult(minimalResult)).toBe(true);
    });

    it('should reject invalid tool results', () => {
      expect(isValidToolResult(null)).toBe(false);
      expect(isValidToolResult(undefined)).toBe(false);
      expect(isValidToolResult({})).toBe(false);
      expect(isValidToolResult({ success: true })).toBe(false);
    });

    it('should validate tool result with error', () => {
      const errorResult: ToolResult = {
        success: false,
        output: '',
        error: 'Something went wrong',
        metadata: { errorCode: 'EXEC_FAILED' }
      };

      expect(isValidToolResult(errorResult)).toBe(true);
      expect(errorResult.success).toBe(false);
      expect(errorResult.error).toBeDefined();
    });
  });

  describe('Tool interface', () => {
    it('should define required tool properties', () => {
      const mockTool: Tool = {
        name: 'test-tool',
        description: 'A test tool',
        parameters: {
          type: 'object',
          properties: {
            input: { type: 'string' }
          },
          required: ['input']
        },
        execute: async (params: any) => ({
          success: true,
          output: 'Test output'
        })
      };

      expect(mockTool.name).toBe('test-tool');
      expect(mockTool.description).toBe('A test tool');
      expect(mockTool.parameters).toBeDefined();
      expect(typeof mockTool.execute).toBe('function');
    });

    it('should support optional tool properties', () => {
      const toolWithOptionals: Tool = {
        name: 'advanced-tool',
        description: 'An advanced tool',
        parameters: {
          type: 'object',
          properties: {}
        },
        execute: async () => ({ success: true, output: '' }),
        category: 'utility',
        version: '1.0.0',
        timeout: 30000
      };

      expect(toolWithOptionals.category).toBe('utility');
      expect(toolWithOptionals.version).toBe('1.0.0');
      expect(toolWithOptionals.timeout).toBe(30000);
    });
  });

  describe('Error classes', () => {
    describe('ConfigurationError', () => {
      it('should create configuration error with message', () => {
        const error = new ConfigurationError('Invalid configuration');
        
        expect(error.name).toBe('ConfigurationError');
        expect(error.message).toBe('Invalid configuration');
        expect(error instanceof Error).toBe(true);
      });

      it('should support error cause', () => {
        const cause = new Error('Root cause');
        const error = new ConfigurationError('Config failed', { cause });
        
        expect(error.cause).toBe(cause);
      });
    });

    describe('AuthenticationError', () => {
      it('should create authentication error with message', () => {
        const error = new AuthenticationError('Login failed');
        
        expect(error.name).toBe('AuthenticationError');
        expect(error.message).toBe('Login failed');
        expect(error instanceof Error).toBe(true);
      });

      it('should support additional error data', () => {
        const error = new AuthenticationError('OAuth failed', { 
          code: 'OAUTH_ERROR',
          statusCode: 401 
        });
        
        expect(error.message).toBe('OAuth failed');
      });
    });

    describe('ToolExecutionError', () => {
      it('should create tool execution error with message', () => {
        const error = new ToolExecutionError('Tool failed');
        
        expect(error.name).toBe('ToolExecutionError');
        expect(error.message).toBe('Tool failed');
        expect(error instanceof Error).toBe(true);
      });

      it('should support tool context', () => {
        const error = new ToolExecutionError('Execution failed', {
          toolName: 'ls',
          parameters: { path: '/invalid' }
        });
        
        expect(error.message).toBe('Execution failed');
      });
    });
  });

  describe('utility functions', () => {
    describe('createToolResult', () => {
      it('should create successful tool result', () => {
        const result = createToolResult(true, 'Success output');
        
        expect(result.success).toBe(true);
        expect(result.output).toBe('Success output');
        expect(result.error).toBeNull();
      });

      it('should create failed tool result', () => {
        const result = createToolResult(false, '', 'Error message');
        
        expect(result.success).toBe(false);
        expect(result.output).toBe('');
        expect(result.error).toBe('Error message');
      });

      it('should include metadata when provided', () => {
        const metadata = { duration: 1500, exitCode: 0 };
        const result = createToolResult(true, 'Output', null, metadata);
        
        expect(result.metadata).toEqual(metadata);
      });

      it('should handle default parameters', () => {
        const result = createToolResult(true, 'Output');
        
        expect(result.error).toBeNull();
        expect(result.metadata).toBeUndefined();
      });
    });
  });

  describe('type guards and validation', () => {
    it('should validate complex nested objects', () => {
      const complexResult = {
        success: true,
        output: JSON.stringify({ data: [1, 2, 3] }),
        error: null,
        metadata: {
          timestamp: Date.now(),
          source: 'test',
          nested: { deep: { value: true } }
        }
      };

      expect(isValidToolResult(complexResult)).toBe(true);
    });

    it('should handle edge cases in validation', () => {
      // Empty strings should be valid
      expect(isValidToolResult({ success: true, output: '', error: null })).toBe(true);
      
      // Boolean success is required
      expect(isValidToolResult({ success: 'true', output: '', error: null })).toBe(false);
      
      // Output must be string
      expect(isValidToolResult({ success: true, output: 123, error: null })).toBe(false);
    });

    it('should validate model names with version numbers', () => {
      expect(isValidModel('gemini-1.0-pro')).toBe(false); // Old version
      expect(isValidModel('gemini-2.5-pro-experimental')).toBe(false); // Unofficial variant
      expect(isValidModel('gemini-3.0-pro')).toBe(false); // Future version
    });
  });

  describe('type compatibility', () => {
    it('should ensure enum values are assignable to types', () => {
      const mode: ApprovalMode = ApprovalMode.AUTO;
      const modeString: string = mode;
      
      expect(modeString).toBe('auto');
    });

    it('should ensure error types extend Error', () => {
      const configError = new ConfigurationError('test');
      const authError = new AuthenticationError('test');
      const toolError = new ToolExecutionError('test');
      
      expect(configError instanceof Error).toBe(true);
      expect(authError instanceof Error).toBe(true);
      expect(toolError instanceof Error).toBe(true);
    });

    it('should ensure tool results are properly typed', () => {
      const result: ToolResult = createToolResult(true, 'output');
      
      // Should be assignable to ToolResult interface
      const resultCopy: ToolResult = {
        success: result.success,
        output: result.output,
        error: result.error
      };
      
      expect(resultCopy).toEqual({
        success: true,
        output: 'output',
        error: null
      });
    });
  });
});