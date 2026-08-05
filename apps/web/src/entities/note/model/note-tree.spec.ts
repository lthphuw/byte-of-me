import { describe, expect, it } from 'bun:test';

import {
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
