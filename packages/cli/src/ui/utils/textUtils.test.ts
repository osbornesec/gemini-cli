/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export function isBinary(buffer: unknown, sampleSize?: number): boolean {
  if (!Buffer.isBuffer(buffer)) {
    return false;
  }
  const buf = buffer as Buffer;
  const length = buf.length;
  if (length === 0) {
    return false;
  }
  const max = typeof sampleSize === 'number' ? sampleSize : 512;
  if (max <= 0) {
    return false;
  }
  const len = Math.min(length, max);
  const sample = buf.slice(0, len);
  for (let i = 0; i < sample.length; i++) {
    const b = sample[i];
    if (b === 0) {
      return true;
    }
    if (b < 32) {
      // Allow horizontal tab (9), line feed (10), vertical tab (11), form feed (12), carriage return (13)
      if (b !== 9 && b !== 10 && b !== 11 && b !== 12 && b !== 13) {
        return true;
      }
    }
  }
  // Check if sample is valid UTF-8. If not, consider binary.
  try {
    const str = sample.toString('utf8');
    const recon = Buffer.from(str, 'utf8');
    if (recon.equals(sample)) {
      return false;
    }
  } catch {
    return true;
  }
  return true;
}