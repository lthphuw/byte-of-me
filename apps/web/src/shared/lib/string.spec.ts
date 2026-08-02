import { describe, expect,it } from 'bun:test';

import { shortenName } from './string';

describe('string.utils - shortenName', () => {
  describe('Edge Cases & Invalid Inputs', () => {
    it('should return fallback for null, undefined, or non-string inputs', () => {
      expect(shortenName(null)).toBe('');
      expect(shortenName(undefined)).toBe('');
      // @ts-expect-error: Testing runtime behavior with invalid type
      expect(shortenName(12345)).toBe('');
      expect(shortenName(null, { fallback: 'Unknown' })).toBe('Unknown');
    });

    it('should handle strings with only spaces or empty strings', () => {
      expect(shortenName('')).toBe('');
      expect(shortenName('   ')).toBe('');
      expect(shortenName('\t\n')).toBe('');
    });

    it('should normalize redundant whitespaces', () => {
      expect(shortenName('  Luong    Thanh   Hoang  Phu  ', { variant: 'initials' })).toBe('LP');
    });

    it('should handle single word names gracefully', () => {
      expect(shortenName('Phu', { variant: 'initials' })).toBe('PH');
      expect(shortenName('A', { variant: 'initials' })).toBe('A');
      expect(shortenName('Phu', { variant: 'compact' })).toBe('Phu');
    });

    it('should handle Unicode characters and Emojis properly', () => {
      // 🚀 emoji is 2 bytes, string[0] would break it, Array.from() fixes it
      expect(shortenName('🚀Rocket Man', { variant: 'initials' })).toBe('🚀M');
      expect(shortenName('Nguyễn Trãi', { variant: 'initials' })).toBe('NT');
    });
  });

  describe('Variant: Initials', () => {
    it('should return correct initials for standard names', () => {
      expect(shortenName('Luong Thanh Hoang Phu')).toBe('LP'); // Defaults to initials
      expect(shortenName('John Doe')).toBe('JD');
    });
  });

  describe('Variant: Compact', () => {
    it('should format correctly using Asian style (last-first)', () => {
      // Expected: First name is the last word, initial comes from the first word
      expect(shortenName('Luong Thanh Hoang Phu', { variant: 'compact', nameOrder: 'last-first' })).toBe('Phu L.');
      expect(shortenName('Nguyễn Văn A', { variant: 'compact', nameOrder: 'last-first' })).toBe('A N.');
    });

    it('should format correctly using Western style (first-last)', () => {
      // Expected: First name is the first word, initial comes from the last word
      expect(shortenName('John William Doe', { variant: 'compact', nameOrder: 'first-last' })).toBe('John D.');
      expect(shortenName('Alice Cooper', { variant: 'compact', nameOrder: 'first-last' })).toBe('Alice C.');
    });
  });

  describe('Variant: Truncate', () => {
    it('should truncate and append ellipses if name exceeds maxLength', () => {
      expect(shortenName('Luong Thanh Hoang Phu', { variant: 'truncate', maxLength: 10 })).toBe('Luong Than...');
    });

    it('should return the original clean name if it is within maxLength', () => {
      expect(shortenName('John Doe', { variant: 'truncate', maxLength: 15 })).toBe('John Doe');
    });
  });
});