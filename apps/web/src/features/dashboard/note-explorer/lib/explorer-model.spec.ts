/**
 * The explorer's keyboard model, as pure functions.
 *
 * These three carry contracts a reader can lose data over. `resolveCreateTarget`
 * decides where a new note is written — the whole reason creating one stopped
 * always landing at the root. `flattenVisibleRows` defines what "the next row"
 * means, and it is derived from a paginated cache rather than from the DOM, so
 * a wrong answer moves the selection somewhere the author cannot see. `navigate`
 * is the walk itself.
 *
 * Testing them here, rather than by driving a rendered tree, is deliberate: the
 * tree fetches its own levels, so a render test would be asserting on query
 * timing. These take a cache and a set and return an answer.
 */
import { describe, expect, it } from 'bun:test';

import {
  type ArrowKey,
  flattenVisibleRows,
  navigate,
  resolveCreateTarget,
  type VisibleRow,
} from './explorer-model';

import type { NoteTreeNode } from '@/entities/note';

function node(
  id: string,
  overrides: Partial<NoteTreeNode> = {}
): NoteTreeNode {
  return {
    id,
    title: id,
    parentId: null,
    position: 0,
    isPinned: false,
    archivedAt: null,
    updatedAt: new Date('2026-01-01'),
    createdAt: new Date('2026-01-01'),
    status: 'draft',
    isFolder: false,
    labelIds: [],
    childCount: 0,
    ...overrides,
  };
}

const folder = (id: string, overrides: Partial<NoteTreeNode> = {}) =>
  node(id, { isFolder: true, childCount: 1, ...overrides });

describe('resolveCreateTarget', () => {
  it('falls back to the root when nothing is selected', () => {
    expect(resolveCreateTarget(null)).toEqual({
      parentId: null,
      expandId: null,
    });
  });

  it('puts the new row inside a selected folder, and opens it', () => {
    expect(resolveCreateTarget(folder('work'))).toEqual({
      parentId: 'work',
      expandId: 'work',
    });
  });

  it('puts the new row BESIDE a selected note, not inside it', () => {
    const retro = node('retro', { parentId: 'work' });

    // The distinction this whole function exists for: a note is a sibling
    // target, a folder is a container target.
    expect(resolveCreateTarget(retro)).toEqual({
      parentId: 'work',
      expandId: null,
    });
  });

  it('treats a selected root-level note as a root sibling', () => {
    expect(resolveCreateTarget(node('loose'))).toEqual({
      parentId: null,
      expandId: null,
    });
  });
});

describe('flattenVisibleRows', () => {
  const work = folder('work', { childCount: 2 });
  const personal = folder('personal', { childCount: 1 });
  const sprint = node('sprint', { parentId: 'work' });
  const retro = folder('retro', { parentId: 'work', childCount: 1 });
  const notes = node('notes', { parentId: 'retro' });

  const levels = new Map<string, NoteTreeNode[]>([
    ['work', [sprint, retro]],
    ['retro', [notes]],
    ['personal', [node('diary', { parentId: 'personal' })]],
  ]);
  const childrenOf = (parentId: string) => levels.get(parentId);

  const ids = (rows: VisibleRow[]) => rows.map((row) => row.node.id);

  it('lists only the root level when nothing is expanded', () => {
    const rows = flattenVisibleRows([work, personal], new Set(), childrenOf);

    expect(ids(rows)).toEqual(['work', 'personal']);
    expect(rows.every((row) => row.depth === 0)).toBe(true);
  });

  it('splices an expanded folder in immediately after its own row', () => {
    const rows = flattenVisibleRows(
      [work, personal],
      new Set(['work']),
      childrenOf
    );

    expect(ids(rows)).toEqual(['work', 'sprint', 'retro', 'personal']);
    expect(rows.map((row) => row.depth)).toEqual([0, 1, 1, 0]);
  });

  it('recurses through nested expansion', () => {
    const rows = flattenVisibleRows(
      [work],
      new Set(['work', 'retro']),
      childrenOf
    );

    expect(ids(rows)).toEqual(['work', 'sprint', 'retro', 'notes']);
    expect(rows.map((row) => row.depth)).toEqual([0, 1, 1, 2]);
  });

  it('contributes only its own row for a folder whose level is still in flight', () => {
    // The real mid-expand state: `expandedIds` has the folder, the cache has
    // nothing for it yet. Arrow keys must not skip past a row that is about to
    // exist, nor invent one that does not.
    const rows = flattenVisibleRows([work], new Set(['work']), () => undefined);

    expect(ids(rows)).toEqual(['work']);
  });

  it('terminates on a cycle rather than hanging', () => {
    const a = folder('a', { childCount: 1 });
    const cyclic = new Map<string, NoteTreeNode[]>([['a', [a]]]);

    const rows = flattenVisibleRows([a], new Set(['a']), (id) =>
      cyclic.get(id)
    );

    expect(ids(rows)).toEqual(['a']);
  });
});

describe('navigate', () => {
  const work = folder('work', { childCount: 1 });
  const sprint = node('sprint', { parentId: 'work' });
  const personal = node('personal');

  /** `work` expanded, so: work / sprint (child) / personal. */
  const rows: VisibleRow[] = [
    { node: work, depth: 0 },
    { node: sprint, depth: 1 },
    { node: personal, depth: 0 },
  ];
  const expanded = new Set(['work']);

  const run = (key: ArrowKey, selectedId: string | null, open = expanded) =>
    navigate(key, rows, selectedId, open);

  it('adopts the first row when nothing is selected yet', () => {
    expect(run('ArrowUp', null)).toEqual({ selectId: 'work' });
    expect(run('ArrowDown', null)).toEqual({ selectId: 'work' });
  });

  it('walks down and up through the flattened order', () => {
    expect(run('ArrowDown', 'work')).toEqual({ selectId: 'sprint' });
    expect(run('ArrowUp', 'personal')).toEqual({ selectId: 'sprint' });
  });

  it('clamps at both ends instead of wrapping', () => {
    expect(run('ArrowUp', 'work')).toEqual({});
    expect(run('ArrowDown', 'personal')).toEqual({});
  });

  it('opens a collapsed folder before stepping into it', () => {
    expect(run('ArrowRight', 'work', new Set())).toEqual({ expandId: 'work' });
  });

  it('steps into an already-open folder', () => {
    expect(run('ArrowRight', 'work')).toEqual({ selectId: 'sprint' });
  });

  it('does nothing on a leaf', () => {
    expect(run('ArrowRight', 'personal')).toEqual({});
  });

  it('closes an open folder before climbing out of it', () => {
    expect(run('ArrowLeft', 'work')).toEqual({ collapseId: 'work' });
  });

  it('climbs to the parent from a child row', () => {
    expect(run('ArrowLeft', 'sprint')).toEqual({ selectId: 'work' });
  });

  it('does nothing going left at the root', () => {
    expect(run('ArrowLeft', 'personal')).toEqual({});
  });

  it('does nothing at all on an empty tree', () => {
    expect(navigate('ArrowDown', [], null, new Set())).toEqual({});
  });
});
