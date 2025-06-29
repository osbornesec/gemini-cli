/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuthCommand } from './useAuthCommand.js';

// Mock settings type
type MockSettings = {
  apiKey: string;
  authMethod: string;
  projectId: string;
};

describe('useAuthCommand', () => {
  let mockSettings: MockSettings;
  let mockOnSettingsChanged: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnSettingsChanged = vi.fn();
    mockSettings = {
      apiKey: '',
      authMethod: 'oauth2',
      projectId: 'test-project',
    };
    vi.clearAllMocks();
  });

  it('should initialize with default auth state', () => {
    const { result } = renderHook(() =>
      useAuthCommand(mockSettings, mockOnSettingsChanged)
    );

    expect(result.current.isAuthenticating).toBe(false);
    expect(result.current.authError).toBe(null);
  });

  it('should handle auth command execution', async () => {
    const { result } = renderHook(() =>
      useAuthCommand(mockSettings, mockOnSettingsChanged)
    );

    await act(async () => {
      await result.current.executeAuthCommand(['oauth2']);
    });

    expect(result.current.isAuthenticating).toBe(false);
  });

  it('should handle auth errors gracefully', async () => {
    const { result } = renderHook(() =>
      useAuthCommand(mockSettings, mockOnSettingsChanged)
    );

    await act(async () => {
      try {
        await result.current.executeAuthCommand(['invalid-method']);
      } catch (error) {
        // Expected error
      }
    });

    expect(result.current.authError).toBeTruthy();
  });

  it('should validate auth method parameters', async () => {
    const { result } = renderHook(() =>
      useAuthCommand(mockSettings, mockOnSettingsChanged)
    );

    await act(async () => {
      expect(() =>
        result.current.executeAuthCommand([])
      ).toThrow();
    });
  });

  it('should update authentication state during execution', async () => {
    const { result } = renderHook(() =>
      useAuthCommand(mockSettings, mockOnSettingsChanged)
    );

    act(() => {
      result.current.executeAuthCommand(['oauth2']);
    });

    expect(result.current.isAuthenticating).toBe(true);
  });

  it('should reset error state on new auth attempt', async () => {
    const { result } = renderHook(() =>
      useAuthCommand(mockSettings, mockOnSettingsChanged)
    );

    // Set initial error
    await act(async () => {
      try {
        await result.current.executeAuthCommand(['invalid']);
      } catch (error) {
        // Expected
      }
    });

    expect(result.current.authError).toBeTruthy();

    // New attempt should reset error
    await act(async () => {
      await result.current.executeAuthCommand(['oauth2']);
    });

    expect(result.current.authError).toBe(null);
  });

  it('should handle concurrent auth attempts', async () => {
    const { result } = renderHook(() =>
      useAuthCommand(mockSettings, mockOnSettingsChanged)
    );

    await act(async () => {
      const promise1 = result.current.executeAuthCommand(['oauth2']);
      const promise2 = result.current.executeAuthCommand(['oauth2']);
      
      await Promise.all([promise1, promise2]);
    });

    expect(result.current.isAuthenticating).toBe(false);
  });
});