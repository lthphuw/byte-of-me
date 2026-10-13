/**
 * Deleting a visitor message is owner-only and scoped to the owner's rows. A
 * non-owner is refused by a rejected call before any query runs, and the
 * Prisma delegate is replaced, as in `get-paginated-contacts.spec.ts`.
 */
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from 'bun:test';

import { deleteContactMessage } from './delete-contact-message';

import {
  resetTestUser,
  setTestUser,
} from '@/shared/lib/auth/set-test-user.test-helper';

const del = mock();
const original = Object.getOwnPropertyDescriptor(prisma, 'contactMessage');
Object.defineProperty(prisma, 'contactMessage', {
  value: { delete: del },
  writable: true,
  configurable: true,
});

const logError = spyOn(logger, 'error').mockImplementation(() => {});

beforeEach(() => {
  del.mockReset();
  logError.mockClear();
});

afterAll(() => {
  if (original) Object.defineProperty(prisma, 'contactMessage', original);
  else Reflect.deleteProperty(prisma, 'contactMessage');
  logError.mockRestore();
  resetTestUser();
});

describe('deleteContactMessage', () => {
  it('rejects a non-admin before any query runs', async () => {
    setTestUser({ id: 'reader-1', role: 'USER' });
    try {
      await expect(deleteContactMessage('msg-1')).rejects.toThrow(
        'Unauthorized'
      );
      expect(del).not.toHaveBeenCalled();
    } finally {
      resetTestUser();
    }
  });

  it('deletes the row only within the owner’s messages', async () => {
    del.mockResolvedValue({ id: 'msg-1' });

    const res = await deleteContactMessage('msg-1');

    expect(res).toEqual({ success: true, data: null });
    expect(del).toHaveBeenCalledWith({
      where: { id: 'msg-1', userId: 'admin-1' },
    });
  });

  it('rejects a malformed id before the query runs', async () => {
    const res = await deleteContactMessage('');

    expect(res.success).toBe(false);
    expect(del).not.toHaveBeenCalled();
  });

  it('returns the failure envelope when no owned row matches', async () => {
    del.mockRejectedValue(new Error('Record to delete does not exist.'));

    const res = await deleteContactMessage('msg-someone-else');

    expect(res).toEqual({
      success: false,
      errorMsg: 'Failed to delete contact message',
    });
  });
});
