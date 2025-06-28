/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Text, Box } from 'ink';
import { Colors } from '../../colors.js';
import { RenderInline } from './MarkdownInline.js';

interface MarkdownHeaderProps {
  level: number;
  text: string;
  elementKey: string;
}

/**
 * Renders markdown headers with level-based styling
 */
export const MarkdownHeader: React.FC<MarkdownHeaderProps> = ({ 
  level, 
  text, 
  elementKey 
}) => {
  const getHeaderStyle = (level: number) => {
    switch (level) {
      case 1:
        return { bold: true, color: Colors.AccentCyan };
      case 2:
        return { bold: true, color: Colors.AccentBlue };
      case 3:
        return { bold: true };
      case 4:
        return { italic: true, color: Colors.Gray };
      default:
        return {};
    }
  };

  const style = getHeaderStyle(level);

  return (
    <Box key={elementKey}>
      <Text {...style}>
        <RenderInline text={text} />
      </Text>
    </Box>
  );
};

export default React.memo(MarkdownHeader);