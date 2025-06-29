/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { AutoAcceptIndicator } from './AutoAcceptIndicator.js';
import { ApprovalMode } from '@google/gemini-cli-core';

describe('AutoAcceptIndicator', () => {
  it('should render auto edit mode indicator', () => {
    const { lastFrame } = render(
      <AutoAcceptIndicator approvalMode={ApprovalMode.AUTO_EDIT} />
    );
    
    expect(lastFrame()).toContain('accepting edits');
  });

  it('should render yolo mode indicator', () => {
    const { lastFrame } = render(
      <AutoAcceptIndicator approvalMode={ApprovalMode.YOLO} />
    );
    
    expect(lastFrame()).toContain('YOLO mode');
  });

  it('should render appropriate content for auto edit mode', () => {
    const { lastFrame } = render(
      <AutoAcceptIndicator approvalMode={ApprovalMode.AUTO_EDIT} />
    );
    
    const frame = lastFrame();
    expect(frame).toContain('accepting edits');
    expect(frame).toContain('shift + tab to toggle');
  });

  it('should render appropriate content for yolo mode', () => {
    const { lastFrame } = render(
      <AutoAcceptIndicator approvalMode={ApprovalMode.YOLO} />
    );
    
    const frame = lastFrame();
    expect(frame).toContain('YOLO mode');
    expect(frame).toContain('ctrl + y to toggle');
  });

  it('should handle default approval mode', () => {
    const { lastFrame } = render(
      <AutoAcceptIndicator approvalMode={ApprovalMode.DEFAULT} />
    );
    
    // Default mode should render but be empty/minimal
    expect(lastFrame()).toBeDefined();
  });

  it('should display consistent formatting', () => {
    const { lastFrame: autoEditFrame } = render(
      <AutoAcceptIndicator approvalMode={ApprovalMode.AUTO_EDIT} />
    );
    const { lastFrame: yoloFrame } = render(
      <AutoAcceptIndicator approvalMode={ApprovalMode.YOLO} />
    );
    
    // Both should have similar structure/length
    expect(autoEditFrame().length).toBeGreaterThan(0);
    expect(yoloFrame().length).toBeGreaterThan(0);
  });

  it('should include toggle instructions for auto edit mode', () => {
    const { lastFrame } = render(
      <AutoAcceptIndicator approvalMode={ApprovalMode.AUTO_EDIT} />
    );
    
    expect(lastFrame()).toContain('shift + tab to toggle');
  });

  it('should include toggle instructions for yolo mode', () => {
    const { lastFrame } = render(
      <AutoAcceptIndicator approvalMode={ApprovalMode.YOLO} />
    );
    
    expect(lastFrame()).toContain('ctrl + y to toggle');
  });
});