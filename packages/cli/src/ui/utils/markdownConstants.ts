/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Centralized markdown parsing patterns and constants
 */
export const MARKDOWN_PATTERNS = {
  HEADER: /^ *(#{1,4}) +(.*)/,
  CODE_FENCE: /^ *(`{3,}|~{3,}) *(\w*?) *$/,
  UL_ITEM: /^([ \t]*)([-*+]) +(.*)/,
  OL_ITEM: /^([ \t]*)(\d+)\. +(.*)/,
  HR: /^ *([-*_] *){3,} *$/,
  INLINE: /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|_[^_\n]+_|~~[^~\n]+~~|\[[^\]\n]*\]\([^)\n]*\)|`+[^`\n]+`+|<u>[^<\n]*<\/u>)/g
} as const;

export const LIMITS = {
  MAX_LINES: 10000,
  MAX_LINE_LENGTH: 5000,
  BOLD_MARKER_LENGTH: 2,
  ITALIC_MARKER_LENGTH: 1,
  STRIKETHROUGH_MARKER_LENGTH: 2,
  INLINE_CODE_MARKER_LENGTH: 1,
  UNDERLINE_TAG_START_LENGTH: 3,
  UNDERLINE_TAG_END_LENGTH: 4
} as const;

export const LAYOUT_CONSTANTS = {
  EMPTY_LINE_HEIGHT: 1,
  CODE_BLOCK_PADDING: 1,
  LIST_ITEM_PREFIX_PADDING: 1,
  LIST_ITEM_TEXT_FLEX_GROW: 1
} as const;

// URL sanitization constants
export const SAFE_SCHEMES = /^(https?|mailto|tel):/i;