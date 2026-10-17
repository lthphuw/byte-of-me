import { describe, expect, it } from 'bun:test';

// The catalogues live outside `src/`, so the `@/` alias cannot reach them; a relative path is the
// only option (same exemption as packages/storage/__tests__/storage.spec.ts).
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
 * The two catalogues must stay key-for-key identical: a key missing from `vi` renders as the key itself
 * (no type check catches it, next-intl types come from `en` alone); a key only in `vi` is dead weight.
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
 * `pickMessages` skips a namespace it cannot reach instead of throwing, so a provider list naming a
 * missing or renamed namespace silently paints key paths. tsc cannot see it; only this part is asserted.
 * Whether subtrees read only their own provider's namespaces is audited by hand in each list's comment.
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
