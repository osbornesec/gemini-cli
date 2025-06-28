/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { parseMarkdownToElements } from './markdownParser.js';
import { renderMarkdownElement } from './markdownRenderer.js';
import { MarkdownDisplayProps } from './markdownTypes.js';

/**
 * Main MarkdownDisplay component - orchestrates parsing and rendering
 * Reduced from 498 lines to ~60 lines through systematic decomposition
 */
const MarkdownDisplayInternal: React.FC<MarkdownDisplayProps> = ({
  text,
  isPending,
  availableTerminalHeight,
  terminalWidth
}) => {
  if (!text) return <></>;

  // Parse markdown to structured elements
  const elements = parseMarkdownToElements(text);

  const contentBlocks: React.ReactNode[] = [];

  elements.forEach((element, index) => {
    // The parser only creates paragraph elements with non-empty content,
    // so we don't need to check for empty paragraphs
    contentBlocks.push(
      renderMarkdownElement(element, {
        isPending,
        availableTerminalHeight,
        terminalWidth,
        index
      })
    );
  });

  return <>{contentBlocks}</>;
};

/**
 * Memoized MarkdownDisplay component for performance optimization
 */
export const MarkdownDisplay = React.memo(MarkdownDisplayInternal);

// Export for backward compatibility
export default MarkdownDisplay;
