/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { Colors, ColorTheme, getColorForStatus, applyColorTheme } from './colors.js';

describe('Colors configuration', () => {
  describe('Colors object', () => {
    it('should export complete color theme object', () => {
      expect(Colors).toBeDefined();
      expect(typeof Colors).toBe('object');
    });

    it('should have primary colors defined', () => {
      expect(Colors.primary).toBeDefined();
      expect(Colors.secondary).toBeDefined();
      expect(Colors.accent).toBeDefined();
      expect(typeof Colors.primary).toBe('string');
      expect(typeof Colors.secondary).toBe('string');
      expect(typeof Colors.accent).toBe('string');
    });

    it('should have semantic colors defined', () => {
      expect(Colors.success).toBeDefined();
      expect(Colors.warning).toBeDefined();
      expect(Colors.error).toBeDefined();
      expect(Colors.info).toBeDefined();
      expect(typeof Colors.success).toBe('string');
      expect(typeof Colors.warning).toBe('string');
      expect(typeof Colors.error).toBe('string');
      expect(typeof Colors.info).toBe('string');
    });

    it('should have text colors defined', () => {
      expect(Colors.text).toBeDefined();
      expect(Colors.textSecondary).toBeDefined();
      expect(Colors.textMuted).toBeDefined();
      expect(typeof Colors.text).toBe('string');
      expect(typeof Colors.textSecondary).toBe('string');
      expect(typeof Colors.textMuted).toBe('string');
    });

    it('should have background colors defined', () => {
      expect(Colors.background).toBeDefined();
      expect(Colors.backgroundSecondary).toBeDefined();
      expect(typeof Colors.background).toBe('string');
      expect(typeof Colors.backgroundSecondary).toBe('string');
    });

    it('should have valid color values', () => {
      Object.values(Colors).forEach(color => {
        expect(typeof color).toBe('string');
        expect(color.length).toBeGreaterThan(0);
        // Colors should not contain only whitespace
        expect(color.trim().length).toBeGreaterThan(0);
      });
    });

    it('should have consistent color naming', () => {
      const colorKeys = Object.keys(Colors);
      
      // Should contain expected color categories
      expect(colorKeys.some(key => key.includes('primary'))).toBe(true);
      expect(colorKeys.some(key => key.includes('success'))).toBe(true);
      expect(colorKeys.some(key => key.includes('error'))).toBe(true);
      expect(colorKeys.some(key => key.includes('text'))).toBe(true);
      expect(colorKeys.some(key => key.includes('background'))).toBe(true);
    });
  });

  describe('ColorTheme type', () => {
    it('should validate color theme structure', () => {
      const validTheme: ColorTheme = {
        primary: '#007acc',
        secondary: '#6c757d',
        accent: '#28a745',
        success: '#28a745',
        warning: '#ffc107',
        error: '#dc3545',
        info: '#17a2b8',
        text: '#212529',
        textSecondary: '#6c757d',
        textMuted: '#adb5bd',
        background: '#ffffff',
        backgroundSecondary: '#f8f9fa'
      };

      // Type validation is done at compile time
      expect(validTheme).toBeDefined();
    });
  });

  describe('getColorForStatus', () => {
    it('should return correct colors for status types', () => {
      expect(getColorForStatus('success')).toBe(Colors.success);
      expect(getColorForStatus('error')).toBe(Colors.error);
      expect(getColorForStatus('warning')).toBe(Colors.warning);
      expect(getColorForStatus('info')).toBe(Colors.info);
    });

    it('should handle invalid status types', () => {
      expect(getColorForStatus('invalid' as any)).toBe(Colors.text);
      expect(getColorForStatus('')).toBe(Colors.text);
      expect(getColorForStatus(null as any)).toBe(Colors.text);
      expect(getColorForStatus(undefined as any)).toBe(Colors.text);
    });

    it('should be case sensitive', () => {
      expect(getColorForStatus('SUCCESS' as any)).toBe(Colors.text);
      expect(getColorForStatus('Error' as any)).toBe(Colors.text);
    });
  });

  describe('applyColorTheme', () => {
    it('should apply custom color theme', () => {
      const customTheme: Partial<ColorTheme> = {
        primary: '#ff0000',
        success: '#00ff00',
        error: '#0000ff'
      };

      const result = applyColorTheme(customTheme);

      expect(result.primary).toBe('#ff0000');
      expect(result.success).toBe('#00ff00');
      expect(result.error).toBe('#0000ff');
      
      // Should preserve original values for unspecified colors
      expect(result.secondary).toBe(Colors.secondary);
      expect(result.text).toBe(Colors.text);
    });

    it('should handle empty custom theme', () => {
      const result = applyColorTheme({});

      // Should return original colors
      expect(result).toEqual(Colors);
    });

    it('should handle null and undefined theme', () => {
      expect(applyColorTheme(null as any)).toEqual(Colors);
      expect(applyColorTheme(undefined as any)).toEqual(Colors);
    });

    it('should validate color format', () => {
      const invalidTheme = {
        primary: 'not-a-color',
        success: '',
        error: null as any
      };

      const result = applyColorTheme(invalidTheme);

      // Should fallback to original colors for invalid values
      expect(result.primary).toBe(Colors.primary);
      expect(result.success).toBe(Colors.success);
      expect(result.error).toBe(Colors.error);
    });
  });

  describe('color accessibility', () => {
    it('should have sufficient contrast between text and background colors', () => {
      // Basic accessibility check - colors should be different
      expect(Colors.text).not.toBe(Colors.background);
      expect(Colors.textSecondary).not.toBe(Colors.backgroundSecondary);
    });

    it('should have distinct semantic colors', () => {
      const semanticColors = [Colors.success, Colors.warning, Colors.error, Colors.info];
      const uniqueColors = new Set(semanticColors);
      
      expect(uniqueColors.size).toBe(semanticColors.length);
    });
  });

  describe('color theme integration', () => {
    it('should support theme switching', () => {
      const darkTheme: Partial<ColorTheme> = {
        text: '#ffffff',
        background: '#000000',
        textSecondary: '#cccccc',
        backgroundSecondary: '#333333'
      };

      const lightTheme: Partial<ColorTheme> = {
        text: '#000000',
        background: '#ffffff',
        textSecondary: '#666666',
        backgroundSecondary: '#f5f5f5'
      };

      const dark = applyColorTheme(darkTheme);
      const light = applyColorTheme(lightTheme);

      expect(dark.text).toBe('#ffffff');
      expect(dark.background).toBe('#000000');
      expect(light.text).toBe('#000000');
      expect(light.background).toBe('#ffffff');
    });

    it('should maintain color consistency across theme changes', () => {
      const customTheme: Partial<ColorTheme> = {
        primary: '#purple'
      };

      const themed = applyColorTheme(customTheme);

      // Non-customized colors should remain consistent
      expect(themed.secondary).toBe(Colors.secondary);
      expect(themed.accent).toBe(Colors.accent);
    });
  });
});