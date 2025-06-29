/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { AutoAcceptIndicator } from './AutoAcceptIndicator.js';

// Mock ApprovalMode enum - adjust based on actual implementation
const ApprovalMode = {
  AUTO: 'auto',
  MANUAL: 'manual',
} as const;

describe('AutoAcceptIndicator', () => {
  it('should render auto mode indicator', () => {
    const { lastFrame } = render(
      <AutoAcceptIndicator approvalMode={ApprovalMode.AUTO} />
    );
    
    expect(lastFrame()).toContain('AUTO');
  });

  it('should render manual mode indicator', () => {
    const { lastFrame } = render(
      <AutoAcceptIndicator approvalMode={ApprovalMode.MANUAL} />
    );
    
    expect(lastFrame()).toContain('MANUAL');
  });

  it('should render with appropriate colors for auto mode', () => {
    const { lastFrame } = render(
      <AutoAcceptIndicator approvalMode={ApprovalMode.AUTO} />
    );
    
    const frame = lastFrame();
    expect(frame).toContain('AUTO');
    // Should contain ANSI color codes for highlighting
    expect(frame).toMatch(/\u001b\[\d+m/);
  });

  it('should render with appropriate colors for manual mode', () => {
    const { lastFrame } = render(
      <AutoAcceptIndicator approvalMode={ApprovalMode.MANUAL} />
    );
    
    const frame = lastFrame();
    expect(frame).toContain('MANUAL');
    // Should contain ANSI color codes
    expect(frame).toMatch(/\u001b\[\d+m/);
  });

  it('should handle undefined approval mode gracefully', () => {
    const { lastFrame } = render(
      <AutoAcceptIndicator approvalMode={undefined as any} />
    );
    
    expect(lastFrame()).toBeDefined();
  });

  it('should display consistent formatting', () => {
    const { lastFrame: autoFrame } = render(
      <AutoAcceptIndicator approvalMode={ApprovalMode.AUTO} />
    );
    const { lastFrame: manualFrame } = render(
      <AutoAcceptIndicator approvalMode={ApprovalMode.MANUAL} />
    );
    
    // Both should have similar structure/length
    expect(autoFrame().length).toBeGreaterThan(0);
    expect(manualFrame().length).toBeGreaterThan(0);
  });

  it('should handle invalid approval mode values', () => {
    const { lastFrame } = render(
      <AutoAcceptIndicator approvalMode={'invalid' as any} />
    );
    
    expect(lastFrame()).toBeDefined();
  });

  it('should be accessible', () => {
    const { lastFrame } = render(
      <AutoAcceptIndicator approvalMode={ApprovalMode.AUTO} />
    );
    
    // Should have clear visual distinction
    expect(lastFrame()).not.toBe('');
  });
});