/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../../colors.js';
import { colorizeCode } from '../CodeColorizer.js';
import { LAYOUT_CONSTANTS } from '../markdownConstants.js';

interface MarkdownCodeBlockProps {
  content: string[];
  language: string | null;
  isPending: boolean;
  availableTerminalHeight?: number;
  terminalWidth: number;
  elementKey: string;
}

/**
 * Renders syntax-highlighted code blocks with pending state support
 */
export const MarkdownCodeBlock: React.FC<MarkdownCodeBlockProps> = ({
  content,
  language,
  isPending,
  availableTerminalHeight,
  terminalWidth,
  elementKey
}) => {
  const { CODE_BLOCK_PADDING } = LAYOUT_CONSTANTS;
  
  // Handle pending state with content truncation
  if (isPending && availableTerminalHeight !== undefined) {
    const MIN_LINES_FOR_MESSAGE = 1;
    const RESERVED_LINES = 2;
    const MAX_CODE_LINES = Math.max(0, 
      availableTerminalHeight - CODE_BLOCK_PADDING * 2 - RESERVED_LINES
    );

    if (content.length > MAX_CODE_LINES) {
      if (MAX_CODE_LINES < MIN_LINES_FOR_MESSAGE) {
        return (
          <Box key={elementKey} padding={CODE_BLOCK_PADDING}>
            <Text color={Colors.Gray}>... code is being written ...</Text>
          </Box>
        );
      }

      const truncatedContent = content.slice(0, MAX_CODE_LINES);
      const colorizedCode = colorizeCode(
        truncatedContent.join('\n'),
        language,
        availableTerminalHeight,
        terminalWidth - CODE_BLOCK_PADDING * 2
      );

      return (
        <Box key={elementKey} flexDirection="column" padding={CODE_BLOCK_PADDING}>
          {colorizedCode}
          <Text color={Colors.Gray}>... generating more ...</Text>
        </Box>
      );
    }
  }

  // Render complete code block
  const fullContent = content.join('\n');
  const colorizedCode = colorizeCode(
    fullContent,
    language,
    availableTerminalHeight,
    terminalWidth - CODE_BLOCK_PADDING * 2
  );

  return (
    <Box
      key={elementKey}
      flexDirection="column"
      padding={CODE_BLOCK_PADDING}
      width={terminalWidth}
      flexShrink={0}
    >
      {colorizedCode}
    </Box>
  );
};

export default React.memo(MarkdownCodeBlock);