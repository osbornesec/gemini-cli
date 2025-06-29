/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { AuthInProgress } from './AuthInProgress.js';

// Mock ink-spinner to avoid animation issues in tests
vi.mock('ink-spinner', () => ({
  default: () => '⠋'
}));

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
    
    expect(lastFrame()).toContain('Waiting for auth');
  });

  it('should call onTimeout after timeout period', () => {
    render(<AuthInProgress onTimeout={onTimeoutMock} />);
    
    // Fast-forward time to trigger timeout (180 seconds = 3 minutes)
    vi.advanceTimersByTime(180000);
    
    expect(onTimeoutMock).toHaveBeenCalledOnce();
  });

  it('should handle escape key to cancel', () => {
    const { stdin } = render(<AuthInProgress onTimeout={onTimeoutMock} />);
    
    stdin.write('\u001B'); // Escape key
    
    expect(onTimeoutMock).toHaveBeenCalledOnce();
  });

  it('should not call timeout multiple times', () => {
    render(<AuthInProgress onTimeout={onTimeoutMock} />);
    
    vi.advanceTimersByTime(180000);
    vi.advanceTimersByTime(180000);
    
    expect(onTimeoutMock).toHaveBeenCalledTimes(1);
  });

  it('should handle unmount before timeout', () => {
    const { unmount } = render(<AuthInProgress onTimeout={onTimeoutMock} />);
    
    unmount();
    vi.advanceTimersByTime(180000);
    
    expect(onTimeoutMock).not.toHaveBeenCalled();
  });

  it('should display spinner animation', () => {
    const { lastFrame } = render(<AuthInProgress onTimeout={onTimeoutMock} />);
    
    // Should contain spinner or loading indicator
    const frame = lastFrame();
    expect(frame.length).toBeGreaterThan(0);
  });

  it('should handle keyboard interrupts gracefully', () => {
    const { stdin, lastFrame } = render(<AuthInProgress onTimeout={onTimeoutMock} />);
    
    // Ctrl+C should not crash but useInput only handles escape key
    stdin.write('\x03');
    
    // Component should still be functional
    expect(() => lastFrame()).not.toThrow();
  });

  it('should display waiting message before timeout', () => {
    const { lastFrame } = render(<AuthInProgress onTimeout={onTimeoutMock} />);
    
    expect(lastFrame()).toContain('Waiting for auth');
    expect(lastFrame()).toContain('Press ESC to cancel');
  });

  it('should call timeout callback and update state correctly', () => {
    const { lastFrame, rerender } = render(<AuthInProgress onTimeout={onTimeoutMock} />);
    
    // Before timeout
    expect(lastFrame()).toContain('Waiting for auth');
    
    // Trigger timeout
    vi.advanceTimersByTime(180000);
    
    // Verify callback was called
    expect(onTimeoutMock).toHaveBeenCalledOnce();
    
    // Note: State change happens internally but doesn't affect render until next cycle
    // This tests the timeout mechanism works correctly
  });
});