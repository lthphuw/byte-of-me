/**
 * The explorer's pure bucketing/ordering — the contracts the views render
 * from. No React, no queries: rows in, rows out.
 */
import { describe, expect, it } from 'bun:test';

import { groupRows, sortFlat } from './explorer-model';

import type { NoteTreeNode } from '@/entities/note';

let tick = 0;
function row(overrides: Partial<NoteTreeNode> & { id: string }): NoteTreeNode {
  tick += 1;
  return {
    title: `Note ${overrides.id}`,
    parentId: null,
    position: 0,
    isPinned: false,
    archivedAt: null,
    updatedAt: new Date(2026, 0, 1, 0, tick),
    createdAt: new Date(2026, 0, 1, 0, tick),
    status: 'draft',
    isFolder: false,
    labelIds: [],
    childCount: 0,
    ...overrides,
  };
}

describe('sortFlat', () => {
  it('keeps pinned rows first regardless of the chosen order', () => {
    const rows = [
      row({ id: 'a', title: 'zzz', isPinned: true }),
      row({ id: 'b', title: 'aaa' }),
    ];
    expect(sortFlat(rows, 'title').map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('orders by recency for updated/created and alphabetically for title', () => {
    const older = row({ id: 'old' });
    const newer = row({ id: 'new' });
    expect(sortFlat([older, newer], 'updated')[0]?.id).toBe('new');
    expect(sortFlat([older, newer], 'created')[0]?.id).toBe('new');

    const beta = row({ id: 'b', title: 'Beta' });
    const alpha = row({ id: 'a', title: 'Alpha' });
    expect(sortFlat([beta, alpha], 'title').map((r) => r.id)).toEqual([
      'a',
      'b',
    ]);
  });

  it('does not mutate its input', () => {
    const rows = [row({ id: 'b', title: 'b' }), row({ id: 'a', title: 'a' })];
    const before = rows.map((r) => r.id);
    sortFlat(rows, 'title');
    expect(rows.map((r) => r.id)).toEqual(before);
  });
});

describe('groupRows', () => {
  const labels = [
    { id: 'l1', name: 'ml', color: null },
    { id: 'l2', name: 'reading', color: null },
  ];

  it('buckets by status in first-seen order', () => {
    const rows = [
      row({ id: 'a', status: 'active' }),
      row({ id: 'b', status: 'draft' }),
      row({ id: 'c', status: 'active' }),
    ];
    const groups = groupRows(rows, 'status', [], 'No label');
    expect(groups.map((g) => g.title)).toEqual(['active', 'draft']);
    expect(groups[0]?.rows.map((r) => r.id)).toEqual(['a', 'c']);
  });

  it('a row with two labels appears in both groups; unlabeled land last', () => {
    const rows = [
      row({ id: 'a', labelIds: ['l1', 'l2'] }),
      row({ id: 'b' }),
    ];
    const groups = groupRows(rows, 'label', labels, 'No label');
    expect(groups.map((g) => g.title)).toEqual(['ml', 'reading', 'No label']);
    expect(groups[0]?.rows.map((r) => r.id)).toEqual(['a']);
    expect(groups[1]?.rows.map((r) => r.id)).toEqual(['a']);
    expect(groups[2]?.rows.map((r) => r.id)).toEqual(['b']);
  });

  it('drops empty label groups and treats unknown label ids as unlabeled', () => {
    const rows = [row({ id: 'a', labelIds: ['ghost'] })];
    const groups = groupRows(rows, 'label', labels, 'No label');
    expect(groups).toHaveLength(1);
    expect(groups[0]?.key).toBe('no-label');
  });
});
