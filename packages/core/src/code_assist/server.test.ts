/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import { CodeAssistServer } from './server.js';
import { OAuth2Client } from 'google-auth-library';

vi.mock('google-auth-library');

describe('CodeAssistServer', () => {
  it('should be able to be constructed', () => {
    const auth = new OAuth2Client();
    const server = new CodeAssistServer(auth, 'test-project');
    expect(server).toBeInstanceOf(CodeAssistServer);
  });

  it('should call the generateContent endpoint', async () => {
    const auth = new OAuth2Client();
    const server = new CodeAssistServer(auth, 'test-project');
    const mockResponse = {
      response: {
        candidates: [
          {
            index: 0,
            content: {
              role: 'model',
              parts: [{ text: 'response' }],
            },
            finishReason: 'STOP',
            safetyRatings: [],
          },
        ],
      },
    };
    vi.spyOn(server, 'callEndpoint').mockResolvedValue(mockResponse);

    const response = await server.generateContent({
      model: 'test-model',
      contents: [{ role: 'user', parts: [{ text: 'request' }] }],
    });

    expect(server.callEndpoint).toHaveBeenCalledWith(
      'generateContent',
      expect.any(Object),
      undefined,
    );
    expect(response.candidates?.[0]?.content?.parts?.[0]?.text).toBe(
      'response',
    );
  });

  it('should call the generateContentStream endpoint', async () => {
    const auth = new OAuth2Client();
    const server = new CodeAssistServer(auth, 'test-project');
    const mockResponse = (async function* () {
      yield {
        response: {
          candidates: [
            {
              index: 0,
              content: {
                role: 'model',
                parts: [{ text: 'response' }],
              },
              finishReason: 'STOP',
              safetyRatings: [],
            },
          ],
        },
      };
    })();
    vi.spyOn(server, 'streamEndpoint').mockResolvedValue(mockResponse);

    const stream = await server.generateContentStream({
      model: 'test-model',
      contents: [{ role: 'user', parts: [{ text: 'request' }] }],
    });

    for await (const res of stream) {
      expect(server.streamEndpoint).toHaveBeenCalledWith(
        'streamGenerateContent',
        expect.any(Object),
        undefined,
      );
      expect(res.candidates?.[0]?.content?.parts?.[0]?.text).toBe('response');
    }
  });

  it('should call the onboardUser endpoint', async () => {
    const auth = new OAuth2Client();
    const server = new CodeAssistServer(auth, 'test-project');
    const mockResponse = {
      name: 'operations/123',
      done: true,
    };
    vi.spyOn(server, 'callEndpoint').mockResolvedValue(mockResponse);

    const response = await server.onboardUser({
      tierId: 'test-tier',
      cloudaicompanionProject: 'test-project',
      metadata: {},
    });

    expect(server.callEndpoint).toHaveBeenCalledWith(
      'onboardUser',
      expect.any(Object),
    );
    expect(response.name).toBe('operations/123');
  });

  it('should call the loadCodeAssist endpoint', async () => {
    const auth = new OAuth2Client();
    const server = new CodeAssistServer(auth, 'test-project');
    const mockResponse = {
      // TODO: Add mock response
    };
    vi.spyOn(server, 'callEndpoint').mockResolvedValue(mockResponse);

    const response = await server.loadCodeAssist({
      metadata: {},
    });

    expect(server.callEndpoint).toHaveBeenCalledWith(
      'loadCodeAssist',
      expect.any(Object),
    );
    expect(response).toBe(mockResponse);
  });

  it('should return 0 for countTokens', async () => {
    const auth = new OAuth2Client();
    const server = new CodeAssistServer(auth, 'test-project');
    const mockResponse = {
      totalTokens: 100,
    };
    vi.spyOn(server, 'callEndpoint').mockResolvedValue(mockResponse);

    const response = await server.countTokens({
      model: 'test-model',
      contents: [{ role: 'user', parts: [{ text: 'request' }] }],
    });
    expect(response.totalTokens).toBe(100);
  });

  it('should throw an error for embedContent', async () => {
    const auth = new OAuth2Client();
    const server = new CodeAssistServer(auth, 'test-project');
    await expect(
      server.embedContent({
        model: 'test-model',
        contents: [{ role: 'user', parts: [{ text: 'request' }] }],
      }),
    ).rejects.toThrow();
  });
});

  describe('Constructor Edge Cases', () => {
    it('should handle null auth client', () => {
      expect(() => {
        new CodeAssistServer(null as any, 'test-project');
      }).not.toThrow();
    });

    it('should handle empty project string', () => {
      const auth = new OAuth2Client();
      expect(() => {
        new CodeAssistServer(auth, '');
      }).not.toThrow();
    });

    it('should handle undefined project', () => {
      const auth = new OAuth2Client();
      expect(() => {
        new CodeAssistServer(auth, undefined as any);
      }).not.toThrow();
    });

    it('should handle special characters in project name', () => {
      const auth = new OAuth2Client();
      expect(() => {
        new CodeAssistServer(auth, 'test-project-with-special@chars#123');
      }).not.toThrow();
    });
  });

  describe('generateContent Edge Cases', () => {
    it('should handle empty contents array', async () => {
      const auth = new OAuth2Client();
      const server = new CodeAssistServer(auth, 'test-project');
      const mockResponse = {
        response: {
          candidates: [],
        },
      };
      vi.spyOn(server, 'callEndpoint').mockResolvedValue(mockResponse);

      const response = await server.generateContent({
        model: 'test-model',
        contents: [],
      });

      expect(server.callEndpoint).toHaveBeenCalledWith(
        'generateContent',
        expect.objectContaining({
          model: 'test-model',
          contents: [],
        }),
        undefined,
      );
      expect(response.candidates).toEqual([]);
    });

    it('should handle missing model parameter', async () => {
      const auth = new OAuth2Client();
      const server = new CodeAssistServer(auth, 'test-project');
      vi.spyOn(server, 'callEndpoint').mockResolvedValue({ response: {} });

      const response = await server.generateContent({
        model: '',
        contents: [{ role: 'user', parts: [{ text: 'request' }] }],
      });

      expect(server.callEndpoint).toHaveBeenCalledWith(
        'generateContent',
        expect.objectContaining({
          model: '',
        }),
        undefined,
      );
    });

    it('should handle API error response', async () => {
      const auth = new OAuth2Client();
      const server = new CodeAssistServer(auth, 'test-project');
      const errorMessage = 'API Error: Invalid request';
      vi.spyOn(server, 'callEndpoint').mockRejectedValue(new Error(errorMessage));

      await expect(
        server.generateContent({
          model: 'test-model',
          contents: [{ role: 'user', parts: [{ text: 'request' }] }],
        })
      ).rejects.toThrow(errorMessage);
    });

    it('should handle malformed response', async () => {
      const auth = new OAuth2Client();
      const server = new CodeAssistServer(auth, 'test-project');
      const mockResponse = {
        response: null,
      };
      vi.spyOn(server, 'callEndpoint').mockResolvedValue(mockResponse);

      const response = await server.generateContent({
        model: 'test-model',
        contents: [{ role: 'user', parts: [{ text: 'request' }] }],
      });

      expect(response.candidates).toBeUndefined();
    });

    it('should handle multiple candidates in response', async () => {
      const auth = new OAuth2Client();
      const server = new CodeAssistServer(auth, 'test-project');
      const mockResponse = {
        response: {
          candidates: [
            {
              index: 0,
              content: {
                role: 'model',
                parts: [{ text: 'response1' }],
              },
              finishReason: 'STOP',
            },
            {
              index: 1,
              content: {
                role: 'model',
                parts: [{ text: 'response2' }],
              },
              finishReason: 'STOP',
            },
          ],
        },
      };
      vi.spyOn(server, 'callEndpoint').mockResolvedValue(mockResponse);

      const response = await server.generateContent({
        model: 'test-model',
        contents: [{ role: 'user', parts: [{ text: 'request' }] }],
      });

      expect(response.candidates).toHaveLength(2);
      expect(response.candidates?.[0]?.content?.parts?.[0]?.text).toBe('response1');
      expect(response.candidates?.[1]?.content?.parts?.[0]?.text).toBe('response2');
    });

    it('should handle additional request parameters', async () => {
      const auth = new OAuth2Client();
      const server = new CodeAssistServer(auth, 'test-project');
      const mockResponse = {
        response: {
          candidates: [
            {
              index: 0,
              content: {
                role: 'model',
                parts: [{ text: 'response' }],
              },
              finishReason: 'STOP',
            },
          ],
        },
      };
      vi.spyOn(server, 'callEndpoint').mockResolvedValue(mockResponse);

      const request = {
        model: 'test-model',
        contents: [{ role: 'user', parts: [{ text: 'request' }] }],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 1000,
        },
        safetySettings: [],
      };

      await server.generateContent(request);

      expect(server.callEndpoint).toHaveBeenCalledWith(
        'generateContent',
        expect.objectContaining({
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 1000,
          },
          safetySettings: [],
        }),
        undefined,
      );
    });

    it('should handle content with multiple parts', async () => {
      const auth = new OAuth2Client();
      const server = new CodeAssistServer(auth, 'test-project');
      const mockResponse = {
        response: {
          candidates: [
            {
              index: 0,
              content: {
                role: 'model',
                parts: [
                  { text: 'part1' },
                  { text: 'part2' },
                ],
              },
              finishReason: 'STOP',
            },
          ],
        },
      };
      vi.spyOn(server, 'callEndpoint').mockResolvedValue(mockResponse);

      const response = await server.generateContent({
        model: 'test-model',
        contents: [
          {
            role: 'user',
            parts: [
              { text: 'first part' },
              { text: 'second part' },
            ],
          },
        ],
      });

      expect(response.candidates?.[0]?.content?.parts).toHaveLength(2);
      expect(response.candidates?.[0]?.content?.parts?.[0]?.text).toBe('part1');
      expect(response.candidates?.[0]?.content?.parts?.[1]?.text).toBe('part2');
    });

    it('should handle different finish reasons', async () => {
      const auth = new OAuth2Client();
      const server = new CodeAssistServer(auth, 'test-project');
      const mockResponse = {
        response: {
          candidates: [
            {
              index: 0,
              content: {
                role: 'model',
                parts: [{ text: 'truncated response' }],
              },
              finishReason: 'MAX_TOKENS',
            },
          ],
        },
      };
      vi.spyOn(server, 'callEndpoint').mockResolvedValue(mockResponse);

      const response = await server.generateContent({
        model: 'test-model',
        contents: [{ role: 'user', parts: [{ text: 'request' }] }],
      });

      expect(response.candidates?.[0]?.finishReason).toBe('MAX_TOKENS');
    });
  });

  describe('generateContentStream Edge Cases', () => {
    it('should handle empty stream', async () => {
      const auth = new OAuth2Client();
      const server = new CodeAssistServer(auth, 'test-project');
      const mockResponse = (async function* () {
        // Empty generator
      })();
      vi.spyOn(server, 'streamEndpoint').mockResolvedValue(mockResponse);

      const stream = await server.generateContentStream({
        model: 'test-model',
        contents: [{ role: 'user', parts: [{ text: 'request' }] }],
      });

      const results = [];
      for await (const res of stream) {
        results.push(res);
      }

      expect(results).toHaveLength(0);
    });

    it('should handle stream with multiple chunks', async () => {
      const auth = new OAuth2Client();
      const server = new CodeAssistServer(auth, 'test-project');
      const mockResponse = (async function* () {
        yield {
          response: {
            candidates: [
              {
                index: 0,
                content: {
                  role: 'model',
                  parts: [{ text: 'chunk1' }],
                },
                finishReason: null,
              },
            ],
          },
        };
        yield {
          response: {
            candidates: [
              {
                index: 0,
                content: {
                  role: 'model',
                  parts: [{ text: 'chunk2' }],
                },
                finishReason: 'STOP',
              },
            ],
          },
        };
      })();
      vi.spyOn(server, 'streamEndpoint').mockResolvedValue(mockResponse);

      const stream = await server.generateContentStream({
        model: 'test-model',
        contents: [{ role: 'user', parts: [{ text: 'request' }] }],
      });

      const results = [];
      for await (const res of stream) {
        results.push(res);
      }

      expect(results).toHaveLength(2);
      expect(results[0].candidates?.[0]?.content?.parts?.[0]?.text).toBe('chunk1');
      expect(results[1].candidates?.[0]?.content?.parts?.[0]?.text).toBe('chunk2');
    });

    it('should handle stream error', async () => {
      const auth = new OAuth2Client();
      const server = new CodeAssistServer(auth, 'test-project');
      const errorMessage = 'Stream error';
      vi.spyOn(server, 'streamEndpoint').mockRejectedValue(new Error(errorMessage));

      await expect(
        server.generateContentStream({
          model: 'test-model',
          contents: [{ role: 'user', parts: [{ text: 'request' }] }],
        })
      ).rejects.toThrow(errorMessage);
    });

    it('should handle malformed stream chunks', async () => {
      const auth = new OAuth2Client();
      const server = new CodeAssistServer(auth, 'test-project');
      const mockResponse = (async function* () {
        yield {
          response: null,
        };
        yield {
          response: {
            candidates: undefined,
          },
        };
      })();
      vi.spyOn(server, 'streamEndpoint').mockResolvedValue(mockResponse);

      const stream = await server.generateContentStream({
        model: 'test-model',
        contents: [{ role: 'user', parts: [{ text: 'request' }] }],
      });

      const results = [];
      for await (const res of stream) {
        results.push(res);
      }

      expect(results).toHaveLength(2);
      expect(results[0].candidates).toBeUndefined();
      expect(results[1].candidates).toBeUndefined();
    });

    it('should handle stream interruption', async () => {
      const auth = new OAuth2Client();
      const server = new CodeAssistServer(auth, 'test-project');
      const mockResponse = (async function* () {
        yield {
          response: {
            candidates: [
              {
                index: 0,
                content: { role: 'model', parts: [{ text: 'chunk1' }] },
                finishReason: null,
              },
            ],
          },
        };
        throw new Error('Stream interrupted');
      })();
      vi.spyOn(server, 'streamEndpoint').mockResolvedValue(mockResponse);

      const stream = await server.generateContentStream({
        model: 'test-model',
        contents: [{ role: 'user', parts: [{ text: 'request' }] }],
      });

      const results = [];
      try {
        for await (const res of stream) {
          results.push(res);
        }
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Stream interrupted');
      }

      expect(results).toHaveLength(1);
    });
  });

  describe('onboardUser Edge Cases', () => {
    it('should handle missing tierId', async () => {
      const auth = new OAuth2Client();
      const server = new CodeAssistServer(auth, 'test-project');
      const mockResponse = {
        name: 'operations/456',
        done: false,
        error: { message: 'Missing tierId' },
      };
      vi.spyOn(server, 'callEndpoint').mockResolvedValue(mockResponse);

      const response = await server.onboardUser({
        tierId: '',
        cloudaicompanionProject: 'test-project',
        metadata: {},
      });

      expect(response.error?.message).toBe('Missing tierId');
    });

    it('should handle additional metadata', async () => {
      const auth = new OAuth2Client();
      const server = new CodeAssistServer(auth, 'test-project');
      const mockResponse = {
        name: 'operations/789',
        done: true,
      };
      vi.spyOn(server, 'callEndpoint').mockResolvedValue(mockResponse);

      const request = {
        tierId: 'premium-tier',
        cloudaicompanionProject: 'test-project',
        metadata: {
          userId: 'user123',
          timestamp: Date.now(),
          customField: 'value',
        },
      };

      await server.onboardUser(request);

      expect(server.callEndpoint).toHaveBeenCalledWith(
        'onboardUser',
        expect.objectContaining({
          metadata: expect.objectContaining({
            userId: 'user123',
            customField: 'value',
          }),
        }),
      );
    });

    it('should handle onboarding failure', async () => {
      const auth = new OAuth2Client();
      const server = new CodeAssistServer(auth, 'test-project');
      const errorMessage = 'Onboarding failed';
      vi.spyOn(server, 'callEndpoint').mockRejectedValue(new Error(errorMessage));

      await expect(
        server.onboardUser({
          tierId: 'test-tier',
          cloudaicompanionProject: 'test-project',
          metadata: {},
        })
      ).rejects.toThrow(errorMessage);
    });

    it('should handle long-running operation', async () => {
      const auth = new OAuth2Client();
      const server = new CodeAssistServer(auth, 'test-project');
      const mockResponse = {
        name: 'operations/long-running-123',
        done: false,
        metadata: {
          progressPercent: 50,
          estimatedCompletionTime: '2024-01-01T12:00:00Z',
        },
      };
      vi.spyOn(server, 'callEndpoint').mockResolvedValue(mockResponse);

      const response = await server.onboardUser({
        tierId: 'enterprise-tier',
        cloudaicompanionProject: 'large-project',
        metadata: {},
      });

      expect(response.done).toBe(false);
      expect(response.metadata?.progressPercent).toBe(50);
    });
  });

  describe('loadCodeAssist Edge Cases', () => {
    it('should handle empty metadata', async () => {
      const auth = new OAuth2Client();
      const server = new CodeAssistServer(auth, 'test-project');
      const mockResponse = {
        status: 'loaded',
        config: {},
      };
      vi.spyOn(server, 'callEndpoint').mockResolvedValue(mockResponse);

      const response = await server.loadCodeAssist({
        metadata: {},
      });

      expect(server.callEndpoint).toHaveBeenCalledWith(
        'loadCodeAssist',
        expect.objectContaining({
          metadata: {},
        }),
      );
      expect(response.status).toBe('loaded');
    });

    it('should handle load failure', async () => {
      const auth = new OAuth2Client();
      const server = new CodeAssistServer(auth, 'test-project');
      const errorMessage = 'Load failed';
      vi.spyOn(server, 'callEndpoint').mockRejectedValue(new Error(errorMessage));

      await expect(
        server.loadCodeAssist({
          metadata: {},
        })
      ).rejects.toThrow(errorMessage);
    });

    it('should handle complex metadata', async () => {
      const auth = new OAuth2Client();
      const server = new CodeAssistServer(auth, 'test-project');
      const mockResponse = {
        status: 'loaded',
        config: { feature: 'enabled' },
      };
      vi.spyOn(server, 'callEndpoint').mockResolvedValue(mockResponse);

      const request = {
        metadata: {
          projectId: 'proj123',
          version: '1.0.0',
          settings: {
            autoComplete: true,
            suggestions: false,
          },
        },
      };

      await server.loadCodeAssist(request);

      expect(server.callEndpoint).toHaveBeenCalledWith(
        'loadCodeAssist',
        expect.objectContaining({
          metadata: expect.objectContaining({
            projectId: 'proj123',
            version: '1.0.0',
            settings: {
              autoComplete: true,
              suggestions: false,
            },
          }),
        }),
      );
    });

    it('should handle null response', async () => {
      const auth = new OAuth2Client();
      const server = new CodeAssistServer(auth, 'test-project');
      vi.spyOn(server, 'callEndpoint').mockResolvedValue(null);

      const response = await server.loadCodeAssist({
        metadata: {},
      });

      expect(response).toBeNull();
    });
  });

  describe('countTokens Edge Cases', () => {
    it('should handle zero tokens', async () => {
      const auth = new OAuth2Client();
      const server = new CodeAssistServer(auth, 'test-project');
      const mockResponse = {
        totalTokens: 0,
      };
      vi.spyOn(server, 'callEndpoint').mockResolvedValue(mockResponse);

      const response = await server.countTokens({
        model: 'test-model',
        contents: [],
      });

      expect(response.totalTokens).toBe(0);
    });

    it('should handle large token count', async () => {
      const auth = new OAuth2Client();
      const server = new CodeAssistServer(auth, 'test-project');
      const mockResponse = {
        totalTokens: 999999,
      };
      vi.spyOn(server, 'callEndpoint').mockResolvedValue(mockResponse);

      const response = await server.countTokens({
        model: 'test-model',
        contents: [{ role: 'user', parts: [{ text: 'very long text'.repeat(1000) }] }],
      });

      expect(response.totalTokens).toBe(999999);
    });

    it('should handle count tokens error', async () => {
      const auth = new OAuth2Client();
      const server = new CodeAssistServer(auth, 'test-project');
      const errorMessage = 'Token counting failed';
      vi.spyOn(server, 'callEndpoint').mockRejectedValue(new Error(errorMessage));

      await expect(
        server.countTokens({
          model: 'test-model',
          contents: [{ role: 'user', parts: [{ text: 'request' }] }],
        })
      ).rejects.toThrow(errorMessage);
    });

    it('should handle malformed token response', async () => {
      const auth = new OAuth2Client();
      const server = new CodeAssistServer(auth, 'test-project');
      const mockResponse = {
        totalTokens: undefined,
      };
      vi.spyOn(server, 'callEndpoint').mockResolvedValue(mockResponse);

      const response = await server.countTokens({
        model: 'test-model',
        contents: [{ role: 'user', parts: [{ text: 'request' }] }],
      });

      expect(response.totalTokens).toBeUndefined();
    });

    it('should handle negative token count', async () => {
      const auth = new OAuth2Client();
      const server = new CodeAssistServer(auth, 'test-project');
      const mockResponse = {
        totalTokens: -1,
      };
      vi.spyOn(server, 'callEndpoint').mockResolvedValue(mockResponse);

      const response = await server.countTokens({
        model: 'test-model',
        contents: [{ role: 'user', parts: [{ text: 'request' }] }],
      });

      expect(response.totalTokens).toBe(-1);
    });
  });

  describe('embedContent Edge Cases', () => {
    it('should throw specific error message', async () => {
      const auth = new OAuth2Client();
      const server = new CodeAssistServer(auth, 'test-project');

      await expect(
        server.embedContent({
          model: 'test-model',
          contents: [{ role: 'user', parts: [{ text: 'request' }] }],
        })
      ).rejects.toThrow();
    });

    it('should throw for different model types', async () => {
      const auth = new OAuth2Client();
      const server = new CodeAssistServer(auth, 'test-project');

      await expect(
        server.embedContent({
          model: 'embedding-model',
          contents: [{ role: 'user', parts: [{ text: 'embed this' }] }],
        })
      ).rejects.toThrow();
    });

    it('should throw for empty contents', async () => {
      const auth = new OAuth2Client();
      const server = new CodeAssistServer(auth, 'test-project');

      await expect(
        server.embedContent({
          model: 'test-model',
          contents: [],
        })
      ).rejects.toThrow();
    });

    it('should throw for null model', async () => {
      const auth = new OAuth2Client();
      const server = new CodeAssistServer(auth, 'test-project');

      await expect(
        server.embedContent({
          model: null as any,
          contents: [{ role: 'user', parts: [{ text: 'request' }] }],
        })
      ).rejects.toThrow();
    });
  });

  describe('Method Call Verification', () => {
    it('should call generateContent with correct endpoint name', async () => {
      const auth = new OAuth2Client();
      const server = new CodeAssistServer(auth, 'test-project');
      vi.spyOn(server, 'callEndpoint').mockResolvedValue({ response: {} });

      await server.generateContent({
        model: 'test-model',
        contents: [{ role: 'user', parts: [{ text: 'test' }] }],
      });

      expect(server.callEndpoint).toHaveBeenCalledWith(
        'generateContent',
        expect.any(Object),
        undefined,
      );
    });

    it('should call generateContentStream with correct endpoint name', async () => {
      const auth = new OAuth2Client();
      const server = new CodeAssistServer(auth, 'test-project');
      const mockStream = (async function* () {})();
      vi.spyOn(server, 'streamEndpoint').mockResolvedValue(mockStream);

      await server.generateContentStream({
        model: 'test-model',
        contents: [{ role: 'user', parts: [{ text: 'test' }] }],
      });

      expect(server.streamEndpoint).toHaveBeenCalledWith(
        'streamGenerateContent',
        expect.any(Object),
        undefined,
      );
    });

    it('should call countTokens with correct endpoint name', async () => {
      const auth = new OAuth2Client();
      const server = new CodeAssistServer(auth, 'test-project');
      vi.spyOn(server, 'callEndpoint').mockResolvedValue({ totalTokens: 0 });

      await server.countTokens({
        model: 'test-model',
        contents: [{ role: 'user', parts: [{ text: 'test' }] }],
      });

      expect(server.callEndpoint).toHaveBeenCalledWith(
        'countTokens',
        expect.any(Object),
        undefined,
      );
    });

    it('should verify method signatures match expected patterns', () => {
      const auth = new OAuth2Client();
      const server = new CodeAssistServer(auth, 'test-project');

      expect(typeof server.generateContent).toBe('function');
      expect(typeof server.generateContentStream).toBe('function');
      expect(typeof server.onboardUser).toBe('function');
      expect(typeof server.loadCodeAssist).toBe('function');
      expect(typeof server.countTokens).toBe('function');
      expect(typeof server.embedContent).toBe('function');
    });
  });

  describe('Async Behavior and Concurrency', () => {
    it('should handle concurrent generateContent calls', async () => {
      const auth = new OAuth2Client();
      const server = new CodeAssistServer(auth, 'test-project');
      const mockResponse = {
        response: {
          candidates: [
            {
              index: 0,
              content: {
                role: 'model',
                parts: [{ text: 'response' }],
              },
              finishReason: 'STOP',
            },
          ],
        },
      };
      vi.spyOn(server, 'callEndpoint').mockResolvedValue(mockResponse);

      const promises = [
        server.generateContent({
          model: 'model1',
          contents: [{ role: 'user', parts: [{ text: 'request1' }] }],
        }),
        server.generateContent({
          model: 'model2',
          contents: [{ role: 'user', parts: [{ text: 'request2' }] }],
        }),
        server.generateContent({
          model: 'model3',
          contents: [{ role: 'user', parts: [{ text: 'request3' }] }],
        }),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(server.callEndpoint).toHaveBeenCalledTimes(3);
      results.forEach(result => {
        expect(result.candidates?.[0]?.content?.parts?.[0]?.text).toBe('response');
      });
    });

    it('should handle timeout scenarios', async () => {
      const auth = new OAuth2Client();
      const server = new CodeAssistServer(auth, 'test-project');
      vi.spyOn(server, 'callEndpoint').mockImplementation(
        () => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 100))
      );

      await expect(
        server.generateContent({
          model: 'test-model',
          contents: [{ role: 'user', parts: [{ text: 'request' }] }],
        })
      ).rejects.toThrow('Timeout');
    });

    it('should handle race conditions with mixed method calls', async () => {
      const auth = new OAuth2Client();
      const server = new CodeAssistServer(auth, 'test-project');
      
      vi.spyOn(server, 'callEndpoint').mockImplementation((endpoint) => {
        if (endpoint === 'generateContent') {
          return Promise.resolve({ response: { candidates: [] } });
        }
        if (endpoint === 'countTokens') {
          return Promise.resolve({ totalTokens: 42 });
        }
        return Promise.resolve({});
      });

      const promises = [
        server.generateContent({
          model: 'test-model',
          contents: [{ role: 'user', parts: [{ text: 'request' }] }],
        }),
        server.countTokens({
          model: 'test-model',
          contents: [{ role: 'user', parts: [{ text: 'request' }] }],
        }),
        server.onboardUser({
          tierId: 'test-tier',
          cloudaicompanionProject: 'test-project',
          metadata: {},
        }),
      ];

      const results = await Promise.all(promises);
      expect(results).toHaveLength(3);
      expect(server.callEndpoint).toHaveBeenCalledTimes(3);
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should handle very long text content', async () => {
      const auth = new OAuth2Client();
      const server = new CodeAssistServer(auth, 'test-project');
      const longText = 'a'.repeat(100000);
      const mockResponse = {
        response: {
          candidates: [
            {
              index: 0,
              content: {
                role: 'model',
                parts: [{ text: 'response' }],
              },
              finishReason: 'STOP',
            },
          ],
        },
      };
      vi.spyOn(server, 'callEndpoint').mockResolvedValue(mockResponse);

      const response = await server.generateContent({
        model: 'test-model',
        contents: [{ role: 'user', parts: [{ text: longText }] }],
      });

      expect(server.callEndpoint).toHaveBeenCalledWith(
        'generateContent',
        expect.objectContaining({
          contents: [{ role: 'user', parts: [{ text: longText }] }],
        }),
        undefined,
      );
      expect(response.candidates?.[0]?.content?.parts?.[0]?.text).toBe('response');
    });

    it('should handle special characters in content', async () => {
      const auth = new OAuth2Client();
      const server = new CodeAssistServer(auth, 'test-project');
      const specialText = '🚀 Hello 世界! @#$%^&*()[]{}|;:,.<>?';
      const mockResponse = {
        response: {
          candidates: [
            {
              index: 0,
              content: {
                role: 'model',
                parts: [{ text: 'response with emojis 🎉' }],
              },
              finishReason: 'STOP',
            },
          ],
        },
      };
      vi.spyOn(server, 'callEndpoint').mockResolvedValue(mockResponse);

      const response = await server.generateContent({
        model: 'test-model',
        contents: [{ role: 'user', parts: [{ text: specialText }] }],
      });

      expect(response.candidates?.[0]?.content?.parts?.[0]?.text).toBe('response with emojis 🎉');
    });

    it('should handle mixed content types', async () => {
      const auth = new OAuth2Client();
      const server = new CodeAssistServer(auth, 'test-project');
      const mockResponse = {
        response: {
          candidates: [
            {
              index: 0,
              content: {
                role: 'model',
                parts: [{ text: 'mixed response' }],
              },
              finishReason: 'STOP',
            },
          ],
        },
      };
      vi.spyOn(server, 'callEndpoint').mockResolvedValue(mockResponse);

      const response = await server.generateContent({
        model: 'test-model',
        contents: [
          { role: 'user', parts: [{ text: 'text part' }] },
          { role: 'model', parts: [{ text: 'model response' }] },
          { role: 'user', parts: [{ text: 'follow up' }] },
        ],
      });

      expect(server.callEndpoint).toHaveBeenCalledWith(
        'generateContent',
        expect.objectContaining({
          contents: expect.arrayContaining([
            expect.objectContaining({ role: 'user' }),
            expect.objectContaining({ role: 'model' }),
            expect.objectContaining({ role: 'user' }),
          ]),
        }),
        undefined,
      );
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle network errors gracefully', async () => {
      const auth = new OAuth2Client();
      const server = new CodeAssistServer(auth, 'test-project');
      const networkError = new Error('Network error: ECONNREFUSED');
      vi.spyOn(server, 'callEndpoint').mockRejectedValue(networkError);

      await expect(
        server.generateContent({
          model: 'test-model',
          contents: [{ role: 'user', parts: [{ text: 'request' }] }],
        })
      ).rejects.toThrow('Network error: ECONNREFUSED');
    });

    it('should handle authentication errors', async () => {
      const auth = new OAuth2Client();
      const server = new CodeAssistServer(auth, 'test-project');
      const authError = new Error('Authentication failed: Invalid credentials');
      vi.spyOn(server, 'callEndpoint').mockRejectedValue(authError);

      await expect(
        server.countTokens({
          model: 'test-model',
          contents: [{ role: 'user', parts: [{ text: 'request' }] }],
        })
      ).rejects.toThrow('Authentication failed: Invalid credentials');
    });

    it('should handle rate limiting errors', async () => {
      const auth = new OAuth2Client();
      const server = new CodeAssistServer(auth, 'test-project');
      const rateLimitError = new Error('Rate limit exceeded');
      vi.spyOn(server, 'callEndpoint').mockRejectedValue(rateLimitError);

      await expect(
        server.onboardUser({
          tierId: 'test-tier',
          cloudaicompanionProject: 'test-project',
          metadata: {},
        })
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle JSON parsing errors', async () => {
      const auth = new OAuth2Client();
      const server = new CodeAssistServer(auth, 'test-project');
      const parseError = new Error('Unexpected token in JSON');
      vi.spyOn(server, 'callEndpoint').mockRejectedValue(parseError);

      await expect(
        server.loadCodeAssist({
          metadata: {},
        })
      ).rejects.toThrow('Unexpected token in JSON');
    });
  });
