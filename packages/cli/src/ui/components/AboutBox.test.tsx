/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { AboutBox } from './AboutBox.js';

describe('AboutBox', () => {
  const defaultProps = {
    cliVersion: '1.0.0',
    osVersion: 'darwin 21.0.0',
    sandboxEnv: 'development',
    modelVersion: 'gemini-2.5-pro',
    selectedAuthType: 'oauth2',
    gcpProject: 'test-project',
  };

  it('should render all version information correctly', () => {
    const { lastFrame } = render(<AboutBox {...defaultProps} />);
    
    expect(lastFrame()).toContain('1.0.0');
    expect(lastFrame()).toContain('darwin 21.0.0');
    expect(lastFrame()).toContain('development');
    expect(lastFrame()).toContain('gemini-2.5-pro');
    expect(lastFrame()).toContain('oauth2');
    expect(lastFrame()).toContain('test-project');
  });

  it('should handle empty values gracefully', () => {
    const emptyProps = {
      cliVersion: '',
      osVersion: '',
      sandboxEnv: '',
      modelVersion: '',
      selectedAuthType: '',
      gcpProject: '',
    };
    
    const { lastFrame } = render(<AboutBox {...emptyProps} />);
    expect(lastFrame()).toBeDefined();
  });

  it('should render with special characters in values', () => {
    const specialProps = {
      ...defaultProps,
      gcpProject: 'test-project-123_special',
      osVersion: 'linux 5.4.0-special',
    };
    
    const { lastFrame } = render(<AboutBox {...specialProps} />);
    expect(lastFrame()).toContain('test-project-123_special');
    expect(lastFrame()).toContain('linux 5.4.0-special');
  });

  it('should handle undefined props gracefully', () => {
    const undefinedProps = {
      cliVersion: undefined,
      osVersion: undefined,
      sandboxEnv: undefined,
      modelVersion: undefined,
      selectedAuthType: undefined,
      gcpProject: undefined,
    };
    
    const { lastFrame } = render(<AboutBox {...undefinedProps} />);
    expect(lastFrame()).toBeDefined();
  });

  it('should display version information in expected format', () => {
    const { lastFrame } = render(<AboutBox {...defaultProps} />);
    const frame = lastFrame();
    
    // Should contain structured version information
    expect(frame).toMatch(/CLI.*1\.0\.0/);
    expect(frame).toMatch(/OS.*darwin 21\.0\.0/);
  });

  it('should handle null props', () => {
    const nullProps = {
      cliVersion: null,
      osVersion: null,
      sandboxEnv: null,
      modelVersion: null,
      selectedAuthType: null,
      gcpProject: null,
    };
    
    const { lastFrame } = render(<AboutBox {...nullProps} />);
    expect(lastFrame()).toBeDefined();
  });
});