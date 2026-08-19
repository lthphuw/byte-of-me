/**
 * Contract: the value field's type inference on commit. Grouping and a
 * future graph filter compare stored values, so `"2"` and `2` must not both
 * exist depending on how the author happened to type.
 */
import { describe, expect, it } from 'bun:test';

import { coercePropertyValue } from './coerce-property-value';

describe('coercePropertyValue', () => {
  it('infers booleans from their exact literals only', () => {
    expect(coercePropertyValue('true')).toBe(true);
    expect(coercePropertyValue('false')).toBe(false);
    expect(coercePropertyValue('True')).toBe('True');
  });

  it('infers numbers from fully numeric strings only', () => {
    expect(coercePropertyValue('42')).toBe(42);
    expect(coercePropertyValue('-3.5')).toBe(-3.5);
    expect(coercePropertyValue('42a')).toBe('42a');
  });

  it('keeps an empty commit a string, never the number 0', () => {
    // `Number('') === 0` — the guard this test defends.
    expect(coercePropertyValue('')).toBe('');
    expect(coercePropertyValue('   ')).toBe('');
  });

  it('trims the text it stores', () => {
    expect(coercePropertyValue('  reading  ')).toBe('reading');
  });
});
