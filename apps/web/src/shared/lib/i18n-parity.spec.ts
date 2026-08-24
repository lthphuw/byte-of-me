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
  INVITE_MESSAGE_NAMESPACES,
  pickMessages,
  PRINT_MESSAGE_NAMESPACES,
  PUBLIC_MESSAGE_NAMESPACES,
  PUBLIC_PRINT_MESSAGE_NAMESPACES,
  ROOT_MESSAGE_NAMESPACES,
  SHARE_MESSAGE_NAMESPACES,
  SPACE_DAILY_MESSAGE_NAMESPACES,
  SPACE_GYM_MESSAGE_NAMESPACES,
  SPACE_NOTES_MESSAGE_NAMESPACES,
  SPACE_SHELL_MESSAGE_NAMESPACES,
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
 * list naming `dashboard.gyms` (or naming a namespace after someone renames it
 * in `en.json`) mounts a provider that is simply missing that branch, and every
 * component under it paints its own key path. Nothing in `tsc` sees this: the
 * lists are plain strings and next-intl's generated declarations only type the
 * `t('...')` calls, never the provider's contents.
 *
 * What is NOT asserted here, deliberately: that each subtree's client
 * components only read namespaces its own provider supplies. That needs the
 * import graph, and in this codebase module reachability is a strict superset
 * of render reachability — `use-batch-job.ts` imports a type through
 * `@/entities/note`, whose barrel is `export * from './ui'`, so a mechanical
 * walk reports `/space/gym` as "needing" `dashboard.note` for components it
 * never renders. A test built on that would demand the exact widening this
 * split exists to undo. The audit is done by hand against the render tree and
 * written up in each list's comment; these tests guard the part a machine can
 * actually decide.
 */
describe('client message namespace lists', () => {
  const lists = {
    ROOT_MESSAGE_NAMESPACES,
    PUBLIC_MESSAGE_NAMESPACES,
    AUTH_MESSAGE_NAMESPACES,
    DASHBOARD_MESSAGE_NAMESPACES,
    SPACE_SHELL_MESSAGE_NAMESPACES,
    SPACE_GYM_MESSAGE_NAMESPACES,
    SPACE_DAILY_MESSAGE_NAMESPACES,
    SPACE_NOTES_MESSAGE_NAMESPACES,
    PRINT_MESSAGE_NAMESPACES,
    PUBLIC_PRINT_MESSAGE_NAMESPACES,
    SHARE_MESSAGE_NAMESPACES,
    INVITE_MESSAGE_NAMESPACES,
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

  /**
   * A nested provider REPLACES `messages` — use-intl's `IntlProvider` only
   * falls back to the parent when the prop is `undefined` — so each `/space`
   * module's list has to re-supply the shell's floor rather than inherit it.
   * The four lists spread one shared constant precisely so this cannot drift;
   * this asserts the spread is still there after someone "tidies" it.
   */
  const spaceLists = {
    SPACE_SHELL_MESSAGE_NAMESPACES,
    SPACE_GYM_MESSAGE_NAMESPACES,
    SPACE_DAILY_MESSAGE_NAMESPACES,
    SPACE_NOTES_MESSAGE_NAMESPACES,
  } satisfies Record<string, readonly string[]>;

  for (const [name, namespaces] of Object.entries<readonly string[]>(
    spaceLists
  )) {
    it(`${name} is self-sufficient — it carries the shared floor`, () => {
      expect(
        ['components', 'error', 'global'].filter(
          (namespace) => !namespaces.includes(namespace)
        )
      ).toEqual([]);
    });
  }

  /**
   * `/space` used to mount one provider carrying all four of its namespaces.
   * Splitting it per module is only safe if every one of them still has a
   * provider that supplies it — drop `dashboard.daily` from the daily list and
   * nothing else in this file would notice, because no other list wants it.
   */
  it('still covers every namespace the vault used to mount in one provider', () => {
    const covered = new Set<string>(Object.values(spaceLists).flat());

    expect(
      [
        'components',
        'dashboard.daily',
        'dashboard.gym',
        'dashboard.note',
        'dashboard.space',
        'error',
        'global',
      ].filter((namespace) => !covered.has(namespace))
    ).toEqual([]);
  });
});
