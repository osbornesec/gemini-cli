/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Box, Text } from 'ink';
import { RenderInline } from './MarkdownInline.js';
import { LAYOUT_CONSTANTS } from '../markdownConstants.js';

interface MarkdownListItemProps {
  itemText: string;
  type: 'ul' | 'ol';
  marker: string;
  leadingWhitespace?: string;
  elementKey: string;
}

/**
 * Renders markdown list items with proper indentation and markers
 */
export const MarkdownListItem: React.FC<MarkdownListItemProps> = ({
  itemText,
  type,
  marker,
  leadingWhitespace = '',
  elementKey
}) => {
  const { LIST_ITEM_PREFIX_PADDING, LIST_ITEM_TEXT_FLEX_GROW } = LAYOUT_CONSTANTS;
  
  const prefix = type === 'ol' ? `${marker}. ` : `${marker} `;
  const prefixWidth = prefix.length;
  
  // Convert tabs to spaces for consistent indentation
  const normalizedWhitespace = leadingWhitespace.replace(/\t/g, '    ');
  const indentation = normalizedWhitespace.length;

  return (
    <Box
      key={elementKey}
      paddingLeft={indentation + LIST_ITEM_PREFIX_PADDING}
      flexDirection="row"
    >
      <Box width={prefixWidth}>
        <Text>{prefix}</Text>
      </Box>
      <Box flexGrow={LIST_ITEM_TEXT_FLEX_GROW}>
        <Text wrap="wrap">
          <RenderInline text={itemText} />
        </Text>
      </Box>
    </Box>
  );
};

export default React.memo(MarkdownListItem);