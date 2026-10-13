/**
 * A refused caller rejects the call instead of receiving an envelope. The guard
 * sits above the `try` in every comment action (AGENTS §8), so the refusal never
 * reaches Prisma.
 */
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';

import { getPaginatedAdminComments } from './get-paginated-admin-comments';
import { hideComment } from './hide-comment';
import { postComment } from './post-comment';
import { setCommentVisibility } from './set-comment-visibility';

import {
  resetTestUser,
  setTestUser,
} from '@/shared/lib/auth/set-test-user.test-helper';

const COMMENT_ID = 'cl9ebqhxk00003b600tymydho';
const BLOG_ID = 'cl9ebqhxk00009b600tymydzz';

afterEach(() => {
  resetTestUser();
});

describe('admin comment actions refuse a non-admin by rejecting', () => {
  beforeEach(() => {
    setTestUser({ id: 'user-other', role: 'USER', email: 'visitor@example.com' });
  });

  it('getPaginatedAdminComments', async () => {
    await expect(getPaginatedAdminComments(1, 12)).rejects.toThrow(
      'Unauthorized'
    );
  });

  it('setCommentVisibility', async () => {
    await expect(setCommentVisibility(COMMENT_ID, true)).rejects.toThrow(
      'Unauthorized'
    );
  });
});

describe('visitor comment actions refuse an anonymous caller by rejecting', () => {
  beforeEach(() => {
    setTestUser(null);
  });

  it('hideComment', async () => {
    await expect(hideComment(COMMENT_ID)).rejects.toThrow('Unauthorized');
  });

  it('postComment', async () => {
    await expect(postComment(BLOG_ID, 'A useful comment')).rejects.toThrow(
      'Unauthorized'
    );
  });
});
