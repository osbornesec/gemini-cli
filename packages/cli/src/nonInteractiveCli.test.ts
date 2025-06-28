/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runNonInteractive } from './nonInteractiveCli.js';
import { Config, GeminiClient, ToolRegistry } from '@google/gemini-cli-core';
import { GenerateContentResponse, Part, FunctionCall } from '@google/genai';

// Mock dependencies
vi.mock('@google/gemini-cli-core', async () => {
  const actualCore = await vi.importActual<
    typeof import('@google/gemini-cli-core')
  >('@google/gemini-cli-core');
  return {
    ...actualCore,
    GeminiClient: vi.fn(),
    ToolRegistry: vi.fn(),
    executeToolCall: vi.fn(),
  };
});

describe('runNonInteractive', () => {
  let mockConfig: Config;
  let mockGeminiClient: GeminiClient;
  let mockToolRegistry: ToolRegistry;
  let mockChat: {
    sendMessageStream: ReturnType<typeof vi.fn>;
  };
  let mockProcessStdoutWrite: ReturnType<typeof vi.fn>;
  let mockProcessExit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetAllMocks();
    mockChat = {
      sendMessageStream: vi.fn(),
    };
    mockGeminiClient = {
      getChat: vi.fn().mockResolvedValue(mockChat),
    } as unknown as GeminiClient;
    mockToolRegistry = {
      getFunctionDeclarations: vi.fn().mockReturnValue([]),
      getTool: vi.fn(),
    } as unknown as ToolRegistry;

    vi.mocked(GeminiClient).mockImplementation(() => mockGeminiClient);
    vi.mocked(ToolRegistry).mockImplementation(() => mockToolRegistry);

    mockConfig = {
      getToolRegistry: vi.fn().mockReturnValue(mockToolRegistry),
      getGeminiClient: vi.fn().mockReturnValue(mockGeminiClient),
      getContentGeneratorConfig: vi.fn().mockReturnValue({}),
    } as unknown as Config;

    mockProcessStdoutWrite = vi.fn().mockImplementation(() => true);
    process.stdout.write = mockProcessStdoutWrite as any; // Use any to bypass strict signature matching for mock
    mockProcessExit = vi
      .fn()
      .mockImplementation((_code?: number) => undefined as never);
    process.exit = mockProcessExit as any; // Use any for process.exit mock
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Restore original process methods if they were globally patched
    // This might require storing the original methods before patching them in beforeEach
  });

  it('should process input and write text output', async () => {
    const inputStream = (async function* () {
      yield {
        candidates: [{ content: { parts: [{ text: 'Hello' }] } }],
      } as GenerateContentResponse;
      yield {
        candidates: [{ content: { parts: [{ text: ' World' }] } }],
      } as GenerateContentResponse;
    })();
    mockChat.sendMessageStream.mockResolvedValue(inputStream);

    await runNonInteractive(mockConfig, 'Test input');

    expect(mockChat.sendMessageStream).toHaveBeenCalledWith({
      message: [{ text: 'Test input' }],
      config: {
        abortSignal: expect.any(AbortSignal),
        tools: [{ functionDeclarations: [] }],
      },
    });
    expect(mockProcessStdoutWrite).toHaveBeenCalledWith('Hello');
    expect(mockProcessStdoutWrite).toHaveBeenCalledWith(' World');
    expect(mockProcessStdoutWrite).toHaveBeenCalledWith('\n');
  });

  it('should handle a single tool call and respond', async () => {
    const functionCall: FunctionCall = {
      id: 'fc1',
      name: 'testTool',
      args: { p: 'v' },
    };
    const toolResponsePart: Part = {
      functionResponse: {
        name: 'testTool',
        id: 'fc1',
        response: { result: 'tool success' },
      },
    };

    const { executeToolCall: mockCoreExecuteToolCall } = await import(
      '@google/gemini-cli-core'
    );
    vi.mocked(mockCoreExecuteToolCall).mockResolvedValue({
      callId: 'fc1',
      responseParts: [toolResponsePart],
      resultDisplay: 'Tool success display',
      error: undefined,
    });

    const stream1 = (async function* () {
      yield { functionCalls: [functionCall] } as GenerateContentResponse;
    })();
    const stream2 = (async function* () {
      yield {
        candidates: [{ content: { parts: [{ text: 'Final answer' }] } }],
      } as GenerateContentResponse;
    })();
    mockChat.sendMessageStream
      .mockResolvedValueOnce(stream1)
      .mockResolvedValueOnce(stream2);

    await runNonInteractive(mockConfig, 'Use a tool');

    expect(mockChat.sendMessageStream).toHaveBeenCalledTimes(2);
    expect(mockCoreExecuteToolCall).toHaveBeenCalledWith(
      mockConfig,
      expect.objectContaining({ callId: 'fc1', name: 'testTool' }),
      mockToolRegistry,
      expect.any(AbortSignal),
    );
    expect(mockChat.sendMessageStream).toHaveBeenLastCalledWith(
      expect.objectContaining({
        message: [toolResponsePart],
      }),
    );
    expect(mockProcessStdoutWrite).toHaveBeenCalledWith('Final answer');
  });

  it('should handle error during tool execution', async () => {
    const functionCall: FunctionCall = {
      id: 'fcError',
      name: 'errorTool',
      args: {},
    };
    const errorResponsePart: Part = {
      functionResponse: {
        name: 'errorTool',
        id: 'fcError',
        response: { error: 'Tool failed' },
      },
    };

    const { executeToolCall: mockCoreExecuteToolCall } = await import(
      '@google/gemini-cli-core'
    );
    vi.mocked(mockCoreExecuteToolCall).mockResolvedValue({
      callId: 'fcError',
      responseParts: [errorResponsePart],
      resultDisplay: 'Tool execution failed badly',
      error: new Error('Tool failed'),
    });

    const stream1 = (async function* () {
      yield { functionCalls: [functionCall] } as GenerateContentResponse;
    })();

    const stream2 = (async function* () {
      yield {
        candidates: [
          { content: { parts: [{ text: 'Could not complete request.' }] } },
        ],
      } as GenerateContentResponse;
    })();
    mockChat.sendMessageStream
      .mockResolvedValueOnce(stream1)
      .mockResolvedValueOnce(stream2);
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    await runNonInteractive(mockConfig, 'Trigger tool error');

    expect(mockCoreExecuteToolCall).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error executing tool errorTool: Tool execution failed badly',
    );
    expect(mockChat.sendMessageStream).toHaveBeenLastCalledWith(
      expect.objectContaining({
        message: [errorResponsePart],
      }),
    );
    expect(mockProcessStdoutWrite).toHaveBeenCalledWith(
      'Could not complete request.',
    );
  });

  it('should exit with error if sendMessageStream throws initially', async () => {
    const apiError = new Error('API connection failed');
    mockChat.sendMessageStream.mockRejectedValue(apiError);
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    await runNonInteractive(mockConfig, 'Initial fail');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[API Error: API connection failed]',
    );
  });

  it('should not exit if a tool is not found, and should send error back to model', async () => {
    const functionCall: FunctionCall = {
      id: 'fcNotFound',
      name: 'nonExistentTool',
      args: {},
    };
    const errorResponsePart: Part = {
      functionResponse: {
        name: 'nonExistentTool',
        id: 'fcNotFound',
        response: { error: 'Tool "nonExistentTool" not found in registry.' },
      },
    };

    const { executeToolCall: mockCoreExecuteToolCall } = await import(
      '@google/gemini-cli-core'
    );
    vi.mocked(mockCoreExecuteToolCall).mockResolvedValue({
      callId: 'fcNotFound',
      responseParts: [errorResponsePart],
      resultDisplay: 'Tool "nonExistentTool" not found in registry.',
      error: new Error('Tool "nonExistentTool" not found in registry.'),
    });

    const stream1 = (async function* () {
      yield { functionCalls: [functionCall] } as GenerateContentResponse;
    })();
    const stream2 = (async function* () {
      yield {
        candidates: [
          {
            content: {
              parts: [{ text: 'Unfortunately the tool does not exist.' }],
            },
          },
        ],
      } as GenerateContentResponse;
    })();
    mockChat.sendMessageStream
      .mockResolvedValueOnce(stream1)
      .mockResolvedValueOnce(stream2);
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    await runNonInteractive(mockConfig, 'Trigger tool not found');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error executing tool nonExistentTool: Tool "nonExistentTool" not found in registry.',
    );

    expect(mockProcessExit).not.toHaveBeenCalled();

    expect(mockChat.sendMessageStream).toHaveBeenCalledTimes(2);
    expect(mockChat.sendMessageStream).toHaveBeenLastCalledWith(
      expect.objectContaining({
        message: [errorResponsePart],
      }),
    );

    expect(mockProcessStdoutWrite).toHaveBeenCalledWith(
      'Unfortunately the tool does not exist.',
    );
  });
});

  it('should handle EPIPE error on process.stdout gracefully', async () => {
    const textStream = (async function* () {
      yield {
        candidates: [{ content: { parts: [{ text: 'Some output' }] } }],
      } as GenerateContentResponse;
    })();
    mockChat.sendMessageStream.mockResolvedValue(textStream);

    // Mock process.stdout.on to simulate EPIPE error
    const mockStdoutOn = vi.fn();
    process.stdout.on = mockStdoutOn;

    await runNonInteractive(mockConfig, 'EPIPE test');

    expect(mockStdoutOn).toHaveBeenCalledWith('error', expect.any(Function));
    
    // Simulate the EPIPE error callback
    const errorCallback = mockStdoutOn.mock.calls[0][1];
    const epipeError = new Error('EPIPE') as NodeJS.ErrnoException;
    epipeError.code = 'EPIPE';
    
    errorCallback(epipeError);
    expect(mockProcessExit).toHaveBeenCalledWith(0);
  });

  it('should handle non-EPIPE stdout errors without exiting', async () => {
    const textStream = (async function* () {
      yield {
        candidates: [{ content: { parts: [{ text: 'Some output' }] } }],
      } as GenerateContentResponse;
    })();
    mockChat.sendMessageStream.mockResolvedValue(textStream);

    const mockStdoutOn = vi.fn();
    process.stdout.on = mockStdoutOn;

    await runNonInteractive(mockConfig, 'Non-EPIPE error test');

    const errorCallback = mockStdoutOn.mock.calls[0][1];
    const otherError = new Error('Other error') as NodeJS.ErrnoException;
    otherError.code = 'EOTHER';
    
    errorCallback(otherError);
    expect(mockProcessExit).not.toHaveBeenCalledWith(0);
  });

  it('should handle multiple tool calls in sequence', async () => {
    const functionCall1: FunctionCall = {
      id: 'fc1',
      name: 'tool1',
      args: { param: 'value1' },
    };
    const functionCall2: FunctionCall = {
      id: 'fc2',
      name: 'tool2',
      args: { param: 'value2' },
    };
    
    const toolResponse1: Part = {
      functionResponse: {
        name: 'tool1',
        id: 'fc1',
        response: { result: 'result1' },
      },
    };
    const toolResponse2: Part = {
      functionResponse: {
        name: 'tool2',
        id: 'fc2',
        response: { result: 'result2' },
      },
    };

    const { executeToolCall: mockCoreExecuteToolCall } = await import(
      '@google/gemini-cli-core'
    );
    vi.mocked(mockCoreExecuteToolCall)
      .mockResolvedValueOnce({
        callId: 'fc1',
        responseParts: [toolResponse1],
        resultDisplay: 'Tool 1 success',
        error: undefined,
      })
      .mockResolvedValueOnce({
        callId: 'fc2',
        responseParts: [toolResponse2],
        resultDisplay: 'Tool 2 success',
        error: undefined,
      });

    const stream1 = (async function* () {
      yield { functionCalls: [functionCall1, functionCall2] } as GenerateContentResponse;
    })();
    const stream2 = (async function* () {
      yield {
        candidates: [{ content: { parts: [{ text: 'All tools completed' }] } }],
      } as GenerateContentResponse;
    })();
    
    mockChat.sendMessageStream
      .mockResolvedValueOnce(stream1)
      .mockResolvedValueOnce(stream2);

    await runNonInteractive(mockConfig, 'Use multiple tools');

    expect(mockCoreExecuteToolCall).toHaveBeenCalledTimes(2);
    expect(mockChat.sendMessageStream).toHaveBeenCalledTimes(2);
    expect(mockProcessStdoutWrite).toHaveBeenCalledWith('All tools completed');
  });

  it('should handle response with thought parts and filter them out', async () => {
    const thoughtStream = (async function* () {
      yield {
        candidates: [{ 
          content: { 
            parts: [
              { thought: 'This is a thought that should be filtered' },
              { text: 'This should not appear' }
            ] 
          } 
        }],
      } as GenerateContentResponse;
    })();
    mockChat.sendMessageStream.mockResolvedValue(thoughtStream);

    await runNonInteractive(mockConfig, 'Thought filtering test');

    // Should not write the thought or subsequent text in the same response
    expect(mockProcessStdoutWrite).not.toHaveBeenCalledWith('This should not appear');
    expect(mockProcessStdoutWrite).toHaveBeenCalledWith('\n'); // Only the final newline
  });

  it('should handle mixed content parts correctly', async () => {
    const mixedStream = (async function* () {
      yield {
        candidates: [{ 
          content: { 
            parts: [
              { text: 'First text' },
              { text: 'Second text' },
              { unknownPart: 'should be ignored' } as any
            ] 
          } 
        }],
      } as GenerateContentResponse;
    })();
    mockChat.sendMessageStream.mockResolvedValue(mixedStream);

    await runNonInteractive(mockConfig, 'Mixed parts test');

    expect(mockProcessStdoutWrite).toHaveBeenCalledWith('First textSecond text');
    expect(mockProcessStdoutWrite).toHaveBeenCalledWith('\n');
  });

  it('should handle aborted signal during streaming', async () => {
    let abortController: AbortController;
    const abortedStream = (async function* () {
      yield {
        candidates: [{ content: { parts: [{ text: 'Before abort' }] } }],
      } as GenerateContentResponse;
      // Simulate abort after first chunk
      abortController.abort();
      yield {
        candidates: [{ content: { parts: [{ text: 'After abort' }] } }],
      } as GenerateContentResponse;
    })();

    // Mock to capture the abort controller
    const originalSendMessageStream = mockChat.sendMessageStream;
    mockChat.sendMessageStream = vi.fn().mockImplementation((options) => {
      abortController = new AbortController();
      // Simulate the actual abort signal from the implementation
      const signal = options.config?.abortSignal;
      if (signal) {
        setTimeout(() => signal.dispatchEvent(new Event('abort')), 10);
      }
      return abortedStream;
    });

    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    await runNonInteractive(mockConfig, 'Abort test');

    expect(mockProcessStdoutWrite).toHaveBeenCalledWith('Before abort');
    expect(consoleErrorSpy).toHaveBeenCalledWith('Operation cancelled.');
    expect(mockProcessStdoutWrite).not.toHaveBeenCalledWith('After abort');
  });

  it('should generate fallback ID for function calls without ID', async () => {
    const noIdFunctionCall: FunctionCall = {
      name: 'noIdTool',
      args: { test: 'value' },
    } as FunctionCall; // Explicitly omit id

    const { executeToolCall: mockCoreExecuteToolCall } = await import(
      '@google/gemini-cli-core'
    );
    vi.mocked(mockCoreExecuteToolCall).mockResolvedValue({
      callId: 'noIdTool-1234567890',
      responseParts: [{
        functionResponse: {
          name: 'noIdTool',
          id: 'noIdTool-1234567890',
          response: { result: 'success with generated id' },
        },
      }],
      resultDisplay: 'Tool executed with generated ID',
      error: undefined,
    });

    const stream1 = (async function* () {
      yield { functionCalls: [noIdFunctionCall] } as GenerateContentResponse;
    })();
    const stream2 = (async function* () {
      yield {
        candidates: [{ content: { parts: [{ text: 'Generated ID worked' }] } }],
      } as GenerateContentResponse;
    })();

    mockChat.sendMessageStream
      .mockResolvedValueOnce(stream1)
      .mockResolvedValueOnce(stream2);

    // Mock Date.now to make the test deterministic
    const mockDateNow = vi.spyOn(Date, 'now').mockReturnValue(1234567890);

    await runNonInteractive(mockConfig, 'No ID function call test');

    expect(mockCoreExecuteToolCall).toHaveBeenCalledWith(
      mockConfig,
      expect.objectContaining({
        callId: 'noIdTool-1234567890',
        name: 'noIdTool'
      }),
      mockToolRegistry,
      expect.any(AbortSignal)
    );
    expect(mockProcessStdoutWrite).toHaveBeenCalledWith('Generated ID worked');

    mockDateNow.mockRestore();
  });

  it('should handle string response parts from tool execution', async () => {
    const functionCall: FunctionCall = {
      id: 'fcString',
      name: 'stringTool',
      args: { data: 'test' },
    };

    const { executeToolCall: mockCoreExecuteToolCall } = await import(
      '@google/gemini-cli-core'
    );
    vi.mocked(mockCoreExecuteToolCall).mockResolvedValue({
      callId: 'fcString',
      responseParts: ['String response part 1', 'String response part 2'],
      resultDisplay: 'String tool success',
      error: undefined,
    });

    const stream1 = (async function* () {
      yield { functionCalls: [functionCall] } as GenerateContentResponse;
    })();
    const stream2 = (async function* () {
      yield {
        candidates: [{ content: { parts: [{ text: 'String parts processed' }] } }],
      } as GenerateContentResponse;
    })();

    mockChat.sendMessageStream
      .mockResolvedValueOnce(stream1)
      .mockResolvedValueOnce(stream2);

    await runNonInteractive(mockConfig, 'String response parts test');

    expect(mockChat.sendMessageStream).toHaveBeenLastCalledWith(
      expect.objectContaining({
        message: [
          { text: 'String response part 1' },
          { text: 'String response part 2' }
        ],
      })
    );
    expect(mockProcessStdoutWrite).toHaveBeenCalledWith('String parts processed');
  });

  it('should handle single Part object response from tool execution', async () => {
    const functionCall: FunctionCall = {
      id: 'fcSinglePart',
      name: 'singlePartTool',
      args: { data: 'test' },
    };

    const singlePart: Part = {
      functionResponse: {
        name: 'singlePartTool',
        id: 'fcSinglePart',
        response: { result: 'single part result' },
      },
    };

    const { executeToolCall: mockCoreExecuteToolCall } = await import(
      '@google/gemini-cli-core'
    );
    vi.mocked(mockCoreExecuteToolCall).mockResolvedValue({
      callId: 'fcSinglePart',
      responseParts: singlePart, // Single Part, not array
      resultDisplay: 'Single part tool success',
      error: undefined,
    });

    const stream1 = (async function* () {
      yield { functionCalls: [functionCall] } as GenerateContentResponse;
    })();
    const stream2 = (async function* () {
      yield {
        candidates: [{ content: { parts: [{ text: 'Single part processed' }] } }],
      } as GenerateContentResponse;
    })();

    mockChat.sendMessageStream
      .mockResolvedValueOnce(stream1)
      .mockResolvedValueOnce(stream2);

    await runNonInteractive(mockConfig, 'Single part response test');

    expect(mockChat.sendMessageStream).toHaveBeenLastCalledWith(
      expect.objectContaining({
        message: [singlePart],
      })
    );
    expect(mockProcessStdoutWrite).toHaveBeenCalledWith('Single part processed');
  });

  it('should handle tool execution with null/undefined response parts', async () => {
    const functionCall: FunctionCall = {
      id: 'fcNullParts',
      name: 'nullPartsTool',
      args: {},
    };

    const { executeToolCall: mockCoreExecuteToolCall } = await import(
      '@google/gemini-cli-core'
    );
    vi.mocked(mockCoreExecuteToolCall).mockResolvedValue({
      callId: 'fcNullParts',
      responseParts: [null, undefined, { text: 'valid part' }] as any,
      resultDisplay: 'Null parts handled',
      error: undefined,
    });

    const stream1 = (async function* () {
      yield { functionCalls: [functionCall] } as GenerateContentResponse;
    })();
    const stream2 = (async function* () {
      yield {
        candidates: [{ content: { parts: [{ text: 'Null parts filtered' }] } }],
      } as GenerateContentResponse;
    })();

    mockChat.sendMessageStream
      .mockResolvedValueOnce(stream1)
      .mockResolvedValueOnce(stream2);

    await runNonInteractive(mockConfig, 'Null parts test');

    expect(mockChat.sendMessageStream).toHaveBeenLastCalledWith(
      expect.objectContaining({
        message: [{ text: 'valid part' }],
      })
    );
    expect(mockProcessStdoutWrite).toHaveBeenCalledWith('Null parts filtered');
  });

  it('should handle empty message parts gracefully', async () => {
    const emptyPartsStream = (async function* () {
      yield {
        candidates: [{ content: { parts: [] } }],
      } as GenerateContentResponse;
    })();
    mockChat.sendMessageStream.mockResolvedValue(emptyPartsStream);

    await runNonInteractive(mockConfig, 'Empty parts test');

    expect(mockChat.sendMessageStream).toHaveBeenCalledWith(
      expect.objectContaining({
        message: [{ text: 'Empty parts test' }],
      })
    );
    expect(mockProcessStdoutWrite).toHaveBeenCalledWith('\n');
  });

  it('should handle tool error that is not "tool not found" and exit', async () => {
    const functionCall: FunctionCall = {
      id: 'fcCriticalError',
      name: 'criticalErrorTool',
      args: {},
    };

    const { executeToolCall: mockCoreExecuteToolCall } = await import(
      '@google/gemini-cli-core'
    );
    vi.mocked(mockCoreExecuteToolCall).mockResolvedValue({
      callId: 'fcCriticalError',
      responseParts: [{
        functionResponse: {
          name: 'criticalErrorTool',
          id: 'fcCriticalError',
          response: { error: 'Critical system error' },
        },
      }],
      resultDisplay: 'Critical error occurred',
      error: new Error('Critical system error'),
    });

    const stream1 = (async function* () {
      yield { functionCalls: [functionCall] } as GenerateContentResponse;
    })();

    mockChat.sendMessageStream.mockResolvedValue(stream1);
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    await runNonInteractive(mockConfig, 'Critical error test');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error executing tool criticalErrorTool: Critical error occurred'
    );
    expect(mockProcessExit).toHaveBeenCalledWith(1);
  });

  it('should handle telemetry shutdown in finally block', async () => {
    const { isTelemetrySdkInitialized, shutdownTelemetry } = await import(
      '@google/gemini-cli-core'
    );
    vi.mocked(isTelemetrySdkInitialized).mockReturnValue(true);
    const mockShutdownTelemetry = vi.mocked(shutdownTelemetry);

    const textStream = (async function* () {
      yield {
        candidates: [{ content: { parts: [{ text: 'Telemetry test' }] } }],
      } as GenerateContentResponse;
    })();
    mockChat.sendMessageStream.mockResolvedValue(textStream);

    await runNonInteractive(mockConfig, 'Telemetry shutdown test');

    expect(mockShutdownTelemetry).toHaveBeenCalled();
  });

  it('should not call shutdown telemetry if not initialized', async () => {
    const { isTelemetrySdkInitialized, shutdownTelemetry } = await import(
      '@google/gemini-cli-core'
    );
    vi.mocked(isTelemetrySdkInitialized).mockReturnValue(false);
    const mockShutdownTelemetry = vi.mocked(shutdownTelemetry);

    const textStream = (async function* () {
      yield {
        candidates: [{ content: { parts: [{ text: 'No telemetry test' }] } }],
      } as GenerateContentResponse;
    })();
    mockChat.sendMessageStream.mockResolvedValue(textStream);

    await runNonInteractive(mockConfig, 'No telemetry shutdown test');

    expect(mockShutdownTelemetry).not.toHaveBeenCalled();
  });

  it('should handle error with different auth types in parseAndFormatApiError', async () => {
    const apiError = new Error('Custom API error');
    mockChat.sendMessageStream.mockRejectedValue(apiError);
    
    const mockGetContentGeneratorConfig = vi.fn().mockReturnValue({
      authType: 'service-account'
    });
    mockConfig.getContentGeneratorConfig = mockGetContentGeneratorConfig;

    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    await runNonInteractive(mockConfig, 'Auth type error test');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[API Error: Custom API error]')
    );
    expect(mockGetContentGeneratorConfig).toHaveBeenCalled();
  });

  it('should handle streaming response with mixed function calls and text', async () => {
    const functionCall: FunctionCall = {
      id: 'fcMixed',
      name: 'mixedTool',
      args: { data: 'test' },
    };

    const { executeToolCall: mockCoreExecuteToolCall } = await import(
      '@google/gemini-cli-core'
    );
    vi.mocked(mockCoreExecuteToolCall).mockResolvedValue({
      callId: 'fcMixed',
      responseParts: [{
        functionResponse: {
          name: 'mixedTool',
          id: 'fcMixed',
          response: { result: 'mixed result' },
        },
      }],
      resultDisplay: 'Mixed tool success',
      error: undefined,
    });

    const mixedStream = (async function* () {
      yield {
        candidates: [{ content: { parts: [{ text: 'Before tool: ' }] } }],
      } as GenerateContentResponse;
      yield {
        functionCalls: [functionCall],
      } as GenerateContentResponse;
      yield {
        candidates: [{ content: { parts: [{ text: 'After function call' }] } }],
      } as GenerateContentResponse;
    })();
    const secondStream = (async function* () {
      yield {
        candidates: [{ content: { parts: [{ text: 'Final response' }] } }],
      } as GenerateContentResponse;
    })();

    mockChat.sendMessageStream
      .mockResolvedValueOnce(mixedStream)
      .mockResolvedValueOnce(secondStream);

    await runNonInteractive(mockConfig, 'Mixed streaming test');

    expect(mockProcessStdoutWrite).toHaveBeenCalledWith('Before tool: ');
    expect(mockProcessStdoutWrite).toHaveBeenCalledWith('After function call');
    expect(mockCoreExecuteToolCall).toHaveBeenCalled();
    expect(mockProcessStdoutWrite).toHaveBeenCalledWith('Final response');
  });
