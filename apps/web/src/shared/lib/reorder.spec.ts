import { resolveReorderMove } from './reorder';

/** Apply a resolved move so the result can be compared to the target order. */
function applyMove(ids: string[], move: { from: number; to: number }) {
  const next = [...ids];
  const [moved] = next.splice(move.from, 1);
  next.splice(move.to, 0, moved);
  return next;
}

function expectResolves(current: string[], next: string[]) {
  const move = resolveReorderMove(current, next);
  expect(move).not.toBeNull();
  expect(applyMove(current, move!)).toEqual(next);
}

describe('resolveReorderMove', () => {
  it('resolves an adjacent swap in either direction', () => {
    expectResolves(['a', 'b', 'c'], ['b', 'a', 'c']);
    expectResolves(['a', 'b', 'c'], ['a', 'c', 'b']);
  });

  it('resolves a move from the end', () => {
    expectResolves(['a', 'b', 'c', 'd'], ['a', 'b', 'd', 'c']);
  });

  it('resolves a multi-position jump', () => {
    expectResolves(['a', 'b', 'c'], ['c', 'a', 'b']);
    expectResolves(['a', 'b', 'c', 'd', 'e'], ['b', 'c', 'd', 'e', 'a']);
  });

  it('returns null when the order is unchanged', () => {
    expect(resolveReorderMove(['a', 'b', 'c'], ['a', 'b', 'c'])).toBeNull();
  });

  it('returns null when the lists have different lengths', () => {
    // A stale render must not be translated into a bogus move.
    expect(resolveReorderMove(['a', 'b'], ['a', 'b', 'c'])).toBeNull();
    expect(resolveReorderMove(['a', 'b', 'c'], ['a', 'b'])).toBeNull();
  });

  it('returns null for empty lists', () => {
    expect(resolveReorderMove([], [])).toBeNull();
  });

  it('ignores ids that are not in the current list', () => {
    expect(resolveReorderMove(['a', 'b'], ['x', 'y'])).toBeNull();
  });
});
