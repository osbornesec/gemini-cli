/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

const { mockProcessExit } = vi.hoisted(() => ({
  mockProcessExit: vi.fn((_code?: number): never => undefined as never),
}));

vi.mock('node:process', () => ({
  default: {
    exit: mockProcessExit,
    cwd: vi.fn(() => '/mock/cwd'),
    get env() {
      return process.env;
    }, // Use a getter to ensure current process.env is used
    platform: 'test-platform',
    version: 'test-node-version',
    memoryUsage: vi.fn(() => ({
      rss: 12345678,
      heapTotal: 23456789,
      heapUsed: 10234567,
      external: 1234567,
      arrayBuffers: 123456,
    })),
  },
  // Provide top-level exports as well for compatibility
  exit: mockProcessExit,
  cwd: vi.fn(() => '/mock/cwd'),
  get env() {
    return process.env;
  }, // Use a getter here too
  platform: 'test-platform',
  version: 'test-node-version',
  memoryUsage: vi.fn(() => ({
    rss: 12345678,
    heapTotal: 23456789,
    heapUsed: 10234567,
    external: 1234567,
    arrayBuffers: 123456,
  })),
}));

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}));

const mockGetCliVersionFn = vi.fn(() => Promise.resolve('0.1.0'));
vi.mock('../../utils/version.js', () => ({
  getCliVersion: (...args: []) => mockGetCliVersionFn(...args),
}));

import { act, renderHook } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import open from 'open';
import {
  useSlashCommandProcessor,
  type SlashCommandActionReturn,
} from './slashCommandProcessor.js';
import { MessageType } from '../types.js';
import {
  Config,
  MCPDiscoveryState,
  MCPServerStatus,
  getMCPDiscoveryState,
  getMCPServerStatus,
  GeminiClient,
} from '@google/gemini-cli-core';
import { useSessionStats } from '../contexts/SessionContext.js';
import { LoadedSettings } from '../../config/settings.js';
import * as ShowMemoryCommandModule from './useShowMemoryCommand.js';
import { GIT_COMMIT_INFO } from '../../generated/git-commit.js';

vi.mock('../contexts/SessionContext.js', () => ({
  useSessionStats: vi.fn(),
}));

vi.mock('./useShowMemoryCommand.js', () => ({
  SHOW_MEMORY_COMMAND_NAME: '/memory show',
  createShowMemoryAction: vi.fn(() => vi.fn()),
}));

vi.mock('open', () => ({
  default: vi.fn(),
}));

describe('useSlashCommandProcessor', () => {
  let mockAddItem: ReturnType<typeof vi.fn>;
  let mockClearItems: ReturnType<typeof vi.fn>;
  let mockLoadHistory: ReturnType<typeof vi.fn>;
  let mockRefreshStatic: ReturnType<typeof vi.fn>;
  let mockSetShowHelp: ReturnType<typeof vi.fn>;
  let mockOnDebugMessage: ReturnType<typeof vi.fn>;
  let mockOpenThemeDialog: ReturnType<typeof vi.fn>;
  let mockOpenAuthDialog: ReturnType<typeof vi.fn>;
  let mockOpenEditorDialog: ReturnType<typeof vi.fn>;
  let mockPerformMemoryRefresh: ReturnType<typeof vi.fn>;
  let mockSetQuittingMessages: ReturnType<typeof vi.fn>;
  let mockTryCompressChat: ReturnType<typeof vi.fn>;
  let mockGeminiClient: GeminiClient;
  let mockConfig: Config;
  let mockCorgiMode: ReturnType<typeof vi.fn>;
  const mockUseSessionStats = useSessionStats as Mock;

  beforeEach(() => {
    mockAddItem = vi.fn();
    mockClearItems = vi.fn();
    mockLoadHistory = vi.fn();
    mockRefreshStatic = vi.fn();
    mockSetShowHelp = vi.fn();
    mockOnDebugMessage = vi.fn();
    mockOpenThemeDialog = vi.fn();
    mockOpenAuthDialog = vi.fn();
    mockOpenEditorDialog = vi.fn();
    mockPerformMemoryRefresh = vi.fn().mockResolvedValue(undefined);
    mockSetQuittingMessages = vi.fn();
    mockTryCompressChat = vi.fn();
    mockGeminiClient = {
      tryCompressChat: mockTryCompressChat,
    } as unknown as GeminiClient;
    mockConfig = {
      getDebugMode: vi.fn(() => false),
      getGeminiClient: () => mockGeminiClient,
      getSandbox: vi.fn(() => 'test-sandbox'),
      getModel: vi.fn(() => 'test-model'),
      getProjectRoot: vi.fn(() => '/test/dir'),
      getCheckpointingEnabled: vi.fn(() => true),
      getBugCommand: vi.fn(() => undefined),
    } as unknown as Config;
    mockCorgiMode = vi.fn();
    mockUseSessionStats.mockReturnValue({
      stats: {
        sessionStartTime: new Date('2025-01-01T00:00:00.000Z'),
        cumulative: {
          turnCount: 0,
          promptTokenCount: 0,
          candidatesTokenCount: 0,
          totalTokenCount: 0,
          cachedContentTokenCount: 0,
          toolUsePromptTokenCount: 0,
          thoughtsTokenCount: 0,
        },
      },
    });

    (open as Mock).mockClear();
    mockProcessExit.mockClear();
    (ShowMemoryCommandModule.createShowMemoryAction as Mock).mockClear();
    mockPerformMemoryRefresh.mockClear();
    process.env = { ...globalThis.process.env };
  });

  const getProcessorHook = (showToolDescriptions: boolean = false) => {
    const settings = {
      merged: {
        contextFileName: 'GEMINI.md',
      },
    } as LoadedSettings;
    return renderHook(() =>
      useSlashCommandProcessor(
        mockConfig,
        settings,
        [],
        mockAddItem,
        mockClearItems,
        mockLoadHistory,
        mockRefreshStatic,
        mockSetShowHelp,
        mockOnDebugMessage,
        mockOpenThemeDialog,
        mockOpenAuthDialog,
        mockOpenEditorDialog,
        mockPerformMemoryRefresh,
        mockCorgiMode,
        showToolDescriptions,
        mockSetQuittingMessages,
      ),
    );
  };

  const getProcessor = (showToolDescriptions: boolean = false) =>
    getProcessorHook(showToolDescriptions).result.current;

  describe('/memory add', () => {
    it('should return tool scheduling info on valid input', async () => {
      const { handleSlashCommand } = getProcessor();
      const fact = 'Remember this fact';
      let commandResult: SlashCommandActionReturn | boolean = false;
      await act(async () => {
        commandResult = await handleSlashCommand(`/memory add ${fact}`);
      });

      expect(mockAddItem).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          type: MessageType.USER,
          text: `/memory add ${fact}`,
        }),
        expect.any(Number),
      );
      expect(mockAddItem).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          type: MessageType.INFO,
          text: `Attempting to save to memory: "${fact}"`,
        }),
        expect.any(Number),
      );

      expect(commandResult).toEqual({
        shouldScheduleTool: true,
        toolName: 'save_memory',
        toolArgs: { fact },
      });

      expect(mockPerformMemoryRefresh).not.toHaveBeenCalled();
    });

    it('should show usage error and return true if no text is provided', async () => {
      const { handleSlashCommand } = getProcessor();
      let commandResult: SlashCommandActionReturn | boolean = false;
      await act(async () => {
        commandResult = await handleSlashCommand('/memory add ');
      });

      expect(mockAddItem).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          type: MessageType.ERROR,
          text: 'Usage: /memory add <text to remember>',
        }),
        expect.any(Number),
      );
      expect(commandResult).toBe(true);
    });
  });

  describe('/memory show', () => {
    it('should call the showMemoryAction and return true', async () => {
      const mockReturnedShowAction = vi.fn();
      vi.mocked(ShowMemoryCommandModule.createShowMemoryAction).mockReturnValue(
        mockReturnedShowAction,
      );
      const { handleSlashCommand } = getProcessor();
      let commandResult: SlashCommandActionReturn | boolean = false;
      await act(async () => {
        commandResult = await handleSlashCommand('/memory show');
      });
      expect(
        ShowMemoryCommandModule.createShowMemoryAction,
      ).toHaveBeenCalledWith(
        mockConfig,
        expect.any(Object),
        expect.any(Function),
      );
      expect(mockReturnedShowAction).toHaveBeenCalled();
      expect(commandResult).toBe(true);
    });
  });

  describe('/memory refresh', () => {
    it('should call performMemoryRefresh and return true', async () => {
      const { handleSlashCommand } = getProcessor();
      let commandResult: SlashCommandActionReturn | boolean = false;
      await act(async () => {
        commandResult = await handleSlashCommand('/memory refresh');
      });
      expect(mockPerformMemoryRefresh).toHaveBeenCalled();
      expect(commandResult).toBe(true);
    });
  });

  describe('Unknown /memory subcommand', () => {
    it('should show an error for unknown /memory subcommand and return true', async () => {
      const { handleSlashCommand } = getProcessor();
      let commandResult: SlashCommandActionReturn | boolean = false;
      await act(async () => {
        commandResult = await handleSlashCommand('/memory foobar');
      });
      expect(mockAddItem).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          type: MessageType.ERROR,
          text: 'Unknown /memory command: foobar. Available: show, refresh, add',
        }),
        expect.any(Number),
      );
      expect(commandResult).toBe(true);
    });
  });

  describe('/stats command', () => {
    it('should show detailed session statistics', async () => {
      const cumulativeStats = {
        totalTokenCount: 900,
        promptTokenCount: 200,
        candidatesTokenCount: 400,
        cachedContentTokenCount: 100,
        turnCount: 1,
        toolUsePromptTokenCount: 50,
        thoughtsTokenCount: 150,
      };
      mockUseSessionStats.mockReturnValue({
        stats: {
          sessionStartTime: new Date('2025-01-01T00:00:00.000Z'),
          cumulative: cumulativeStats,
        },
      });

      const { handleSlashCommand } = getProcessor();
      const mockDate = new Date('2025-01-01T01:02:03.000Z');
      vi.setSystemTime(mockDate);

      await act(async () => {
        handleSlashCommand('/stats');
      });

      expect(mockAddItem).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          type: MessageType.STATS,
          stats: cumulativeStats,
          duration: '1h 2m 3s',
        }),
        expect.any(Number),
      );

      vi.useRealTimers();
    });
  });

  describe('/about command', () => {
    it('should show the about box with all details including auth and project', async () => {
      mockGetCliVersionFn.mockResolvedValue('test-version');
      process.env.SANDBOX = 'gemini-sandbox';
      process.env.GOOGLE_CLOUD_PROJECT = 'test-gcp-project';
      vi.mocked(mockConfig.getModel).mockReturnValue('test-model-from-config');

      const settings = {
        merged: {
          selectedAuthType: 'test-auth-type',
          contextFileName: 'GEMINI.md',
        },
      } as LoadedSettings;

      const { result } = renderHook(() =>
        useSlashCommandProcessor(
          mockConfig,
          settings,
          [],
          mockAddItem,
          mockClearItems,
          mockLoadHistory,
          mockRefreshStatic,
          mockSetShowHelp,
          mockOnDebugMessage,
          mockOpenThemeDialog,
          mockOpenAuthDialog,
          mockOpenEditorDialog,
          mockPerformMemoryRefresh,
          mockCorgiMode,
          false,
          mockSetQuittingMessages,
        ),
      );

      await act(async () => {
        await result.current.handleSlashCommand('/about');
      });

      expect(mockAddItem).toHaveBeenCalledTimes(2);
      expect(mockAddItem).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          type: 'about',
          cliVersion: 'test-version',
          osVersion: 'test-platform',
          sandboxEnv: 'gemini-sandbox',
          modelVersion: 'test-model-from-config',
          selectedAuthType: 'test-auth-type',
          gcpProject: 'test-gcp-project',
        }),
        expect.any(Number),
      );
    });

    it('should show sandbox-exec profile when applicable', async () => {
      mockGetCliVersionFn.mockResolvedValue('test-version');
      process.env.SANDBOX = 'sandbox-exec';
      process.env.SEATBELT_PROFILE = 'test-profile';
      vi.mocked(mockConfig.getModel).mockReturnValue('test-model-from-config');

      const { result } = getProcessorHook();

      await act(async () => {
        await result.current.handleSlashCommand('/about');
      });

      expect(mockAddItem).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          sandboxEnv: 'sandbox-exec (test-profile)',
        }),
        expect.any(Number),
      );
    });
  });

  describe('Other commands', () => {
    it('/help should open help and return true', async () => {
      const { handleSlashCommand } = getProcessor();
      let commandResult: SlashCommandActionReturn | boolean = false;
      await act(async () => {
        commandResult = await handleSlashCommand('/help');
      });
      expect(mockSetShowHelp).toHaveBeenCalledWith(true);
      expect(commandResult).toBe(true);
    });

    it('/clear should clear items, reset chat, and refresh static', async () => {
      const mockResetChat = vi.fn();
      mockConfig = {
        ...mockConfig,
        getGeminiClient: () => ({
          resetChat: mockResetChat,
        }),
      } as unknown as Config;

      const { handleSlashCommand } = getProcessor();
      let commandResult: SlashCommandActionReturn | boolean = false;
      await act(async () => {
        commandResult = await handleSlashCommand('/clear');
      });

      expect(mockClearItems).toHaveBeenCalled();
      expect(mockResetChat).toHaveBeenCalled();
      expect(mockRefreshStatic).toHaveBeenCalled();
      expect(commandResult).toBe(true);
    });
  });
});