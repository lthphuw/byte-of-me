/**
 * `resolveNoteAccess` is the only thing standing between a share recipient
 * and the rest of the owner's vault. The contracts under test are the ones a
 * caller can observe: that a grant anywhere on the path upward resolves, that
 * the reduction picks the widest root and the strongest role, that an
 * unrecognised role value reads as VIEWER, and that an anonymous caller or a
 * blank id is refused before a query is attempted.
 *
 * The recursive walk, its owner-boundary join and its archival bound are
 * Postgres's job and are not restated here — `$queryRaw` is replaced
 * wholesale, matching `get-note-ancestors.spec.ts`.
 */
import { prisma } from '@byte-of-me/db';
import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

import type * as ResolveNoteAccessModule from './resolve-note-access';

import { setTestUser } from '@/shared/lib/auth/set-test-user.test-helper';

let resolveNoteAccess: typeof ResolveNoteAccessModule.resolveNoteAccess;

beforeAll(async () => {
  ({ resolveNoteAccess } = await import('./resolve-note-access'));
});

const queryRaw = mock();
Object.defineProperty(prisma, '$queryRaw', {
  value: queryRaw,
  writable: true,
  configurable: true,
});

const RECIPIENT = { id: 'user-bob', role: 'USER', email: 'Bob@Example.com' };

describe('resolveNoteAccess', () => {
  beforeEach(() => {
    queryRaw.mockReset().mockResolvedValue([]);
    setTestUser(RECIPIENT);
  });

  it('resolves a direct grant on the note itself', async () => {
    queryRaw.mockResolvedValue([
      { root_id: 'note-1', owner_id: 'owner-1', depth: 0, role: 'VIEWER' },
    ]);

    expect(await resolveNoteAccess('note-1')).toEqual({
      ownerId: 'owner-1',
      role: 'VIEWER',
      rootId: 'note-1',
    });
  });

  it('resolves a grant inherited from an ancestor folder', async () => {
    // depth 2 = the grant sits two levels above the note asked about.
    queryRaw.mockResolvedValue([
      { root_id: 'folder-a', owner_id: 'owner-1', depth: 2, role: 'EDITOR' },
    ]);

    expect(await resolveNoteAccess('note-deep')).toEqual({
      ownerId: 'owner-1',
      role: 'EDITOR',
      rootId: 'folder-a',
    });
  });

  it('takes the widest root and the strongest role when grants stack', async () => {
    // A VIEWER grant on the note itself must not downgrade the EDITOR grant
    // given on the folder above it, and the visible subtree is the folder's.
    queryRaw.mockResolvedValue([
      { root_id: 'note-1', owner_id: 'owner-1', depth: 0, role: 'VIEWER' },
      { root_id: 'folder-a', owner_id: 'owner-1', depth: 3, role: 'EDITOR' },
    ]);

    expect(await resolveNoteAccess('note-1')).toEqual({
      ownerId: 'owner-1',
      role: 'EDITOR',
      rootId: 'folder-a',
    });
  });

  it('reads an unrecognised role as VIEWER', async () => {
    queryRaw.mockResolvedValue([
      { root_id: 'note-1', owner_id: 'owner-1', depth: 0, role: 'OWNER' },
    ]);

    const access = await resolveNoteAccess('note-1');

    expect(access?.role).toBe('VIEWER');
  });

  it('looks the caller up by their normalised address', async () => {
    // The grant is stored lowercased; a session address the provider handed
    // over in another case must still match it.
    await resolveNoteAccess('note-1');

    const values = queryRaw.mock.calls[0]?.slice(1);
    expect(values).toContain('bob@example.com');
  });

  it('returns null when no grant is on the path', async () => {
    queryRaw.mockResolvedValue([]);

    expect(await resolveNoteAccess('note-1')).toBeNull();
  });

  it('returns null for an anonymous caller without querying', async () => {
    setTestUser(null);

    expect(await resolveNoteAccess('note-1')).toBeNull();
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it('returns null for a blank id without querying', async () => {
    expect(await resolveNoteAccess('')).toBeNull();
    expect(queryRaw).not.toHaveBeenCalled();
  });
});
