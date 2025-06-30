/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import type { Mocked } from 'vitest';
import { handleAtCommand } from './atCommandProcessor.js';
import { Config, FileDiscoveryService } from '@google/gemini-cli-core';
import { ToolCallStatus } from '../types.js';
import { UseHistoryManagerReturn } from './useHistoryManager.js';
import * as fsPromises from 'fs/promises';
import type { Stats } from 'fs';

const mockGetToolRegistry = vi.fn();
const mockGetTargetDir = vi.fn();
const mockConfig = {
  getToolRegistry: mockGetToolRegistry,
  getTargetDir: mockGetTargetDir,
  isSandboxed: vi.fn(() => false),
  getFileService: vi.fn(),
  getFileFilteringRespectGitIgnore: vi.fn(() => true),
  getEnableRecursiveFileSearch: vi.fn(() => true),
} as unknown as Config;

const mockReadManyFilesExecute = vi.fn();
const mockReadManyFilesTool = {
  name: 'read_many_files',
  displayName: 'Read Many Files',
  description: 'Reads multiple files.',
  execute: mockReadManyFilesExecute,
  getDescription: vi.fn((params) => `Read files: ${params.paths.join(', ')}`),
};

const mockGlobExecute = vi.fn();
const mockGlobTool = {
  name: 'glob',
  displayName: 'Glob Tool',
  execute: mockGlobExecute,
  getDescription: vi.fn(() => 'Glob tool description'),
};

const mockAddItem: Mock<UseHistoryManagerReturn['addItem']> = vi.fn();
const mockOnDebugMessage: Mock<(message: string) => void> = vi.fn();

vi.mock('fs/promises', async () => {
  const actual = await vi.importActual('fs/promises');
  return {
    ...actual,
    stat: vi.fn(),
  };
});

vi.mock('@google/gemini-cli-core', async () => {
  const actual = await vi.importActual('@google/gemini-cli-core');
  return {
    ...actual,
    FileDiscoveryService: vi.fn(),
  };
});

describe('handleAtCommand', () => {
  let abortController: AbortController;
  let mockFileDiscoveryService: Mocked<FileDiscoveryService>;

  beforeEach(() => {
    vi.resetAllMocks();
    abortController = new AbortController();
    mockGetTargetDir.mockReturnValue('/test/dir');
    mockGetToolRegistry.mockReturnValue({
      getTool: vi.fn((toolName: string) => {
        if (toolName === 'read_many_files') return mockReadManyFilesTool;
        if (toolName === 'glob') return mockGlobTool;
        return undefined;
      }),
    });
    vi.mocked(fsPromises.stat).mockResolvedValue({
      isDirectory: () => false,
    } as Stats);
    mockReadManyFilesExecute.mockResolvedValue({
      llmContent: '',
      returnDisplay: '',
    });
    mockGlobExecute.mockResolvedValue({
      llmContent: 'No files found',
      returnDisplay: '',
    });

    mockFileDiscoveryService = {
      initialize: vi.fn(),
      shouldGitIgnoreFile: vi.fn(() => false),
      filterFiles: vi.fn((files) => files),
      getIgnoreInfo: vi.fn(() => ({ gitIgnored: [] })),
      isGitRepository: vi.fn(() => true),
    };
    vi.mocked(FileDiscoveryService).mockImplementation(
      () => mockFileDiscoveryService,
    );

    mockConfig.getFileService = vi
      .fn()
      .mockReturnValue(mockFileDiscoveryService);
  });

  afterEach(() => {
    abortController.abort();
  });

  it('should pass through query if no @ command is present', async () => {
    const query = 'regular user query';
    const result = await handleAtCommand({
      query,
      config: mockConfig,
      addItem: mockAddItem,
      onDebugMessage: mockOnDebugMessage,
      messageId: 123,
      signal: abortController.signal,
    });
    expect(mockAddItem).toHaveBeenCalledWith(
      { type: 'user', text: query },
      123,
    );
    expect(result.processedQuery).toEqual([{ text: query }]);
    expect(result.shouldProceed).toBe(true);
    expect(mockReadManyFilesExecute).not.toHaveBeenCalled();
  });

  it('should pass through original query if only a lone @ symbol is present', async () => {
    const queryWithSpaces = '  @  ';
    const result = await handleAtCommand({
      query: queryWithSpaces,
      config: mockConfig,
      addItem: mockAddItem,
      onDebugMessage: mockOnDebugMessage,
      messageId: 124,
      signal: abortController.signal,
    });
    expect(mockAddItem).toHaveBeenCalledWith(
      { type: 'user', text: queryWithSpaces },
      124,
    );
    expect(result.processedQuery).toEqual([{ text: queryWithSpaces }]);
    expect(result.shouldProceed).toBe(true);
    expect(mockOnDebugMessage).toHaveBeenCalledWith(
      'Lone @ detected, will be treated as text in the modified query.',
    );
  });

  it('should process a valid text file path', async () => {
    const filePath = 'path/to/file.txt';
    const query = `@${filePath}`;
    const fileContent = 'This is the file content.';
    mockReadManyFilesExecute.mockResolvedValue({
      llmContent: [`--- ${filePath} ---\n\n${fileContent}\n\n`],
      returnDisplay: 'Read 1 file.',
    });

    const result = await handleAtCommand({
      query,
      config: mockConfig,
      addItem: mockAddItem,
      onDebugMessage: mockOnDebugMessage,
      messageId: 125,
      signal: abortController.signal,
    });
    expect(mockAddItem).toHaveBeenCalledWith(
      { type: 'user', text: query },
      125,
    );
    expect(mockReadManyFilesExecute).toHaveBeenCalledWith(
      { paths: [filePath], respectGitIgnore: true },
      abortController.signal,
    );
    expect(mockAddItem).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'tool_group',
        tools: [expect.objectContaining({ status: ToolCallStatus.Success })],
      }),
      125,
    );
    expect(result.processedQuery).toEqual([
      { text: `@${filePath}` },
      { text: '\n--- Content from referenced files ---' },
      { text: `\nContent from @${filePath}:\n` },
      { text: fileContent },
      { text: '\n--- End of content ---' },
    ]);
    expect(result.shouldProceed).toBe(true);
  });

  it('should process a valid directory path and convert to glob', async () => {
    const dirPath = 'path/to/dir';
    const query = `@${dirPath}`;
    const resolvedGlob = `${dirPath}/**`;
    const fileContent = 'Directory content.';
    vi.mocked(fsPromises.stat).mockResolvedValue({
      isDirectory: () => true,
    } as Stats);
    mockReadManyFilesExecute.mockResolvedValue({
      llmContent: [`--- ${resolvedGlob} ---\n\n${fileContent}\n\n`],
      returnDisplay: 'Read directory contents.',
    });

    const result = await handleAtCommand({
      query,
      config: mockConfig,
      addItem: mockAddItem,
      onDebugMessage: mockOnDebugMessage,
      messageId: 126,
      signal: abortController.signal,
    });
    expect(mockAddItem).toHaveBeenCalledWith(
      { type: 'user', text: query },
      126,
    );
    expect(mockReadManyFilesExecute).toHaveBeenCalledWith(
      { paths: [resolvedGlob], respectGitIgnore: true },
      abortController.signal,
    );
    expect(mockOnDebugMessage).toHaveBeenCalledWith(
      `Path ${dirPath} resolved to directory, using glob: ${resolvedGlob}`,
    );
    expect(result.processedQuery).toEqual([
      { text: `@${resolvedGlob}` },
      { text: '\n--- Content from referenced files ---' },
      { text: `\nContent from @${resolvedGlob}:\n` },
      { text: fileContent },
      { text: '\n--- End of content ---' },
    ]);
    expect(result.shouldProceed).toBe(true);
  });

  it('should process a valid image file path (as text content for now)', async () => {
    const imagePath = 'path/to/image.png';
    const query = `@${imagePath}`;
    const imagePart = {
      mimeType: 'image/png',
      inlineData: '[base64 image data for path/to/image.png]',
    };
    mockReadManyFilesExecute.mockResolvedValue({
      llmContent: [imagePart],
      returnDisplay: 'Read 1 image.',
    });

    const result = await handleAtCommand({
      query,
      config: mockConfig,
      addItem: mockAddItem,
      onDebugMessage: mockOnDebugMessage,
      messageId: 127,
      signal: abortController.signal,
    });
    expect(result.processedQuery).toEqual([
      { text: `@${imagePath}` },
      { text: '\n--- Content from referenced files ---' },
      imagePart,
      { text: '\n--- End of content ---' },
    ]);
    expect(result.shouldProceed).toBe(true);
  });

  it('should handle query with text before and after @command', async () => {
    const textBefore = 'Explain this: ';
    const filePath = 'doc.md';
    const textAfter = ' in detail.';
    const query = `${textBefore}@${filePath}${textAfter}`;
    const fileContent = 'Markdown content.';
    mockReadManyFilesExecute.mockResolvedValue({
      llmContent: [`--- ${filePath} ---\n\n${fileContent}\n\n`],
      returnDisplay: 'Read 1 doc.',
    });

    const result = await handleAtCommand({
      query,
      config: mockConfig,
      addItem: mockAddItem,
      onDebugMessage: mockOnDebugMessage,
      messageId: 128,
      signal: abortController.signal,
    });
    expect(mockAddItem).toHaveBeenCalledWith(
      { type: 'user', text: query },
      128,
    );
    expect(result.processedQuery).toEqual([
      { text: `${textBefore}@${filePath}${textAfter}` },
      { text: '\n--- Content from referenced files ---' },
      { text: `\nContent from @${filePath}:\n` },
      { text: fileContent },
      { text: '\n--- End of content ---' },
    ]);
    expect(result.shouldProceed).toBe(true);
  });

  it('should correctly unescape paths with escaped spaces', async () => {
    const rawPath = 'path/to/my\\ file.txt';
    const unescapedPath = 'path/to/my file.txt';
    const query = `@${rawPath}`;
    const fileContent = 'Content of file with space.';
    mockReadManyFilesExecute.mockResolvedValue({
      llmContent: [`--- ${unescapedPath} ---\n\n${fileContent}\n\n`],
      returnDisplay: 'Read 1 file.',
    });

    await handleAtCommand({
      query,
      config: mockConfig,
      addItem: mockAddItem,
      onDebugMessage: mockOnDebugMessage,
      messageId: 129,
      signal: abortController.signal,
    });
    expect(mockReadManyFilesExecute).toHaveBeenCalledWith(
      { paths: [unescapedPath], respectGitIgnore: true },
      abortController.signal,
    );
  });

  it('should handle multiple @file references', async () => {
    const file1 = 'file1.txt';
    const content1 = 'Content file1';
    const file2 = 'file2.md';
    const content2 = 'Content file2';
    const query = `@${file1} @${file2}`;

    mockReadManyFilesExecute.mockResolvedValue({
      llmContent: [
        `--- ${file1} ---\n\n${content1}\n\n`,
        `--- ${file2} ---\n\n${content2}\n\n`,
      ],
      returnDisplay: 'Read 2 files.',
    });

    const result = await handleAtCommand({
      query,
      config: mockConfig,
      addItem: mockAddItem,
      onDebugMessage: mockOnDebugMessage,
      messageId: 130,
      signal: abortController.signal,
    });
    expect(mockReadManyFilesExecute).toHaveBeenCalledWith(
      { paths: [file1, file2], respectGitIgnore: true },
      abortController.signal,
    );
    expect(result.processedQuery).toEqual([
      { text: `@${file1} @${file2}` },
      { text: '\n--- Content from referenced files ---' },
      { text: `\nContent from @${file1}:\n` },
      { text: content1 },
      { text: `\nContent from @${file2}:\n` },
      { text: content2 },
      { text: '\n--- End of content ---' },
    ]);
    expect(result.shouldProceed).toBe(true);
  });

  it('should handle multiple @file references with interleaved text', async () => {
    const text1 = 'Check ';
    const file1 = 'f1.txt';
    const content1 = 'C1';
    const text2 = ' and ';
    const file2 = 'f2.md';
    const content2 = 'C2';
    const text3 = ' please.';
    const query = `${text1}@${file1}${text2}@${file2}${text3}`;

    mockReadManyFilesExecute.mockResolvedValue({
      llmContent: [
        `--- ${file1} ---\n\n${content1}\n\n`,
        `--- ${file2} ---\n\n${content2}\n\n`,
      ],
      returnDisplay: 'Read 2 files.',
    });

    const result = await handleAtCommand({
      query,
      config: mockConfig,
      addItem: mockAddItem,
      onDebugMessage: mockOnDebugMessage,
      messageId: 131,
      signal: abortController.signal,
    });
    expect(mockReadManyFilesExecute).toHaveBeenCalledWith(
      { paths: [file1, file2], respectGitIgnore: true },
      abortController.signal,
    );
    expect(result.processedQuery).toEqual([
      { text: `${text1}@${file1}${text2}@${file2}${text3}` },
      { text: '\n--- Content from referenced files ---' },
      { text: `\nContent from @${file1}:\n` },
      { text: content1 },
      { text: `\nContent from @${file2}:\n` },
      { text: content2 },
      { text: '\n--- End of content ---' },
    ]);
    expect(result.shouldProceed).toBe(true);
  });

  it('should handle a mix of valid, invalid, and lone @ references', async () => {
    const file1 = 'valid1.txt';
    const content1 = 'Valid content 1';
    const invalidFile = 'nonexistent.txt';
    const query = `Look at @${file1} then @${invalidFile} and also just @ symbol, then @valid2.glob`;
    const file2Glob = 'valid2.glob';
    const resolvedFile2 = 'resolved/valid2.actual';
    const content2 = 'Globbed content';

    vi.mocked(fsPromises.stat).mockImplementation(async (p) => {
      if (p.toString().endsWith(file1))
        return { isDirectory: () => false } as Stats;
      if (p.toString().endsWith(invalidFile))
        throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      if (p.toString().endsWith(file2Glob))
        throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      return { isDirectory: () => false } as Stats;
    });

    mockGlobExecute.mockImplementation(async (params) => {
      if (params.pattern.includes('valid2.glob')) {
        return {
          llmContent: `Found files:\n${mockGetTargetDir()}/${resolvedFile2}`,
          returnDisplay: 'Found 1 file',
        };
      }
      return { llmContent: 'No files found', returnDisplay: '' };
    });

    mockReadManyFilesExecute.mockResolvedValue({
      llmContent: [
        `--- ${file1} ---\n\n${content1}\n\n`,
        `--- ${resolvedFile2} ---\n\n${content2}\n\n`,
      ],
      returnDisplay: 'Read 2 files.',
    });

    const result = await handleAtCommand({
      query,
      config: mockConfig,
      addItem: mockAddItem,
      onDebugMessage: mockOnDebugMessage,
      messageId: 132,
      signal: abortController.signal,
    });

    expect(mockReadManyFilesExecute).toHaveBeenCalledWith(
      { paths: [file1, resolvedFile2], respectGitIgnore: true },
      abortController.signal,
    );
    expect(result.processedQuery).toEqual([
      {
        text: `Look at @${file1} then @${invalidFile} and also just @ symbol, then @${resolvedFile2}`,
      },
      { text: '\n--- Content from referenced files ---' },
      { text: `\nContent from @${file1}:\n` },
      { text: content1 },
      { text: `\nContent from @${resolvedFile2}:\n` },
      { text: content2 },
      { text: '\n--- End of content ---' },
    ]);
    expect(result.shouldProceed).toBe(true);
    expect(mockOnDebugMessage).toHaveBeenCalledWith(
      `Path ${invalidFile} not found directly, attempting glob search.`,
    );
    expect(mockOnDebugMessage).toHaveBeenCalledWith(
      `Glob search for '**/*${invalidFile}*' found no files or an error. Path ${invalidFile} will be skipped.`,
    );
    expect(mockOnDebugMessage).toHaveBeenCalledWith(
      'Lone @ detected, will be treated as text in the modified query.',
    );
  });

  it('should return original query if all @paths are invalid or lone @', async () => {
    const query = 'Check @nonexistent.txt and @ also';
    vi.mocked(fsPromises.stat).mockRejectedValue(
      Object.assign(new Error('ENOENT'), { code: 'ENOENT' }),
    );
    mockGlobExecute.mockResolvedValue({
      llmContent: 'No files found',
      returnDisplay: '',
    });

    const result = await handleAtCommand({
      query,
      config: mockConfig,
      addItem: mockAddItem,
      onDebugMessage: mockOnDebugMessage,
      messageId: 133,
      signal: abortController.signal,
    });
    expect(mockReadManyFilesExecute).not.toHaveBeenCalled();
    expect(result.processedQuery).toEqual([
      { text: 'Check @nonexistent.txt and @ also' },
    ]);
    expect(result.shouldProceed).toBe(true);
  });

  it('should process a file path case-insensitively', async () => {
    const queryPath = 'path/to/myfile.txt';
    const query = `@${queryPath}`;
    const fileContent = 'This is the case-insensitive file content.';

    vi.mocked(fsPromises.stat).mockImplementation(async (p) => {
      if (p.toString().toLowerCase().endsWith('myfile.txt')) {
        return {
          isDirectory: () => false,
        } as Stats;
      }
      throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    });

    mockReadManyFilesExecute.mockResolvedValue({
      llmContent: [`--- ${queryPath} ---\n\n${fileContent}\n\n`],
      returnDisplay: 'Read 1 file.',
    });

    const result = await handleAtCommand({
      query,
      config: mockConfig,
      addItem: mockAddItem,
      onDebugMessage: mockOnDebugMessage,
      messageId: 134,
      signal: abortController.signal,
    });

    expect(mockAddItem).toHaveBeenCalledWith(
      { type: 'user', text: query },
      134,
    );
    expect(mockReadManyFilesExecute).toHaveBeenCalledWith(
      { paths: [queryPath], respectGitIgnore: true },
      abortController.signal,
    );
    expect(mockAddItem).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'tool_group',
        tools: [expect.objectContaining({ status: ToolCallStatus.Success })],
      }),
      134,
    );
    expect(result.processedQuery).toEqual([
      { text: `@${queryPath}` },
      { text: '\n--- Content from referenced files ---' },
      { text: `\nContent from @${queryPath}:\n` },
      { text: fileContent },
      { text: '\n--- End of content ---' },
    ]);
    expect(result.shouldProceed).toBe(true);
  });

  describe('git-aware filtering', () => {
    it('should skip git-ignored files in @ commands', async () => {
      const gitIgnoredFile = 'node_modules/package.json';
      const query = `@${gitIgnoredFile}`;

      mockFileDiscoveryService.shouldGitIgnoreFile.mockImplementation(
        (path: string) => path === gitIgnoredFile,
      );

      const result = await handleAtCommand({
        query,
        config: mockConfig,
        addItem: mockAddItem,
        onDebugMessage: mockOnDebugMessage,
        messageId: 200,
        signal: abortController.signal,
      });

      expect(mockFileDiscoveryService.shouldGitIgnoreFile).toHaveBeenCalledWith(
        gitIgnoredFile,
      );
      expect(mockOnDebugMessage).toHaveBeenCalledWith(
        `Path ${gitIgnoredFile} is git-ignored and will be skipped.`,
      );
      expect(mockOnDebugMessage).toHaveBeenCalledWith(
        'Ignored 1 git-ignored files: node_modules/package.json',
      );
      expect(mockReadManyFilesExecute).not.toHaveBeenCalled();
      expect(result.processedQuery).toEqual([{ text: query }]);
      expect(result.shouldProceed).toBe(true);
    });

    it('should process non-git-ignored files normally', async () => {
      const validFile = 'src/index.ts';
      const query = `@${validFile}`;
      const fileContent = 'console.log("Hello world");';

      mockFileDiscoveryService.shouldGitIgnoreFile.mockReturnValue(false);
      mockReadManyFilesExecute.mockResolvedValue({
        llmContent: [`--- ${validFile} ---\n\n${fileContent}\n\n`],
        returnDisplay: 'Read 1 file.',
      });

      const result = await handleAtCommand({
        query,
        config: mockConfig,
        addItem: mockAddItem,
        onDebugMessage: mockOnDebugMessage,
        messageId: 201,
        signal: abortController.signal,
      });

      expect(mockFileDiscoveryService.shouldGitIgnoreFile).toHaveBeenCalledWith(
        validFile,
      );
      expect(mockReadManyFilesExecute).toHaveBeenCalledWith(
        { paths: [validFile], respectGitIgnore: true },
        abortController.signal,
      );
      expect(result.processedQuery).toEqual([
        { text: `@${validFile}` },
        { text: '\n--- Content from referenced files ---' },
        { text: `\nContent from @${validFile}:\n` },
        { text: fileContent },
        { text: '\n--- End of content ---' },
      ]);
      expect(result.shouldProceed).toBe(true);
    });

    it('should handle mixed git-ignored and valid files', async () => {
      const validFile = 'README.md';
      const gitIgnoredFile = '.env';
      const query = `@${validFile} @${gitIgnoredFile}`;
      const fileContent = '# Project README';

      mockFileDiscoveryService.shouldGitIgnoreFile.mockImplementation(
        (path: string) => path === gitIgnoredFile,
      );
      mockReadManyFilesExecute.mockResolvedValue({
        llmContent: [`--- ${validFile} ---\n\n${fileContent}\n\n`],
        returnDisplay: 'Read 1 file.',
      });

      const result = await handleAtCommand({
        query,
        config: mockConfig,
        addItem: mockAddItem,
        onDebugMessage: mockOnDebugMessage,
        messageId: 202,
        signal: abortController.signal,
      });

      expect(mockFileDiscoveryService.shouldGitIgnoreFile).toHaveBeenCalledWith(
        validFile,
      );
      expect(mockFileDiscoveryService.shouldGitIgnoreFile).toHaveBeenCalledWith(
        gitIgnoredFile,
      );
      expect(mockOnDebugMessage).toHaveBeenCalledWith(
        `Path ${gitIgnoredFile} is git-ignored and will be skipped.`,
      );
      expect(mockOnDebugMessage).toHaveBeenCalledWith(
        'Ignored 1 git-ignored files: .env',
      );
      expect(mockReadManyFilesExecute).toHaveBeenCalledWith(
        { paths: [validFile], respectGitIgnore: true },
        abortController.signal,
      );
      expect(result.processedQuery).toEqual([
        { text: `@${validFile} @${gitIgnoredFile}` },
        { text: '\n--- Content from referenced files ---' },
        { text: `\nContent from @${validFile}:\n` },
        { text: fileContent },
        { text: '\n--- End of content ---' },
      ]);
      expect(result.shouldProceed).toBe(true);
    });

    it('should always ignore .git directory files', async () => {
      const gitFile = '.git/config';
      const query = `@${gitFile}`;

      mockFileDiscoveryService.shouldGitIgnoreFile.mockReturnValue(true);

      const result = await handleAtCommand({
        query,
        config: mockConfig,
        addItem: mockAddItem,
        onDebugMessage: mockOnDebugMessage,
        messageId: 203,
        signal: abortController.signal,
      });

      expect(mockFileDiscoveryService.shouldGitIgnoreFile).toHaveBeenCalledWith(
        gitFile,
      );
      expect(mockOnDebugMessage).toHaveBeenCalledWith(
        `Path ${gitFile} is git-ignored and will be skipped.`,
      );
      expect(mockReadManyFilesExecute).not.toHaveBeenCalled();
      expect(result.processedQuery).toEqual([{ text: query }]);
      expect(result.shouldProceed).toBe(true);
    });
  });

  describe('when recursive file search is disabled', () => {
    beforeEach(() => {
      vi.mocked(mockConfig.getEnableRecursiveFileSearch).mockReturnValue(false);
    });

    it('should not use glob search for a nonexistent file', async () => {
      const invalidFile = 'nonexistent.txt';
      const query = `@${invalidFile}`;

      vi.mocked(fsPromises.stat).mockRejectedValue(
        Object.assign(new Error('ENOENT'), { code: 'ENOENT' }),
      );

      const result = await handleAtCommand({
        query,
        config: mockConfig,
        addItem: mockAddItem,
        onDebugMessage: mockOnDebugMessage,
        messageId: 300,
        signal: abortController.signal,
      });

      expect(mockGlobExecute).not.toHaveBeenCalled();
      expect(mockOnDebugMessage).toHaveBeenCalledWith(
        `Glob tool not found. Path ${invalidFile} will be skipped.`,
      );
      expect(result.processedQuery).toEqual([{ text: query }]);
      expect(result.shouldProceed).toBe(true);
    });
  });

  describe("parsing functionality edge cases", () => {
    it("should handle @ symbols within file paths", async () => {
      const filePath = "user@domain/file.txt";
      const query = `@${filePath}`;
      
      mockReadManyFilesExecute.mockResolvedValue({
        llmContent: [`--- ${filePath} ---\n\nEmail-like path content\n\n`],
        returnDisplay: "Read 1 file.",
      });
      
      const result = await handleAtCommand({
        query,
        config: mockConfig,
        addItem: mockAddItem,
        onDebugMessage: mockOnDebugMessage,
        messageId: 350,
        signal: abortController.signal,
      });
      
      expect(mockReadManyFilesExecute).toHaveBeenCalledWith(
        { paths: [filePath], respectGitIgnore: true },
        abortController.signal,
      );
      expect(result.shouldProceed).toBe(true);
    });
    
    it("should handle nested @ references in complex queries", async () => {
      const nestedQuery = "Compare @file1.txt with @file2.txt and email user@example.com about @results.log";
      const file1Content = "File 1 content";
      const file2Content = "File 2 content";
      const file3Content = "Results content";
      
      mockReadManyFilesExecute.mockResolvedValue({
        llmContent: [
          `--- file1.txt ---\n\n${file1Content}\n\n`,
          `--- file2.txt ---\n\n${file2Content}\n\n`,
          `--- results.log ---\n\n${file3Content}\n\n`,
        ],
        returnDisplay: "Read 3 files.",
      });
      
      const result = await handleAtCommand({
        query: nestedQuery,
        config: mockConfig,
        addItem: mockAddItem,
        onDebugMessage: mockOnDebugMessage,
        messageId: 351,
        signal: abortController.signal,
      });
      
      expect(mockReadManyFilesExecute).toHaveBeenCalledWith(
        { paths: ["file1.txt", "file2.txt", "results.log"], respectGitIgnore: true },
        abortController.signal,
      );
      expect(result.processedQuery).toContainEqual({ text: file1Content });
      expect(result.processedQuery).toContainEqual({ text: file2Content });
      expect(result.processedQuery).toContainEqual({ text: file3Content });
    });
    
    it("should handle @ commands at word boundaries correctly", async () => {
      const query = "email@domain.com has @file.txt and contact@company.org";
      const fileContent = "File content";
      
      mockReadManyFilesExecute.mockResolvedValue({
        llmContent: [`--- file.txt ---\n\n${fileContent}\n\n`],
        returnDisplay: "Read 1 file.",
      });
      
      const result = await handleAtCommand({
        query,
        config: mockConfig,
        addItem: mockAddItem,
        onDebugMessage: mockOnDebugMessage,
        messageId: 352,
        signal: abortController.signal,
      });
      
      expect(mockReadManyFilesExecute).toHaveBeenCalledWith(
        { paths: ["file.txt"], respectGitIgnore: true },
        abortController.signal,
      );
      expect(result.processedQuery).toContainEqual({ text: fileContent });
    });
  });

  describe("error handling and edge cases", () => {
    it("should handle tool execution errors gracefully", async () => {
      const filePath = "error-file.txt";
      const query = `@${filePath}`;
      const errorMessage = "Tool execution failed";
      
      mockReadManyFilesExecute.mockRejectedValue(new Error(errorMessage));
      
      const result = await handleAtCommand({
        query,
        config: mockConfig,
        addItem: mockAddItem,
        onDebugMessage: mockOnDebugMessage,
        messageId: 400,
        signal: abortController.signal,
      });
      
      expect(mockAddItem).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "tool_group",
          tools: [expect.objectContaining({ status: ToolCallStatus.Error })],
        }),
        400,
      );
      expect(mockOnDebugMessage).toHaveBeenCalledWith(
        expect.stringContaining("Error"),
      );
      expect(result.processedQuery).toEqual([{ text: query }]);
      expect(result.shouldProceed).toBe(true);
    });
    
    it("should handle abort signal during tool execution", async () => {
      const filePath = "slow-file.txt";
      const query = `@${filePath}`;
      const testAbortController = new AbortController();
      
      mockReadManyFilesExecute.mockImplementation(async (_, signal) => {
        return new Promise((_, reject) => {
          signal?.addEventListener("abort", () => {
            reject(new Error("Operation aborted"));
          });
          setTimeout(() => testAbortController.abort(), 10);
        });
      });
      
      await expect(
        handleAtCommand({
          query,
          config: mockConfig,
          addItem: mockAddItem,
          onDebugMessage: mockOnDebugMessage,
          messageId: 401,
          signal: testAbortController.signal,
        }),
      ).rejects.toThrow("Operation aborted");
    });
    
    it("should handle missing tool from registry", async () => {
      const filePath = "test-file.txt";
      const query = `@${filePath}`;
      
      mockGetToolRegistry.mockReturnValue({
        getTool: vi.fn(() => undefined),
      });
      
      const result = await handleAtCommand({
        query,
        config: mockConfig,
        addItem: mockAddItem,
        onDebugMessage: mockOnDebugMessage,
        messageId: 402,
        signal: abortController.signal,
      });
      
      expect(mockOnDebugMessage).toHaveBeenCalledWith(
        "read_many_files tool not found in registry.",
      );
      expect(result.processedQuery).toEqual([{ text: query }]);
      expect(result.shouldProceed).toBe(true);
    });
    
    it("should handle file service initialization error", async () => {
      const filePath = "test-file.txt";
      const query = `@${filePath}`;
      
      mockFileDiscoveryService.initialize.mockRejectedValue(
        new Error("File service init failed"),
      );
      
      const result = await handleAtCommand({
        query,
        config: mockConfig,
        addItem: mockAddItem,
        onDebugMessage: mockOnDebugMessage,
        messageId: 403,
        signal: abortController.signal,
      });
      
      expect(mockOnDebugMessage).toHaveBeenCalledWith(
        expect.stringContaining("Error initializing file service"),
      );
      expect(result.processedQuery).toEqual([{ text: query }]);
      expect(result.shouldProceed).toBe(true);
    });
  });
  
  describe("boundary conditions and edge cases", () => {
    it("should handle empty query string", async () => {
      const result = await handleAtCommand({
        query: "",
        config: mockConfig,
        addItem: mockAddItem,
        onDebugMessage: mockOnDebugMessage,
        messageId: 500,
        signal: abortController.signal,
      });
      
      expect(result.processedQuery).toEqual([{ text: "" }]);
      expect(result.shouldProceed).toBe(true);
      expect(mockReadManyFilesExecute).not.toHaveBeenCalled();
    });
    
    it("should handle query with only whitespace", async () => {
      const query = "   \n\t   ";
      const result = await handleAtCommand({
        query,
        config: mockConfig,
        addItem: mockAddItem,
        onDebugMessage: mockOnDebugMessage,
        messageId: 501,
        signal: abortController.signal,
      });
      
      expect(result.processedQuery).toEqual([{ text: query }]);
      expect(result.shouldProceed).toBe(true);
    });
    
    it("should handle very long file paths", async () => {
      const longPath = "a".repeat(1000) + ".txt";
      const query = `@${longPath}`;
      
      vi.mocked(fsPromises.stat).mockRejectedValue(
        Object.assign(new Error("ENAMETOOLONG"), { code: "ENAMETOOLONG" }),
      );
      
      const result = await handleAtCommand({
        query,
        config: mockConfig,
        addItem: mockAddItem,
        onDebugMessage: mockOnDebugMessage,
        messageId: 502,
        signal: abortController.signal,
      });
      
      expect(mockOnDebugMessage).toHaveBeenCalledWith(
        expect.stringContaining("not found directly"),
      );
      expect(result.processedQuery).toEqual([{ text: query }]);
      expect(result.shouldProceed).toBe(true);
    });
    
    it("should handle paths with special characters", async () => {
      const specialPath = "file-with-ñ-ü-€-symbols.txt";
      const query = `@${specialPath}`;
      const fileContent = "Content with unicode: 你好世界";
      
      mockReadManyFilesExecute.mockResolvedValue({
        llmContent: [`--- ${specialPath} ---\n\n${fileContent}\n\n`],
        returnDisplay: "Read 1 file.",
      });
      
      const result = await handleAtCommand({
        query,
        config: mockConfig,
        addItem: mockAddItem,
        onDebugMessage: mockOnDebugMessage,
        messageId: 503,
        signal: abortController.signal,
      });
      
      expect(mockReadManyFilesExecute).toHaveBeenCalledWith(
        { paths: [specialPath], respectGitIgnore: true },
        abortController.signal,
      );
      expect(result.processedQuery).toContainEqual({ text: fileContent });
    });
    
    it("should handle multiple consecutive @ symbols", async () => {
      const query = "Check @@file.txt and @@@another.txt";
      
      const result = await handleAtCommand({
        query,
        config: mockConfig,
        addItem: mockAddItem,
        onDebugMessage: mockOnDebugMessage,
        messageId: 504,
        signal: abortController.signal,
      });
      
      expect(mockOnDebugMessage).toHaveBeenCalledWith(
        expect.stringContaining("Lone @ detected"),
      );
      expect(result.processedQuery).toEqual([{ text: query }]);
      expect(result.shouldProceed).toBe(true);
    });
    
    it("should handle @ at the end of query", async () => {
      const query = "Check this file @";
      
      const result = await handleAtCommand({
        query,
        config: mockConfig,
        addItem: mockAddItem,
        onDebugMessage: mockOnDebugMessage,
        messageId: 505,
        signal: abortController.signal,
      });
      
      expect(mockOnDebugMessage).toHaveBeenCalledWith(
        "Lone @ detected, will be treated as text in the modified query.",
      );
      expect(result.processedQuery).toEqual([{ text: query }]);
      expect(result.shouldProceed).toBe(true);
    });
  });
  
  describe("tool response variations", () => {
    it("should handle tool returning empty content", async () => {
      const filePath = "empty-file.txt";
      const query = `@${filePath}`;
      
      mockReadManyFilesExecute.mockResolvedValue({
        llmContent: [],
        returnDisplay: "No content found.",
      });
      
      const result = await handleAtCommand({
        query,
        config: mockConfig,
        addItem: mockAddItem,
        onDebugMessage: mockOnDebugMessage,
        messageId: 600,
        signal: abortController.signal,
      });
      
      expect(result.processedQuery).toEqual([
        { text: `@${filePath}` },
        { text: "\n--- Content from referenced files ---" },
        { text: "\n--- End of content ---" },
      ]);
      expect(result.shouldProceed).toBe(true);
    });
    
    it("should handle tool returning mixed content types", async () => {
      const filePath = "mixed-content.txt";
      const query = `@${filePath}`;
      const textContent = "Text content";
      const imagePart = {
        mimeType: "image/jpeg",
        inlineData: "base64imagedata",
      };
      
      mockReadManyFilesExecute.mockResolvedValue({
        llmContent: [textContent, imagePart],
        returnDisplay: "Read mixed content.",
      });
      
      const result = await handleAtCommand({
        query,
        config: mockConfig,
        addItem: mockAddItem,
        onDebugMessage: mockOnDebugMessage,
        messageId: 601,
        signal: abortController.signal,
      });
      
      expect(result.processedQuery).toContainEqual({ text: textContent });
      expect(result.processedQuery).toContainEqual(imagePart);
      expect(result.shouldProceed).toBe(true);
    });
    
    it("should handle null/undefined content from tool", async () => {
      const filePath = "null-content.txt";
      const query = `@${filePath}`;
      
      mockReadManyFilesExecute.mockResolvedValue({
        llmContent: null,
        returnDisplay: "No content.",
      });
      
      const result = await handleAtCommand({
        query,
        config: mockConfig,
        addItem: mockAddItem,
        onDebugMessage: mockOnDebugMessage,
        messageId: 602,
        signal: abortController.signal,
      });
      
      expect(result.processedQuery).toEqual([
        { text: `@${filePath}` },
        { text: "\n--- Content from referenced files ---" },
        { text: "\n--- End of content ---" },
      ]);
      expect(result.shouldProceed).toBe(true);
    });
  });
  
  describe("configuration edge cases", () => {
    it("should handle sandboxed environment", async () => {
      const filePath = "sandboxed-file.txt";
      const query = `@${filePath}`;
      
      mockConfig.isSandboxed = vi.fn(() => true);
      mockReadManyFilesExecute.mockResolvedValue({
        llmContent: ["Sandboxed content"],
        returnDisplay: "Read from sandbox.",
      });
      
      const result = await handleAtCommand({
        query,
        config: mockConfig,
        addItem: mockAddItem,
        onDebugMessage: mockOnDebugMessage,
        messageId: 700,
        signal: abortController.signal,
      });
      
      expect(mockReadManyFilesExecute).toHaveBeenCalledWith(
        { paths: [filePath], respectGitIgnore: true },
        abortController.signal,
      );
      expect(result.shouldProceed).toBe(true);
    });
    
    it("should handle missing file service", async () => {
      const filePath = "no-service-file.txt";
      const query = `@${filePath}`;
      
      mockConfig.getFileService = vi.fn().mockReturnValue(null);
      
      const result = await handleAtCommand({
        query,
        config: mockConfig,
        addItem: mockAddItem,
        onDebugMessage: mockOnDebugMessage,
        messageId: 701,
        signal: abortController.signal,
      });
      
      expect(mockOnDebugMessage).toHaveBeenCalledWith(
        expect.stringContaining("File service not available"),
      );
      expect(result.processedQuery).toEqual([{ text: query }]);
      expect(result.shouldProceed).toBe(true);
    });
    
    it("should respect git ignore disabled setting", async () => {
      const filePath = "git-ignored-file.txt";
      const query = `@${filePath}`;
      
      mockConfig.getFileFilteringRespectGitIgnore = vi.fn(() => false);
      mockFileDiscoveryService.shouldGitIgnoreFile.mockReturnValue(true);
      mockReadManyFilesExecute.mockResolvedValue({
        llmContent: ["Content despite git ignore"],
        returnDisplay: "Read ignored file.",
      });
      
      const result = await handleAtCommand({
        query,
        config: mockConfig,
        addItem: mockAddItem,
        onDebugMessage: mockOnDebugMessage,
        messageId: 702,
        signal: abortController.signal,
      });
      
      expect(mockReadManyFilesExecute).toHaveBeenCalledWith(
        { paths: [filePath], respectGitIgnore: false },
        abortController.signal,
      );
      expect(result.shouldProceed).toBe(true);
    });
  });
  
  describe("glob pattern edge cases", () => {
    it("should handle complex glob patterns", async () => {
      const globPattern = "**/*.{ts,js}";
      const query = `@${globPattern}`;
      
      vi.mocked(fsPromises.stat).mockRejectedValue(
        Object.assign(new Error("ENOENT"), { code: "ENOENT" }),
      );
      
      const foundFiles = ["src/file1.ts", "lib/file2.js"];
      mockGlobExecute.mockResolvedValue({
        llmContent: `Found files:\n${foundFiles.join("\n")}`,
        returnDisplay: `Found ${foundFiles.length} files`,
      });
      
      mockReadManyFilesExecute.mockResolvedValue({
        llmContent: foundFiles.map(f => `--- ${f} ---\n\nContent\n\n`),
        returnDisplay: `Read ${foundFiles.length} files.`,
      });
      
      const result = await handleAtCommand({
        query,
        config: mockConfig,
        addItem: mockAddItem,
        onDebugMessage: mockOnDebugMessage,
        messageId: 800,
        signal: abortController.signal,
      });
      
      expect(mockGlobExecute).toHaveBeenCalledWith(
        { pattern: `**/*${globPattern}*` },
        abortController.signal,
      );
      expect(result.shouldProceed).toBe(true);
    });
    
    it("should handle glob returning no matches", async () => {
      const pattern = "*.nonexistent";
      const query = `@${pattern}`;
      
      vi.mocked(fsPromises.stat).mockRejectedValue(
        Object.assign(new Error("ENOENT"), { code: "ENOENT" }),
      );
      
      mockGlobExecute.mockResolvedValue({
        llmContent: "No files found",
        returnDisplay: "No matches",
      });
      
      const result = await handleAtCommand({
        query,
        config: mockConfig,
        addItem: mockAddItem,
        onDebugMessage: mockOnDebugMessage,
        messageId: 801,
        signal: abortController.signal,
      });
      
      expect(mockOnDebugMessage).toHaveBeenCalledWith(
        expect.stringContaining("found no files"),
      );
      expect(mockReadManyFilesExecute).not.toHaveBeenCalled();
      expect(result.processedQuery).toEqual([{ text: query }]);
    });
    
    it("should handle glob tool error", async () => {
      const pattern = "error-pattern.*";
      const query = `@${pattern}`;
      
      vi.mocked(fsPromises.stat).mockRejectedValue(
        Object.assign(new Error("ENOENT"), { code: "ENOENT" }),
      );
      
      mockGlobExecute.mockRejectedValue(new Error("Glob execution failed"));
      
      const result = await handleAtCommand({
        query,
        config: mockConfig,
        addItem: mockAddItem,
        onDebugMessage: mockOnDebugMessage,
        messageId: 802,
        signal: abortController.signal,
      });
      
      expect(mockOnDebugMessage).toHaveBeenCalledWith(
        expect.stringContaining("found no files"),
      );
      expect(result.processedQuery).toEqual([{ text: query }]);
      expect(result.shouldProceed).toBe(true);
    });
  });
  
  describe("path escaping and special characters", () => {
    it("should handle paths with multiple escaped characters", async () => {
      const rawPath = "path\\ with\\ multiple\\ spaces\\ and\\ttab.txt";
      const unescapedPath = "path\\ with\\ multiple\\ spaces\\ and\\ttab.txt";
      const query = `@${rawPath}`;
      
      mockReadManyFilesExecute.mockResolvedValue({
        llmContent: [`--- ${unescapedPath} ---\n\nContent\n\n`],
        returnDisplay: "Read 1 file.",
      });
      
      await handleAtCommand({
        query,
        config: mockConfig,
        addItem: mockAddItem,
        onDebugMessage: mockOnDebugMessage,
        messageId: 900,
        signal: abortController.signal,
      });
      
      expect(mockReadManyFilesExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          paths: expect.arrayContaining([expect.stringContaining("multiple")]),
        }),
        abortController.signal,
      );
    });
    
    it("should handle paths with quotes", async () => {
      const quotedPath = 'quoted"file".txt';
      const query = `@${quotedPath}`;
      
      mockReadManyFilesExecute.mockResolvedValue({
        llmContent: [`--- ${quotedPath} ---\n\nQuoted content\n\n`],
        returnDisplay: "Read 1 file.",
      });
      
      const result = await handleAtCommand({
        query,
        config: mockConfig,
        addItem: mockAddItem,
        onDebugMessage: mockOnDebugMessage,
        messageId: 901,
        signal: abortController.signal,
      });
      
      expect(result.processedQuery).toContainEqual(
        expect.objectContaining({ text: expect.stringContaining("Quoted content") }),
      );
    });
    
    it("should handle paths with URL-like characters", async () => {
      const urlLikePath = "file%20with%20encoding.txt";
      const query = `@${urlLikePath}`;
      
      mockReadManyFilesExecute.mockResolvedValue({
        llmContent: [`--- ${urlLikePath} ---\n\nURL-like content\n\n`],
        returnDisplay: "Read 1 file.",
      });
      
      const result = await handleAtCommand({
        query,
        config: mockConfig,
        addItem: mockAddItem,
        onDebugMessage: mockOnDebugMessage,
        messageId: 902,
        signal: abortController.signal,
      });
      
      expect(mockReadManyFilesExecute).toHaveBeenCalledWith(
        { paths: [urlLikePath], respectGitIgnore: true },
        abortController.signal,
      );
    });
  });
  
  describe("performance and concurrency", () => {
    it("should handle extremely long queries efficiently", async () => {
      const baseText = "This is a very long query with multiple repeated sections. ";
      const longText = baseText.repeat(1000);
      const filePath = "test.txt";
      const query = `${longText}@${filePath}`;
      
      mockReadManyFilesExecute.mockResolvedValue({
        llmContent: [`--- ${filePath} ---\n\nTest content\n\n`],
        returnDisplay: "Read 1 file.",
      });
      
      const startTime = Date.now();
      const result = await handleAtCommand({
        query,
        config: mockConfig,
        addItem: mockAddItem,
        onDebugMessage: mockOnDebugMessage,
        messageId: 1003,
        signal: abortController.signal,
      });
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.shouldProceed).toBe(true);
      expect(mockReadManyFilesExecute).toHaveBeenCalledWith(
        { paths: [filePath], respectGitIgnore: true },
        abortController.signal,
      );
    });
    
    it("should handle repeated calls with same parameters", async () => {
      const filePath = "repeated-file.txt";
      const query = `@${filePath}`;
      
      mockReadManyFilesExecute.mockResolvedValue({
        llmContent: ["Repeated content"],
        returnDisplay: "Read repeated file.",
      });
      
      const callCount = 10;
      const promises = Array.from({ length: callCount }, (_, i) =>
        handleAtCommand({
          query,
          config: mockConfig,
          addItem: mockAddItem,
          onDebugMessage: mockOnDebugMessage,
          messageId: 2000 + i,
          signal: abortController.signal,
        }),
      );
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(callCount);
      expect(results.every(r => r.shouldProceed)).toBe(true);
      expect(mockReadManyFilesExecute).toHaveBeenCalledTimes(callCount);
    });
    
    it("should handle concurrent @ command processing", async () => {
      const file1 = "concurrent1.txt";
      const file2 = "concurrent2.txt";
      const query1 = `@${file1}`;
      const query2 = `@${file2}`;
      
      mockReadManyFilesExecute.mockResolvedValue({
        llmContent: ["Concurrent content"],
        returnDisplay: "Read concurrent file.",
      });
      
      const promises = [
        handleAtCommand({
          query: query1,
          config: mockConfig,
          addItem: mockAddItem,
          onDebugMessage: mockOnDebugMessage,
          messageId: 1000,
          signal: abortController.signal,
        }),
        handleAtCommand({
          query: query2,
          config: mockConfig,
          addItem: mockAddItem,
          onDebugMessage: mockOnDebugMessage,
          messageId: 1001,
          signal: abortController.signal,
        }),
      ];
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(2);
      expect(results[0].shouldProceed).toBe(true);
      expect(results[1].shouldProceed).toBe(true);
      expect(mockReadManyFilesExecute).toHaveBeenCalledTimes(2);
    });
    
    it("should handle very large number of @ references", async () => {
      const fileCount = 50;
      const files = Array.from({ length: fileCount}, (_, i) => `file${i}.txt`);
      const query = files.map(f => `@${f}`).join(" ");
      
      mockReadManyFilesExecute.mockResolvedValue({
        llmContent: files.map(f => `--- ${f} ---\n\nContent ${f}\n\n`),
        returnDisplay: `Read ${fileCount} files.`,
      });
      
      const result = await handleAtCommand({
        query,
        config: mockConfig,
        addItem: mockAddItem,
        onDebugMessage: mockOnDebugMessage,
        messageId: 1002,
        signal: abortController.signal,
      });
      
      expect(mockReadManyFilesExecute).toHaveBeenCalledWith(
        { paths: files, respectGitIgnore: true },
        abortController.signal,
      );
      expect(result.processedQuery.length).toBeGreaterThan(fileCount);
    });
  });
});