/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { SAFE_SCHEMES } from './markdownConstants.js';

/**
 * Sanitizes URLs to prevent XSS attacks through dangerous schemes
 * @param url The URL to sanitize
 * @returns Safe URL or '#' if dangerous
 */
export const sanitizeUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    return SAFE_SCHEMES.test(parsed.protocol) ? url : '#';
  } catch {
    // Handle relative URLs safely
    return url.startsWith('/') || url.startsWith('#') ? url : '#';
  }
};