/**
 * The owner's profile actions refuse a signed-in non-owner by rejecting the
 * call, not by returning a failure envelope, and never reach the database.
 * The Prisma delegate and the transaction are replaced, as in the blog specs.
 */
import { prisma } from '@byte-of-me/db';
import { afterAll, beforeEach, describe, expect, it, mock } from 'bun:test';

import { getUserProfile } from './get-user-profile';
import { getAdminUserProfile } from './get-user-profile-with-translations';
import { saveProfile } from './save-profile';

import type { UserProfileFormValues } from '@/entities/user-profile/model/user-profile-schema';
import {
  resetTestUser,
  setTestUser,
} from '@/shared/lib/auth/set-test-user.test-helper';

const findUniqueOrThrow = mock();
const transaction = mock();

const userOriginal = Object.getOwnPropertyDescriptor(prisma, 'user');
const transactionOriginal = Object.getOwnPropertyDescriptor(
  prisma,
  '$transaction'
);
Object.defineProperty(prisma, 'user', {
  value: { findUniqueOrThrow },
  writable: true,
  configurable: true,
});
Object.defineProperty(prisma, '$transaction', {
  value: transaction,
  writable: true,
  configurable: true,
});

const EMPTY_FORM: UserProfileFormValues = {
  birthdate: null,
  socialLinks: [],
  translations: [],
};

beforeEach(() => {
  findUniqueOrThrow.mockReset();
  transaction.mockReset();
  setTestUser({ id: 'reader-1', role: 'USER' });
});

afterAll(() => {
  if (userOriginal) Object.defineProperty(prisma, 'user', userOriginal);
  else Reflect.deleteProperty(prisma, 'user');
  if (transactionOriginal) {
    Object.defineProperty(prisma, '$transaction', transactionOriginal);
  } else {
    Reflect.deleteProperty(prisma, '$transaction');
  }
  resetTestUser();
});

describe('user-profile actions refuse a non-owner', () => {
  it('getAdminUserProfile rejects and never queries', async () => {
    await expect(getAdminUserProfile()).rejects.toThrow('Unauthorized');
    expect(findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it('getUserProfile rejects and never queries', async () => {
    await expect(getUserProfile()).rejects.toThrow('Unauthorized');
    expect(findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it('saveProfile rejects and never opens a transaction', async () => {
    await expect(saveProfile(EMPTY_FORM)).rejects.toThrow('Unauthorized');
    expect(transaction).not.toHaveBeenCalled();
  });
});
