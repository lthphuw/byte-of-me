import { describe, expect, it } from 'bun:test';

import { testEditorLabels } from '../editor-labels.test-fixture';

import { buildGroups, filterGroups } from './slash-menu-items';

const groups = buildGroups(testEditorLabels);
const titles = (list: typeof groups) =>
  list.flatMap((group) => group.items.map((item) => item.title));

describe('slash menu entries', () => {
  it('lists each entry once: no two rows run the same command under two names', () => {
    const all = titles(groups);

    expect(new Set(all).size).toBe(all.length);
  });

  it('keeps every entry reachable: the empty query shows them all', () => {
    expect(titles(filterGroups(groups, ''))).toEqual(titles(groups));
  });
});

describe('filterGroups', () => {
  it('matches the title, ignoring case', () => {
    expect(titles(filterGroups(groups, 'BULLET'))).toContain(
      testEditorLabels.bulletList
    );
  });

  it('matches a keyword the row never draws', () => {
    expect(titles(filterGroups(groups, 'divider'))).toEqual([
      testEditorLabels.horizontalRule,
    ]);
  });

  it('matches the description', () => {
    expect(titles(filterGroups(groups, 'several side by side'))).toEqual([
      testEditorLabels.image,
    ]);
  });

  it('drops a group with nothing left, and returns nothing for no match', () => {
    const onlyAlign = filterGroups(groups, 'align');
    expect(onlyAlign.map((group) => group.group)).toEqual([
      testEditorLabels.alignment,
    ]);

    expect(filterGroups(groups, 'zzzzzz')).toEqual([]);
  });
});
