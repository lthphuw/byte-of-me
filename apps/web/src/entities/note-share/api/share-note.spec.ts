/**
 * `shareNote` is the only write that creates a permission. The contracts
 * under test: a grant is never created for a note the caller does not own,
 * the owner's own address is refused, the address is stored normalised so
 * `resolveNoteAccess` can find it, a re-share of the same pair updates the
 * role rather than erroring on the unique constraint, and a mail outage does
 * not roll back a grant that already exists.
 *
 * The Prisma delegates are swapped wholesale via `Object.defineProperty` —
 * `spyOn(prisma.model, 'method')` does not work, because Prisma 7 synthesizes
 * a fresh function on every method access (AGENTS §10).
 */
import { prisma } from '@byte-of-me/db';
import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

import type * as ShareNoteModule from './share-note';

import { env } from '@/shared/config/env';

let shareNote: typeof ShareNoteModule.shareNote;

const findFirst = mock();
const upsert = mock();
const sendMail = mock();
const rateLimitUpsert = mock();

beforeAll(async () => {
  Object.defineProperty(prisma, 'note', {
    value: { findFirst },
    writable: true,
    configurable: true,
  });
  Object.defineProperty(prisma, 'noteShare', {
    value: { upsert },
    writable: true,
    configurable: true,
  });
  // `checkRateLimit` is real — it fails OPEN, so letting it run against a
  // stubbed delegate exercises the action's actual path rather than a
  // hand-waved one.
  Object.defineProperty(prisma, 'rateLimitHit', {
    value: { upsert: rateLimitUpsert, deleteMany: mock() },
    writable: true,
    configurable: true,
  });

  const { mailer } = await import('@/shared/api/mailer');
  Object.defineProperty(mailer, 'sendMail', {
    value: sendMail,
    writable: true,
    configurable: true,
  });

  ({ shareNote } = await import('./share-note'));
});

describe('shareNote', () => {
  beforeEach(() => {
    findFirst.mockReset().mockResolvedValue({ id: 'note-1', title: 'Retro' });
    upsert.mockReset().mockResolvedValue({
      id: 'share-1',
      email: 'bob@example.com',
      role: 'VIEWER',
      recipientId: null,
    });
    sendMail.mockReset().mockResolvedValue(undefined);
    rateLimitUpsert.mockReset().mockResolvedValue({ count: 1 });
  });

  it('refuses a note the caller does not own', async () => {
    findFirst.mockResolvedValue(null);

    const res = await shareNote({
      noteId: 'someone-elses',
      email: 'bob@example.com',
      role: 'VIEWER',
    });

    expect(res.success).toBe(false);
    expect(upsert).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("refuses the owner's own address", async () => {
    // The owner already reaches the note through /space; a self-grant would be
    // a second, weaker path every action on the shared surface would then have
    // to reason about.
    const res = await shareNote({
      noteId: 'note-1',
      email: env.OWNER_EMAIL ?? env.EMAIL,
      role: 'EDITOR',
    });

    expect(res.success).toBe(false);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('stores the address normalised', async () => {
    await shareNote({
      noteId: 'note-1',
      email: '  Bob@Example.COM ',
      role: 'VIEWER',
    });

    const args = upsert.mock.calls[0]?.[0];
    expect(args.where.noteId_email.email).toBe('bob@example.com');
    expect(args.create.email).toBe('bob@example.com');
  });

  it('upserts so re-sharing the same pair changes the role', async () => {
    await shareNote({
      noteId: 'note-1',
      email: 'bob@example.com',
      role: 'EDITOR',
    });

    expect(upsert.mock.calls[0]?.[0].update.role).toBe('EDITOR');
  });

  it('still returns success when the invitation email fails', async () => {
    // The grant is the durable thing. A mail outage must not roll it back or
    // leave the owner thinking nothing happened while the recipient can
    // already open the note.
    sendMail.mockRejectedValue(new Error('smtp down'));

    const res = await shareNote({
      noteId: 'note-1',
      email: 'bob@example.com',
      role: 'VIEWER',
    });

    expect(res.success).toBe(true);
    expect(upsert).toHaveBeenCalled();
  });

  it('refuses once the invitation rate limit is exhausted', async () => {
    rateLimitUpsert.mockResolvedValue({ count: 999 });

    const res = await shareNote({
      noteId: 'note-1',
      email: 'bob@example.com',
      role: 'VIEWER',
    });

    expect(res.success).toBe(false);
    expect(upsert).not.toHaveBeenCalled();
  });
});
