/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Box, Text } from 'ink';
import { ParsedMarkdownElement, RenderContext } from './markdownTypes.js';
import { 
  MarkdownHeader, 
  MarkdownCodeBlock, 
  MarkdownListItem, 
  RenderInline 
} from './markdownElements/index.js';
import { LAYOUT_CONSTANTS } from './markdownConstants.js';

/**
 * Renders parsed markdown elements to React components
 */
export function renderMarkdownElement(
  element: ParsedMarkdownElement,
  context: RenderContext
): React.ReactNode {
  const key = `${element.type}-${context.index}`;

  switch (element.type) {
    case 'header':
      return (
        <MarkdownHeader
          key={key}
          level={element.metadata?.level || 1}
          text={element.content}
          elementKey={key}
        />
      );

    case 'codeBlock':
      return (
        <MarkdownCodeBlock
          key={key}
          content={element.content.split('\n')}
          language={element.metadata?.language || null}
          isPending={context.isPending}
          availableTerminalHeight={context.availableTerminalHeight}
          terminalWidth={context.terminalWidth}
          elementKey={key}
        />
      );

    case 'list':
      return (
        <MarkdownListItem
          key={key}
          itemText={element.content}
          type={element.metadata?.listType || 'ul'}
          marker={element.metadata?.marker || '-'}
          leadingWhitespace={element.metadata?.leadingWhitespace}
          elementKey={key}
        />
      );

    case 'hr':
      return (
        <Box key={key}>
          <Text dimColor>---</Text>
        </Box>
      );

    case 'paragraph':
    default:
      // Handle empty lines and paragraphs
      if (element.content.trim().length === 0) {
        return <Box key={key} height={LAYOUT_CONSTANTS.EMPTY_LINE_HEIGHT} />;
      }
      
      return (
        <Box key={key}>
          <Text wrap="wrap">
            <RenderInline text={element.content} />
          </Text>
        </Box>
      );
  }
}

/**
 * Memoized version of renderMarkdownElement for performance
 */
export const MemoizedMarkdownRenderer = React.memo(renderMarkdownElement);