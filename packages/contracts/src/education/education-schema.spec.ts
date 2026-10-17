import { describe, expect, it } from 'bun:test';

import { educationSchema } from './education-schema';

const validEducation = {
  sortOrder: 0,
  startDate: new Date('2019-09-01T00:00:00.000Z'),
  endDate: null,
  logoId: null,
  translations: [],
  achievements: [],
};

/** The message the form shows under Start date, or null when it is valid. */
function startDateMessage(startDate: unknown): string | undefined | null {
  const result = educationSchema.safeParse({ ...validEducation, startDate });
  if (result.success) return null;
  return result.error.issues.find((issue) => issue.path[0] === 'startDate')
    ?.message;
}

describe('educationSchema startDate', () => {
  it('names a cleared start date with the required key', () => {
    expect(startDateMessage(undefined)).toBe('validation.required');
  });

  it('names a value that is not a date with the invalid-date key', () => {
    expect(startDateMessage('2019-09-01')).toBe('validation.invalidDate');
  });
});
