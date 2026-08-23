/**
 * What this spec defends: a journal entry names its own day (unlike a sleep
 * log, whose date is derived from the wake instant), that day may not be in
 * the future, mood is bounded to the five steps the UI draws, and a range
 * read cannot be inverted into an unbounded scan.
 */
import { describe, expect, it } from 'bun:test';

import {
  dayEntryRangeSchema,
  dayEntryUpsertSchema,
  dayPhotoCaptionSchema,
} from './day-entry-schema';

describe('dayEntryUpsertSchema', () => {
  const valid = {
    localDate: '2026-08-22',
    mood: 4,
    reflection: 'A good day.',
    todayKey: '2026-08-23',
  };

  it('accepts a complete entry', () => {
    expect(dayEntryUpsertSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts a null mood and a null reflection', () => {
    const parsed = dayEntryUpsertSchema.safeParse({
      ...valid,
      mood: null,
      reflection: null,
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects a full timestamp where a day is expected', () => {
    const parsed = dayEntryUpsertSchema.safeParse({
      ...valid,
      localDate: '2026-08-22T00:00:00.000Z',
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects a day after todayKey', () => {
    const parsed = dayEntryUpsertSchema.safeParse({
      ...valid,
      localDate: '2026-08-24',
    });
    expect(parsed.success).toBe(false);
  });

  it('accepts todayKey itself', () => {
    const parsed = dayEntryUpsertSchema.safeParse({
      ...valid,
      localDate: '2026-08-23',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects a mood outside 1..5', () => {
    expect(dayEntryUpsertSchema.safeParse({ ...valid, mood: 0 }).success).toBe(
      false
    );
    expect(dayEntryUpsertSchema.safeParse({ ...valid, mood: 6 }).success).toBe(
      false
    );
  });

  it('rejects a reflection past the column ceiling', () => {
    const parsed = dayEntryUpsertSchema.safeParse({
      ...valid,
      reflection: 'x'.repeat(10_001),
    });
    expect(parsed.success).toBe(false);
  });
});

describe('dayEntryRangeSchema', () => {
  it('accepts an ordered window', () => {
    const parsed = dayEntryRangeSchema.safeParse({
      from: '2026-08-01',
      to: '2026-08-31',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects an inverted window', () => {
    const parsed = dayEntryRangeSchema.safeParse({
      from: '2026-08-31',
      to: '2026-08-01',
    });
    expect(parsed.success).toBe(false);
  });
});

describe('dayPhotoCaptionSchema', () => {
  it('accepts an empty caption as null', () => {
    const parsed = dayPhotoCaptionSchema.safeParse({
      id: 'ckxyz00000000000000000000',
      caption: null,
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects a caption past the ceiling', () => {
    const parsed = dayPhotoCaptionSchema.safeParse({
      id: 'ckxyz00000000000000000000',
      caption: 'x'.repeat(501),
    });
    expect(parsed.success).toBe(false);
  });
});
