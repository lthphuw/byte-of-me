import { describe, expect, it } from 'bun:test';

import robots from './robots';

import { routing } from '@/shared/i18n/routing';

const rules = () => {
  const { rules } = robots();
  if (Array.isArray(rules)) throw new Error('expected a single rule');
  return rules;
};

describe('robots', () => {
  it('keeps crawlers out of the dashboard under every locale, and bare', () => {
    const { disallow } = rules();

    expect(disallow).toContain('/dashboard');
    for (const locale of routing.locales) {
      expect(disallow).toContain(`/${locale}/dashboard`);
    }
  });

  it('closes /api/ but leaves the share-image route crawlable', () => {
    const { allow, disallow } = rules();

    expect(disallow).toContain('/api/');
    expect(allow).toContain('/api/og');
  });
});
