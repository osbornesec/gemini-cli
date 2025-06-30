/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { isBinary } from './textUtils';

describe('textUtils', () => {
  describe('isBinary', () => {
    it('should return true for a buffer containing a null byte', () => {
      const buffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x1a, 0x0a, 0x00,
      ]);
      expect(isBinary(buffer)).toBe(true);
    });

    it('should return false for a buffer containing only text', () => {
      const buffer = Buffer.from('This is a test string.');
      expect(isBinary(buffer)).toBe(false);
    });

    it('should return false for an empty buffer', () => {
      const buffer = Buffer.from([]);
      expect(isBinary(buffer)).toBe(false);
    });

    it('should return false for a null or undefined buffer', () => {
      expect(isBinary(null)).toBe(false);
      expect(isBinary(undefined)).toBe(false);
    });

    it('should only check the sample size', () => {
      const longBufferWithNullByteAtEnd = Buffer.concat([
        Buffer.from('a'.repeat(1024)),
        Buffer.from([0x00]),
      ]);
      expect(isBinary(longBufferWithNullByteAtEnd, 512)).toBe(false);
    });
  });
});

describe('isBinary - comprehensive edge cases and scenarios', () => {
  it('should handle various control characters that indicate binary content', () => {
    // Test with different control characters that might indicate binary content
    const controlChars = [0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x0e, 0x0f];
    controlChars.forEach(char => {
      const buffer = Buffer.from([char, 0x41, 0x42, 0x43]); // char + "ABC"
      expect(isBinary(buffer)).toBe(true);
    });
  });

  it('should handle legitimate control characters in text files', () => {
    // Test with control characters that are common and acceptable in text files
    const textWithTabs = Buffer.from('Hello\tWorld');
    const textWithNewlines = Buffer.from('Hello\nWorld');
    const textWithCarriageReturn = Buffer.from('Hello\rWorld');
    const textWithFormFeed = Buffer.from('Hello\fWorld');
    const textWithVerticalTab = Buffer.from('Hello\vWorld');
    
    expect(isBinary(textWithTabs)).toBe(false);
    expect(isBinary(textWithNewlines)).toBe(false);
    expect(isBinary(textWithCarriageReturn)).toBe(false);
    expect(isBinary(textWithFormFeed)).toBe(false);
    expect(isBinary(textWithVerticalTab)).toBe(false);
  });

  it('should handle Unicode and UTF-8 encoded text correctly', () => {
    const unicodeText = Buffer.from('Hello 世界 🌍 café naïve résumé', 'utf8');
    const emojiText = Buffer.from('🚀 🎉 🔥 💯 ⭐ 🌟', 'utf8');
    const accentedText = Buffer.from('áéíóú àèìòù âêîôû äëïöü', 'utf8');
    
    expect(isBinary(unicodeText)).toBe(false);
    expect(isBinary(emojiText)).toBe(false);
    expect(isBinary(accentedText)).toBe(false);
  });

  it('should handle high byte values and extended ASCII', () => {
    const highByteBuffer = Buffer.from([0xff, 0xfe, 0x41, 0x42]);
    const extendedAscii = Buffer.from([0x80, 0x81, 0x82, 0x83, 0x84]);
    const mixedHighBytes = Buffer.from([0xc0, 0xc1, 0xc2, 0xc3, 0xc4, 0xc5]);
    
    expect(isBinary(highByteBuffer)).toBe(true);
    expect(isBinary(extendedAscii)).toBe(true);
    expect(isBinary(mixedHighBytes)).toBe(true);
  });

  it('should handle null bytes in various positions', () => {
    const nullAtStart = Buffer.from([0x00, 0x48, 0x65, 0x6c, 0x6c, 0x6f]); // null + "Hello"
    const nullInMiddle = Buffer.from([0x48, 0x65, 0x00, 0x6c, 0x6c, 0x6f]); // "He" + null + "llo"
    const nullAtEnd = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x00]); // "Hello" + null
    const multipleNulls = Buffer.from([0x41, 0x00, 0x42, 0x00, 0x43]); // "A" + null + "B" + null + "C"
    
    expect(isBinary(nullAtStart)).toBe(true);
    expect(isBinary(nullInMiddle)).toBe(true);
    expect(isBinary(nullAtEnd)).toBe(true);
    expect(isBinary(multipleNulls)).toBe(true);
  });

  it('should handle different sample sizes correctly', () => {
    const longTextBuffer = Buffer.from('A'.repeat(2000));
    const longBinaryBuffer = Buffer.concat([
      Buffer.from('A'.repeat(500)),
      Buffer.from([0x00]),
      Buffer.from('A'.repeat(1499))
    ]);
    
    // Text buffer with various sample sizes
    expect(isBinary(longTextBuffer, 100)).toBe(false);
    expect(isBinary(longTextBuffer, 1000)).toBe(false);
    expect(isBinary(longTextBuffer, 2000)).toBe(false);
    expect(isBinary(longTextBuffer, 3000)).toBe(false); // larger than buffer
    
    // Binary buffer with sample size that includes/excludes null byte
    expect(isBinary(longBinaryBuffer, 600)).toBe(true); // includes null byte
    expect(isBinary(longBinaryBuffer, 400)).toBe(false); // excludes null byte
  });

  it('should handle edge cases with sample size parameters', () => {
    const buffer = Buffer.from([0x00, 0x48, 0x65, 0x6c, 0x6c, 0x6f]);
    
    expect(isBinary(buffer, 0)).toBe(false); // zero sample size
    expect(isBinary(buffer, -1)).toBe(false); // negative sample size
    expect(isBinary(buffer, 1)).toBe(true); // sample size of 1 (includes null)
    expect(isBinary(buffer, 1000)).toBe(true); // sample size larger than buffer
  });

  it('should handle common binary file signatures and formats', () => {
    // PNG signature
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(isBinary(pngBuffer)).toBe(true);

    // JPEG signature  
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    expect(isBinary(jpegBuffer)).toBe(true);

    // GIF signature
    const gifBuffer = Buffer.from('GIF89a');
    expect(isBinary(gifBuffer)).toBe(false); // GIF header is text-based

    // ZIP signature
    const zipBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
    expect(isBinary(zipBuffer)).toBe(true); // PK header indicates binary content

    // EXE signature
    const exeBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00]); // MZ header with null
    expect(isBinary(exeBuffer)).toBe(true);

    // PDF signature
    const pdfBuffer = Buffer.from('%PDF-1.4\n');
    expect(isBinary(pdfBuffer)).toBe(false); // PDF headers are text-based
  });

  it('should handle various text file formats correctly', () => {
    // JSON content
    const jsonBuffer = Buffer.from('{"key": "value", "number": 123, "array": [1, 2, 3], "nested": {"inner": true}}');
    expect(isBinary(jsonBuffer)).toBe(false);

    // XML content
    const xmlBuffer = Buffer.from('<?xml version="1.0" encoding="UTF-8"?>\n<root>\n  <item id="1">value</item>\n  <item id="2">another</item>\n</root>');
    expect(isBinary(xmlBuffer)).toBe(false);

    // CSV content
    const csvBuffer = Buffer.from('Name,Age,City,Country\nJohn,30,New York,USA\nJane,25,Boston,USA\nPierre,35,Paris,France');
    expect(isBinary(csvBuffer)).toBe(false);

    // HTML content
    const htmlBuffer = Buffer.from('<!DOCTYPE html>\n<html>\n<head><title>Test</title></head>\n<body><h1>Hello World</h1></body>\n</html>');
    expect(isBinary(htmlBuffer)).toBe(false);

    // JavaScript code
    const jsBuffer = Buffer.from('function test() {\n  const message = "Hello, World!";\n  console.log(message);\n  return message.length;\n}');
    expect(isBinary(jsBuffer)).toBe(false);

    // SQL content
    const sqlBuffer = Buffer.from('SELECT * FROM users WHERE age > 18 AND city = \'New York\' ORDER BY name;');
    expect(isBinary(sqlBuffer)).toBe(false);
  });

  it('should handle buffers with only specific character types', () => {
    // Only printable ASCII
    const printableBuffer = Buffer.from('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()');
    expect(isBinary(printableBuffer)).toBe(false);

    // Only whitespace
    const whitespaceBuffer = Buffer.from('   \t\t\t\n\n\n\r\r\r   ');
    expect(isBinary(whitespaceBuffer)).toBe(false);

    // Only numbers
    const numbersBuffer = Buffer.from('1234567890');
    expect(isBinary(numbersBuffer)).toBe(false);

    // Only special characters
    const specialBuffer = Buffer.from('!@#$%^&*()_+-=[]{}|;:",.<>?/~`');
    expect(isBinary(specialBuffer)).toBe(false);
  });

  it('should handle single character buffers', () => {
    // Single printable character
    expect(isBinary(Buffer.from('A'))).toBe(false);
    expect(isBinary(Buffer.from('1'))).toBe(false);
    expect(isBinary(Buffer.from('!'))).toBe(false);

    // Single control character
    expect(isBinary(Buffer.from([0x00]))).toBe(true);
    expect(isBinary(Buffer.from([0x01]))).toBe(true);
    expect(isBinary(Buffer.from([0xff]))).toBe(true);

    // Single acceptable control character
    expect(isBinary(Buffer.from('\n'))).toBe(false);
    expect(isBinary(Buffer.from('\t'))).toBe(false);
    expect(isBinary(Buffer.from('\r'))).toBe(false);
  });

  it('should handle malformed and edge case inputs', () => {
    // Various falsy values
    expect(isBinary(false as any)).toBe(false);
    expect(isBinary(0 as any)).toBe(false);
    expect(isBinary('' as any)).toBe(false);
    expect(isBinary(NaN as any)).toBe(false);
    expect(isBinary({} as any)).toBe(false);
    expect(isBinary([] as any)).toBe(false);

    // String input (should be handled gracefully)
    expect(isBinary('not a buffer' as any)).toBe(false);
    expect(isBinary('hello world' as any)).toBe(false);
  });

  it('should handle performance scenarios with large buffers', () => {
    // Large text buffer
    const largeTextBuffer = Buffer.from('Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(2000));
    expect(isBinary(largeTextBuffer, 1024)).toBe(false);
    
    // Large binary buffer with null byte early
    const largeBinaryBuffer = Buffer.concat([
      Buffer.from([0x00]),
      Buffer.from('A'.repeat(50000))
    ]);
    expect(isBinary(largeBinaryBuffer, 1024)).toBe(true);
    
    // Large binary buffer with null byte late
    const largeBinaryBufferLate = Buffer.concat([
      Buffer.from('A'.repeat(2000)),
      Buffer.from([0x00]),
      Buffer.from('A'.repeat(48000))
    ]);
    expect(isBinary(largeBinaryBufferLate, 1024)).toBe(false); // null byte beyond sample
    expect(isBinary(largeBinaryBufferLate, 3000)).toBe(true); // null byte within sample
  });

  it('should handle boundary conditions with sample size', () => {
    const mixedBuffer = Buffer.concat([
      Buffer.from('text content here'), // 17 bytes
      Buffer.from([0x00]), // null byte at position 17
      Buffer.from('more text after null') // 20 more bytes
    ]);
    
    // Test exactly at the boundary
    expect(isBinary(mixedBuffer, 17)).toBe(false); // excludes null byte
    expect(isBinary(mixedBuffer, 18)).toBe(true); // includes null byte
    expect(isBinary(mixedBuffer, 37)).toBe(true); // includes everything
  });

  it('should handle buffers with repeated patterns', () => {
    // Repeated text pattern
    const repeatedText = Buffer.from('ABC'.repeat(100));
    expect(isBinary(repeatedText)).toBe(false);

    // Repeated binary pattern
    const repeatedBinary = Buffer.from(Array(100).fill([0x01, 0x02, 0x03]).flat());
    expect(isBinary(repeatedBinary)).toBe(true);

    // Mixed repeated pattern
    const mixedRepeated = Buffer.from(Array(50).fill([0x41, 0x42, 0x43, 0x00]).flat()); // "ABC" + null
    expect(isBinary(mixedRepeated)).toBe(true);
  });
});

describe('isBinary - stress testing and edge cases', () => {
  it('should handle extremely large sample sizes', () => {
    const buffer = Buffer.from('Hello World');
    expect(isBinary(buffer, Number.MAX_SAFE_INTEGER)).toBe(false);
    expect(isBinary(buffer, 1000000)).toBe(false);
  });

  it('should handle buffers at memory boundaries', () => {
    // Test with buffers that might be at memory allocation boundaries
    const sizes = [1023, 1024, 1025, 2047, 2048, 2049, 4095, 4096, 4097];
    sizes.forEach(size => {
      const textBuffer = Buffer.from('A'.repeat(size));
      expect(isBinary(textBuffer)).toBe(false);
      
      const binaryBuffer = Buffer.concat([
        Buffer.from([0x00]),
        Buffer.from('A'.repeat(size - 1))
      ]);
      expect(isBinary(binaryBuffer)).toBe(true);
    });
  });

  it('should handle concurrent calls consistently', () => {
    const textBuffer = Buffer.from('Hello World');
    const binaryBuffer = Buffer.from([0x00, 0x41, 0x42]);
    
    // Multiple calls should return consistent results
    for (let i = 0; i < 100; i++) {
      expect(isBinary(textBuffer)).toBe(false);
      expect(isBinary(binaryBuffer)).toBe(true);
    }
  });

  it('should handle buffers with all possible byte values', () => {
    // Create buffer with all possible byte values (0-255)
    const allBytes = Buffer.from(Array.from({length: 256}, (_, i) => i));
    expect(isBinary(allBytes)).toBe(true); // Contains null byte and other control chars
    
    // Create buffer with all printable ASCII (32-126)
    const printableAscii = Buffer.from(Array.from({length: 95}, (_, i) => i + 32));
    expect(isBinary(printableAscii)).toBe(false);
  });
});