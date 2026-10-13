import { describe, expect, it } from 'bun:test';

import { companySchema } from './company-schema';

const validCompany = {
  company: 'Acme Corp',
  location: 'Hanoi',
  startDate: new Date('2021-03-01T00:00:00.000Z'),
  endDate: null,
  translations: [],
  techStackIds: [],
  roles: [],
};

/** The message the form shows under Start date, or null when it is valid. */
function startDateMessage(startDate: unknown): string | undefined | null {
  const result = companySchema.safeParse({ ...validCompany, startDate });
  if (result.success) return null;
  return result.error.issues.find((issue) => issue.path[0] === 'startDate')
    ?.message;
}

describe('companySchema startDate', () => {
  it('names a cleared start date with the required key', () => {
    expect(startDateMessage(undefined)).toBe('validation.required');
  });

  it('names a value that is not a date with the invalid-date key', () => {
    expect(startDateMessage('2021-03-01')).toBe('validation.invalidDate');
  });
});
