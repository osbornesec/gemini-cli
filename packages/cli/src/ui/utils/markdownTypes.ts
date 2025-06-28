/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * TypeScript interfaces for parsed markdown elements
 */
export interface ParsedMarkdownElement {
  type: 'header' | 'codeBlock' | 'list' | 'paragraph' | 'hr';
  content: string;
  metadata?: {
    level?: number;          // For headers (1-4)
    language?: string;       // For code blocks
    listType?: 'ul' | 'ol'; // For lists
    marker?: string;         // For list items
    leadingWhitespace?: string; // For nested lists
  };
  key: string;
}

export interface MarkdownParsingContext {
  inCodeBlock: boolean;
  codeBlockContent: string[];
  codeBlockLang: string | null;
  codeBlockFence: string;
}

export interface MarkdownDisplayProps {
  text: string;
  isPending: boolean;
  availableTerminalHeight?: number;
  terminalWidth: number;
}

export interface RenderContext {
  isPending: boolean;
  availableTerminalHeight?: number;
  terminalWidth: number;
  index: number;
}