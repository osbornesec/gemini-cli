/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { MARKDOWN_PATTERNS, LIMITS } from './markdownConstants.js';
import { ParsedMarkdownElement, MarkdownParsingContext } from './markdownTypes.js';

/**
 * Pure parsing functions separated from React rendering
 */
export function parseMarkdownToElements(text: string): ParsedMarkdownElement[] {
  if (!text) return [];

  const lines = preprocessLines(text);
  const elements: ParsedMarkdownElement[] = [];
  const context: MarkdownParsingContext = {
    inCodeBlock: false,
    codeBlockContent: [],
    codeBlockLang: null,
    codeBlockFence: ''
  };

  lines.forEach((line, index) => {
    const element = parseLineToElement(line, index, context);
    if (element) {
      elements.push(element);
    }
  });

  // Handle unclosed code block at end of input
  if (context.inCodeBlock) {
    elements.push(createCodeBlockElement(context, 'eof'));
  }

  return elements;
}

function preprocessLines(text: string): string[] {
  let lines = text.split('\n');
  
  // Apply input size limits to prevent memory exhaustion
  if (lines.length > LIMITS.MAX_LINES) {
    lines = lines.slice(-LIMITS.MAX_LINES); // Keep the last MAX_LINES lines
  }
  
  // Truncate individual lines that are too long
  return lines.map(line => 
    line.length > LIMITS.MAX_LINE_LENGTH 
      ? line.slice(0, LIMITS.MAX_LINE_LENGTH) + '...'
      : line
  );
}

function parseLineToElement(
  line: string, 
  index: number, 
  context: MarkdownParsingContext
): ParsedMarkdownElement | null {
  const key = `line-${index}`;

  // Handle code block state first
  if (context.inCodeBlock) {
    return handleCodeBlockLine(line, key, context);
  }

  // Try to match different element types
  const codeFenceMatch = line.match(MARKDOWN_PATTERNS.CODE_FENCE);
  if (codeFenceMatch) {
    return handleCodeFenceStart(codeFenceMatch, context);
  }

  const hrMatch = line.match(MARKDOWN_PATTERNS.HR);
  if (hrMatch) {
    return createHrElement(key);
  }

  const headerMatch = line.match(MARKDOWN_PATTERNS.HEADER);
  if (headerMatch) {
    return createHeaderElement(headerMatch, key);
  }

  const ulMatch = line.match(MARKDOWN_PATTERNS.UL_ITEM);
  if (ulMatch) {
    return createListElement(ulMatch, 'ul', key);
  }

  const olMatch = line.match(MARKDOWN_PATTERNS.OL_ITEM);
  if (olMatch) {
    return createListElement(olMatch, 'ol', key);
  }

  // Default to paragraph for non-empty lines
  if (line.trim().length > 0) {
    return createParagraphElement(line, key);
  }

  return null; // Empty line - will be handled by renderer
}

function handleCodeBlockLine(
  line: string, 
  key: string, 
  context: MarkdownParsingContext
): ParsedMarkdownElement | null {
  const fenceMatch = line.match(MARKDOWN_PATTERNS.CODE_FENCE);
  
  if (fenceMatch && 
      fenceMatch[1].startsWith(context.codeBlockFence[0]) &&
      fenceMatch[1].length >= context.codeBlockFence.length) {
    // End of code block
    const element = createCodeBlockElement(context, key);
    // Reset context
    context.inCodeBlock = false;
    context.codeBlockContent = [];
    context.codeBlockLang = null;
    context.codeBlockFence = '';
    return element;
  } else {
    // Line inside code block
    context.codeBlockContent.push(line);
    return null;
  }
}

function handleCodeFenceStart(
  match: RegExpMatchArray, 
  context: MarkdownParsingContext
): ParsedMarkdownElement | null {
  context.inCodeBlock = true;
  context.codeBlockFence = match[1];
  context.codeBlockLang = match[2] || null;
  return null; // Code block will be created when it ends
}

function createHeaderElement(match: RegExpMatchArray, key: string): ParsedMarkdownElement {
  const level = match[1].length;
  const headerText = match[2];
  
  return {
    type: 'header',
    content: headerText,
    metadata: { level },
    key
  };
}

function createListElement(
  match: RegExpMatchArray, 
  listType: 'ul' | 'ol', 
  key: string
): ParsedMarkdownElement {
  const leadingWhitespace = match[1];
  const marker = match[2];
  const itemText = match[3];
  
  return {
    type: 'list',
    content: itemText,
    metadata: {
      listType,
      marker,
      leadingWhitespace
    },
    key
  };
}

function createHrElement(key: string): ParsedMarkdownElement {
  return {
    type: 'hr',
    content: '---',
    key
  };
}

function createParagraphElement(line: string, key: string): ParsedMarkdownElement {
  return {
    type: 'paragraph',
    content: line,
    key
  };
}

function createCodeBlockElement(
  context: MarkdownParsingContext, 
  key: string
): ParsedMarkdownElement {
  return {
    type: 'codeBlock',
    content: context.codeBlockContent.join('\n'),
    metadata: {
      language: context.codeBlockLang || undefined
    },
    key
  };
}