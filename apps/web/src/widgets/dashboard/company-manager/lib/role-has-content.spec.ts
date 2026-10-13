/**
 * Removing a role asks first only when it would lose something: text in any
 * language, or a task. An untouched row, or one holding only dates, goes at once.
 */
import { describe, expect, it } from 'bun:test';

import { roleHasContent } from './role-has-content';

const blank = { language: 'en', title: '', description: '' };
const task = {
  sortOrder: 0,
  translations: [{ language: 'en', content: 'Shipped the billing API' }],
};

describe('roleHasContent', () => {
  it('lets an untouched role go without asking', () => {
    expect(roleHasContent({ translations: [blank], tasks: [] })).toBe(false);
  });

  it('counts a title typed in a language other than the first', () => {
    const translations = [
      blank,
      { language: 'vi', title: 'Kỹ sư phần mềm', description: '' },
    ];

    expect(roleHasContent({ translations, tasks: [] })).toBe(true);
  });

  it('counts a description on its own', () => {
    const translations = [
      { language: 'en', title: '', description: 'Built the billing system' },
    ];

    expect(roleHasContent({ translations, tasks: [] })).toBe(true);
  });

  it('treats whitespace-only text as nothing', () => {
    const translations = [{ language: 'en', title: '   ', description: '\n' }];

    expect(roleHasContent({ translations, tasks: [] })).toBe(false);
  });

  it('counts a task even when every title is empty', () => {
    expect(roleHasContent({ translations: [blank], tasks: [task] })).toBe(true);
  });
});
