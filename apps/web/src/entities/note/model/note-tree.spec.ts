import { describe, expect, it } from 'bun:test';

import {
  buildNoteTree,
  collectDescendantIds,
  wouldCreateCycle,
} from './note-tree';
import type { NoteTreeNode } from './types';

// a → b → c, plus an unrelated root d
const rows = [
  { id: 'a', parentId: null },
  { id: 'b', parentId: 'a' },
  { id: 'c', parentId: 'b' },
  { id: 'd', parentId: null },
];

describe('wouldCreateCycle', () => {
  it('rejects re-parenting a note under its own descendant', () => {
    expect(wouldCreateCycle(rows, 'a', 'c')).toBe(true);
  });

  it('rejects re-parenting a note under itself', () => {
    expect(wouldCreateCycle(rows, 'b', 'b')).toBe(true);
  });

  it('allows a move to an unrelated subtree', () => {
    expect(wouldCreateCycle(rows, 'b', 'd')).toBe(false);
  });

  it('allows a move to the root', () => {
    expect(wouldCreateCycle(rows, 'c', null)).toBe(false);
  });

  it('terminates on data that already contains a cycle', () => {
    // Defensive: a corrupt row set must not hang the request.
    const corrupt = [
      { id: 'x', parentId: 'y' },
      { id: 'y', parentId: 'x' },
    ];
    expect(wouldCreateCycle(corrupt, 'z', 'x')).toBe(false);
  });
});

describe('collectDescendantIds', () => {
  it('returns every transitive child and excludes the note itself', () => {
    expect(collectDescendantIds(rows, 'a').sort()).toEqual(['b', 'c']);
  });

  it('returns an empty list for a leaf', () => {
    expect(collectDescendantIds(rows, 'c')).toEqual([]);
  });
});

// Minimal recursive shape describing only what these tests read off
// buildNoteTree's result. buildNoteTree's real return type carries
// NoteTreeNode from './types', which a later task adds; without this local
// annotation, chaining `.children.map(...)` off a `find()` result loses type
// information through that not-yet-existing import and `bun run check-types`
// reports unrelated "implicitly has an 'any' type" errors on top of the one
// expected `Cannot find module './types'` error. This keeps the spec's own
// types clean in the meantime; it does not touch the missing file.
type TestTreeNode = { id: string; children: TestTreeNode[] };

describe('buildNoteTree', () => {
  // Unlike wouldCreateCycle/collectDescendantIds above, buildNoteTree carries
  // whole rows through the nesting — the sidebar needs title, isPinned,
  // archivedAt and updatedAt on every node, not just id/parentId — so a
  // minimal { id, parentId } fixture would exercise a different function
  // than the one that actually runs in production. This factory builds real,
  // complete NoteTreeNode objects without repeating all five extra fields at
  // every call site. The timestamp is fixed so fixtures are deterministic
  // across runs.
  const FIXED_UPDATED_AT = new Date('2026-01-01T00:00:00.000Z');

  function makeNode(
    id: string,
    parentId: string | null,
    overrides: Partial<NoteTreeNode> = {}
  ): NoteTreeNode {
    return {
      id,
      title: `Note ${id}`,
      parentId,
      position: 0,
      isPinned: false,
      archivedAt: null,
      updatedAt: FIXED_UPDATED_AT,
      createdAt: FIXED_UPDATED_AT,
      status: 'draft',
      isFolder: false,
      labelIds: [],
      ...overrides,
    };
  }

  it('nests flat rows into the correct parent/child structure', () => {
    // Same a → b → c, plus unrelated root d shape as the top-level `rows`
    // fixture above, just carrying the full NoteTreeNode shape.
    const treeRows = [
      makeNode('a', null),
      makeNode('b', 'a'),
      makeNode('c', 'b'),
      makeNode('d', null),
    ];

    const tree = buildNoteTree(treeRows);

    expect(tree.map((n) => n.id)).toEqual(['a', 'd']);

    const a = tree.find((n) => n.id === 'a') as TestTreeNode | undefined;
    expect(a?.children.map((n) => n.id)).toEqual(['b']);
    expect(a?.children[0]?.children.map((n) => n.id)).toEqual(['c']);
    expect(a?.children[0]?.children[0]?.children).toEqual([]);

    const d = tree.find((n) => n.id === 'd');
    expect(d?.children).toEqual([]);
  });

  it('preserves input order within a level (rows arrive pre-sorted by position)', () => {
    // Titles spell out the intended slot so a wrong-order failure reads as
    // "Second: m ended up first", not just an unexplained id shuffle.
    const flat = [
      makeNode('root', null, { title: 'Root' }),
      makeNode('z', 'root', { title: 'First: z' }),
      makeNode('m', 'root', { title: 'Second: m' }),
      makeNode('a', 'root', { title: 'Third: a' }),
    ];

    const tree = buildNoteTree(flat);
    const root = tree.find((n) => n.id === 'root') as
      | TestTreeNode
      | undefined;

    // Not alphabetical, not reversed — exactly the order the rows arrived in.
    expect(root?.children.map((n) => n.id)).toEqual(['z', 'm', 'a']);
  });

  it('surfaces a row whose parentId is absent from the set at the root instead of dropping it', () => {
    const flat = [
      makeNode('root', null, { title: 'Root' }),
      makeNode('orphan', 'does-not-exist', { title: 'Orphan' }),
    ];

    const tree = buildNoteTree(flat);

    expect(tree.map((n) => n.id).sort()).toEqual(['orphan', 'root']);
  });

  it('does not mutate the input rows array or its row objects', () => {
    const flat = [makeNode('a', null), makeNode('b', 'a')];
    const snapshot = flat.map((row) => ({ ...row }));

    buildNoteTree(flat);

    expect(flat).toEqual(snapshot);
    // Full NoteTreeNode key set, in the order makeNode assigns them —
    // proves buildNoteTree copies rows into new nodes rather than mutating
    // (e.g. splicing a `children` key onto) the originals.
    const expectedKeys = [
      'id',
      'title',
      'parentId',
      'position',
      'isPinned',
      'archivedAt',
      'updatedAt',
      'createdAt',
      'status',
      'isFolder',
      'labelIds',
    ];
    expect(Object.keys(flat[0]!)).toEqual(expectedKeys);
    expect(Object.keys(flat[1]!)).toEqual(expectedKeys);
  });

  it('terminates on cyclic input and returns a finite, acyclic structure', () => {
    // Defensive: same corrupt shape wouldCreateCycle is tested against above.
    const corrupt = [makeNode('x', 'y'), makeNode('y', 'x')];

    const tree = buildNoteTree(corrupt);

    // Both cycle members are surfaced at the root rather than wired into
    // each other, so neither ends up nested and both are still visible.
    expect(tree.map((n) => n.id).sort()).toEqual(['x', 'y']);
    expect(tree.every((n) => n.children.length === 0)).toBe(true);

    // A structure that genuinely contains a cycle cannot be serialized —
    // JSON.stringify throws "Converting circular structure to JSON" on one.
    // That it doesn't throw here is the concrete proof the result is acyclic.
    expect(() => JSON.stringify(tree)).not.toThrow();
  });
});
