import { describe, expect, it } from 'bun:test';

// The catalogues live outside `src/`, so the `@/` alias cannot reach them and a
// relative path is the only option. `shared/i18n/request.ts` loads them the same
// way; it escapes this rule only because a dynamic import isn't a static import
// statement. Same exemption as packages/storage/__tests__/storage.spec.ts.
// eslint-disable-next-line import-alias/import-alias
import en from '../../../messages/en.json';
// eslint-disable-next-line import-alias/import-alias
import vi from '../../../messages/vi.json';

import {
  AUTH_MESSAGE_NAMESPACES,
  DASHBOARD_MESSAGE_NAMESPACES,
  pickMessages,
  PUBLIC_MESSAGE_NAMESPACES,
  PUBLIC_PRINT_MESSAGE_NAMESPACES,
  ROOT_MESSAGE_NAMESPACES,
} from '@/shared/i18n/messages';

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

  return Object.entries(value as Record<string, unknown>).flatMap(
    ([key, child]) => flattenKeys(child, prefix ? `${prefix}.${key}` : key)
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

/**
 * The provider lists in `shared/i18n/messages.ts` fail the same way the
 * catalogues do: silently, at runtime, on screen.
 *
 * `pickMessages` skips a namespace it cannot reach rather than throwing, so a
 * list naming `dashboard.blogs` (or naming a namespace after someone renames it
 * in `en.json`) mounts a provider that is simply missing that branch, and every
 * component under it paints its own key path. Nothing in `tsc` sees this: the
 * lists are plain strings and next-intl's generated declarations only type the
 * `t('...')` calls, never the provider's contents.
 *
 * What is NOT asserted here, deliberately: that each subtree's client
 * components only read namespaces its own provider supplies. That needs the
 * import graph, and module reachability is a superset of render reachability.
 * The audit is done by hand and written up in each list's comment; these tests
 * guard the part a machine can actually decide.
 */
describe('client message namespace lists', () => {
  const lists = {
    ROOT_MESSAGE_NAMESPACES,
    PUBLIC_MESSAGE_NAMESPACES,
    AUTH_MESSAGE_NAMESPACES,
    DASHBOARD_MESSAGE_NAMESPACES,
              PUBLIC_PRINT_MESSAGE_NAMESPACES,
      } satisfies Record<string, readonly string[]>;

  /** A namespace `pickMessages` dropped, i.e. one that is not in the file. */
  function unreachable(
    catalogue: Record<string, unknown>,
    namespaces: readonly string[]
  ): string[] {
    return namespaces.filter(
      (namespace) =>
        flattenKeys(pickMessages(catalogue, [namespace])).join() === ''
    );
  }

  for (const [name, namespaces] of Object.entries(lists)) {
    it(`${name} names only namespaces that exist in both catalogues`, () => {
      expect({
        en: unreachable(en, namespaces),
        vi: unreachable(vi, namespaces),
      }).toEqual({ en: [], vi: [] });
    });
  }
});
