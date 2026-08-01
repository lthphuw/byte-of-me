import { describe, expect, it } from 'bun:test';

// The catalogues live outside `src/`, so the `@/` alias cannot reach them and a
// relative path is the only option. `shared/i18n/request.ts` loads them the same
// way; it escapes this rule only because a dynamic import isn't a static import
// statement. Same exemption as packages/storage/__tests__/storage.spec.ts.
// eslint-disable-next-line import-alias/import-alias
import en from '../../../messages/en.json';
// eslint-disable-next-line import-alias/import-alias
import vi from '../../../messages/vi.json';

/**
 * The two catalogues must stay key-for-key identical.
 *
 * A key present in `en` but missing from `vi` renders as the key itself to a
 * Vietnamese visitor — a silent, visible defect that no type check catches,
 * because next-intl generates its declarations from `en` alone. A key present
 * only in `vi` is dead weight: it survives a rename in `en` and then quietly
 * misleads whoever greps the catalogue next.
 *
 * This is the guard for the dashboard i18n migration, where 41 components'
 * worth of strings land in both files.
 */
function flattenKeys(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object') return [prefix];

  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key)
  );
}

describe('message catalogues', () => {
  const enKeys = new Set(flattenKeys(en));
  const viKeys = new Set(flattenKeys(vi));

  it('has a Vietnamese string for every English key', () => {
    expect([...enKeys].filter((key) => !viKeys.has(key)).sort()).toEqual([]);
  });

  it('has no Vietnamese key without an English counterpart', () => {
    expect([...viKeys].filter((key) => !enKeys.has(key)).sort()).toEqual([]);
  });
});
