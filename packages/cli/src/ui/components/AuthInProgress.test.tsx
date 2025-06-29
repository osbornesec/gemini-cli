/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { AuthInProgress } from './AuthInProgress.js';

describe('AuthInProgress', () => {
  let onTimeoutMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onTimeoutMock = vi.fn();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should render auth in progress message', () => {
    const { lastFrame } = render(<AuthInProgress onTimeout={onTimeoutMock} />);
    
    expect(lastFrame()).toContain('Authentication in progress');
  });

  it('should call onTimeout after timeout period', () => {
    render(<AuthInProgress onTimeout={onTimeoutMock} />);
    
    // Fast-forward time to trigger timeout
    vi.advanceTimersByTime(30000); // 30 seconds
    
    expect(onTimeoutMock).toHaveBeenCalledOnce();
  });

  it('should handle escape key to cancel', () => {
    const { stdin } = render(<AuthInProgress onTimeout={onTimeoutMock} />);
    
    stdin.write('\u001B'); // Escape key
    
    expect(onTimeoutMock).toHaveBeenCalledOnce();
  });

  it('should not call timeout multiple times', () => {
    render(<AuthInProgress onTimeout={onTimeoutMock} />);
    
    vi.advanceTimersByTime(30000);
    vi.advanceTimersByTime(30000);
    
    expect(onTimeoutMock).toHaveBeenCalledTimes(1);
  });

  it('should handle unmount before timeout', () => {
    const { unmount } = render(<AuthInProgress onTimeout={onTimeoutMock} />);
    
    unmount();
    vi.advanceTimersByTime(30000);
    
    expect(onTimeoutMock).not.toHaveBeenCalled();
  });

  it('should display spinner animation', () => {
    const { lastFrame } = render(<AuthInProgress onTimeout={onTimeoutMock} />);
    
    // Should contain spinner or loading indicator
    const frame = lastFrame();
    expect(frame.length).toBeGreaterThan(0);
  });

  it('should handle keyboard interrupts', () => {
    const { stdin } = render(<AuthInProgress onTimeout={onTimeoutMock} />);
    
    // Ctrl+C
    stdin.write('\x03');
    
    expect(onTimeoutMock).toHaveBeenCalledOnce();
  });

  it('should handle different timeout durations', () => {
    const customTimeout = 5000;
    render(<AuthInProgress onTimeout={onTimeoutMock} timeout={customTimeout} />);
    
    vi.advanceTimersByTime(customTimeout);
    
    expect(onTimeoutMock).toHaveBeenCalledOnce();
  });
});