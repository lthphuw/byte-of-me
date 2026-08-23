import { describe, expect, it } from 'bun:test';

import { stepValue, weightStepKg } from './set-increments';

describe('weightStepKg', () => {
  it('steps a barbell by a pair of the smallest plates', () => {
    expect(weightStepKg('barbell')).toBe(2.5);
  });

  it('steps dumbbells and kettlebells by the whole kilos their racks come in', () => {
    expect(weightStepKg('dumbbell')).toBe(2);
    expect(weightStepKg('kettlebell')).toBe(2);
  });

  it('steps belt-loaded bodyweight work by a single small disc', () => {
    expect(weightStepKg('bodyweight')).toBe(1.25);
  });

  it('falls back to the default for a code the vocabulary no longer has', () => {
    // The column is a `text`, so a row written before a rename reaches the UI
    // as an unknown code. Indexing the map straight would step by `NaN`.
    expect(weightStepKg('sandbag')).toBe(2.5);
  });
});

describe('stepValue', () => {
  const weight = { min: 0, max: 9999.99 };
  const reps = { min: 0, max: 1000 };

  it('adds and subtracts one increment', () => {
    expect(stepValue('60', 2.5, weight)).toBe('62.5');
    expect(stepValue('60', -2.5, weight)).toBe('57.5');
  });

  it('seeds an empty field from the floor rather than staying empty', () => {
    // A stepper that does nothing on its first press reads as broken.
    expect(stepValue('', 1, reps)).toBe('1');
    expect(stepValue('', -1, reps)).toBe('0');
  });

  it('clamps at both ends instead of producing a value the schema rejects', () => {
    expect(stepValue('0', -2.5, weight)).toBe('0');
    expect(stepValue('1000', 1, reps)).toBe('1000');
  });

  it('rounds to the two decimals the weight column stores', () => {
    // `Decimal(6,2)`: a third decimal is rejected by `workoutSetAddSchema`
    // rather than rounded silently by Postgres.
    expect(stepValue('7.333', 2.5, weight)).toBe('9.83');
  });

  it('treats a field that is not a number as unset', () => {
    expect(stepValue('abc', 2.5, weight)).toBe('2.5');
  });
});
