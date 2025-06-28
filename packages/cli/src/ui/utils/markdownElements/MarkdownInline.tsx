/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Text } from 'ink';
import { Colors } from '../../colors.js';
import { MARKDOWN_PATTERNS, LIMITS } from '../markdownConstants.js';
import { sanitizeUrl } from '../markdownSecurity.js';

interface RenderInlineProps {
  text: string;
}

/**
 * Renders inline markdown formatting (bold, italic, links, code, etc.)
 */
export const RenderInline: React.FC<RenderInlineProps> = ({ text }) => {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  const inlineRegex = MARKDOWN_PATTERNS.INLINE;
  let match;

  while ((match = inlineRegex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      nodes.push(
        <Text key={`t-${lastIndex}`}>
          {text.slice(lastIndex, match.index)}
        </Text>
      );
    }

    const fullMatch = match[0];
    const renderedNode = renderInlineElement(fullMatch, match.index, text, inlineRegex);
    nodes.push(renderedNode);
    
    lastIndex = inlineRegex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    nodes.push(
      <Text key={`t-${lastIndex}`}>
        {text.slice(lastIndex)}
      </Text>
    );
  }

  return <>{nodes.filter(node => node !== null)}</>;
};

function renderInlineElement(
  fullMatch: string, 
  index: number, 
  text: string, 
  inlineRegex: RegExp
): React.ReactNode {
  const key = `m-${index}`;
  const { 
    BOLD_MARKER_LENGTH, 
    ITALIC_MARKER_LENGTH, 
    STRIKETHROUGH_MARKER_LENGTH,
    INLINE_CODE_MARKER_LENGTH,
    UNDERLINE_TAG_START_LENGTH,
    UNDERLINE_TAG_END_LENGTH
  } = LIMITS;

  try {
    // Bold text **text**
    if (fullMatch.startsWith('**') && fullMatch.endsWith('**') && 
        fullMatch.length > BOLD_MARKER_LENGTH * 2) {
      return (
        <Text key={key} bold>
          {fullMatch.slice(BOLD_MARKER_LENGTH, -BOLD_MARKER_LENGTH)}
        </Text>
      );
    }

    // Italic text *text* or _text_
    if (fullMatch.length > ITALIC_MARKER_LENGTH * 2 &&
        ((fullMatch.startsWith('*') && fullMatch.endsWith('*')) ||
         (fullMatch.startsWith('_') && fullMatch.endsWith('_'))) &&
        !/\w/.test(text[index - 1] ?? '') &&
        !/\w/.test(text[inlineRegex.lastIndex] ?? '') &&
        !/\S[./\\]/.test((text[index - 2] ?? '') + (text[index - 1] ?? '')) &&
        !/[./\\]\S/.test((text[inlineRegex.lastIndex] ?? '') + (text[inlineRegex.lastIndex + 1] ?? ''))) {
      return (
        <Text key={key} italic>
          {fullMatch.slice(ITALIC_MARKER_LENGTH, -ITALIC_MARKER_LENGTH)}
        </Text>
      );
    }

    // Strikethrough ~~text~~
    if (fullMatch.startsWith('~~') && fullMatch.endsWith('~~') &&
        fullMatch.length > STRIKETHROUGH_MARKER_LENGTH * 2) {
      return (
        <Text key={key} strikethrough>
          {fullMatch.slice(STRIKETHROUGH_MARKER_LENGTH, -STRIKETHROUGH_MARKER_LENGTH)}
        </Text>
      );
    }

    // Inline code `code`
    if (fullMatch.startsWith('`') && fullMatch.endsWith('`') &&
        fullMatch.length > INLINE_CODE_MARKER_LENGTH) {
      const codeMatch = fullMatch.match(/^(`+)(.+?)\1$/s);
      const codeContent = codeMatch && codeMatch[2] ? codeMatch[2] : 
        fullMatch.slice(INLINE_CODE_MARKER_LENGTH, -INLINE_CODE_MARKER_LENGTH);
      
      return (
        <Text key={key} color={Colors.AccentPurple}>
          {codeContent}
        </Text>
      );
    }

    // Links [text](url)
    if (fullMatch.startsWith('[') && fullMatch.includes('](') && fullMatch.endsWith(')')) {
      const linkMatch = fullMatch.match(/\[(.*?)\]\((.*?)\)/);
      if (linkMatch) {
        const linkText = linkMatch[1];
        const url = linkMatch[2];
        const sanitizedUrl = sanitizeUrl(url);
        
        return (
          <Text key={key}>
            {linkText}
            <Text color={Colors.AccentBlue}> ({sanitizedUrl})</Text>
          </Text>
        );
      }
    }

    // Underline <u>text</u>
    if (fullMatch.startsWith('<u>') && fullMatch.endsWith('</u>') &&
        fullMatch.length > UNDERLINE_TAG_START_LENGTH + UNDERLINE_TAG_END_LENGTH - 1) {
      return (
        <Text key={key} underline>
          {fullMatch.slice(UNDERLINE_TAG_START_LENGTH, -UNDERLINE_TAG_END_LENGTH)}
        </Text>
      );
    }

    // Fallback for unrecognized patterns
    return <Text key={key}>{fullMatch}</Text>;

  } catch (error) {
    console.error('Markdown inline parsing error:', {
      error,
      content: fullMatch,
      position: index,
      line: text.split('\n').findIndex(line => line.includes(fullMatch)) + 1
    });

    return (
      <Text key={key} color="red">
        ⚠️ {fullMatch}
      </Text>
    );
  }
}

export default React.memo(RenderInline);