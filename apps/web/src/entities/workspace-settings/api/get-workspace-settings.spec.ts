/**
 * Defends that `getWorkspaceSettings` fails closed: a non-owner is refused before the row is read
 * and a failed read rejects, never returning defaults (uploads would compress with settings the
 * owner never chose). Prisma is replaced at the delegate, as in `get-admin-tag-options.spec.ts`.
 */
import type { ImageCompressionConfig } from '@byte-of-me/contracts';
import { prisma } from '@byte-of-me/db';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
} from 'bun:test';

import type * as GetWorkspaceSettingsModule from './get-workspace-settings';

import {
  resetTestUser,
  setTestUser,
} from '@/shared/lib/auth/set-test-user.test-helper';

const SAVED: ImageCompressionConfig = {
  enabled: false,
  maxWidth: 1600,
  quality: 60,
  format: 'original',
};

const findUnique = mock<(args: unknown) => Promise<unknown>>();
let originalWorkspaceSettings: PropertyDescriptor | undefined;

let getWorkspaceSettings: typeof GetWorkspaceSettingsModule.getWorkspaceSettings;

beforeAll(async () => {
  originalWorkspaceSettings = Object.getOwnPropertyDescriptor(
    prisma,
    'workspaceSettings'
  );
  Object.defineProperty(prisma, 'workspaceSettings', {
    value: { findUnique },
    writable: true,
    configurable: true,
  });
  ({ getWorkspaceSettings } = await import('./get-workspace-settings'));
});

beforeEach(() => {
  findUnique.mockReset().mockResolvedValue(null);
});

afterEach(() => {
  resetTestUser();
});

afterAll(() => {
  if (originalWorkspaceSettings) {
    Object.defineProperty(prisma, 'workspaceSettings', originalWorkspaceSettings);
  } else {
    Reflect.deleteProperty(prisma, 'workspaceSettings');
  }
});

describe('getWorkspaceSettings', () => {
  it('returns the signed-in owner their saved config, parsed', async () => {
    findUnique.mockResolvedValue({ preferences: { imageCompression: SAVED } });

    expect(await getWorkspaceSettings()).toStrictEqual({
      imageCompression: SAVED,
    });
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ownerId: 'admin-1' } })
    );
  });

  it('refuses a non-owner before the row is read, and does not return defaults', async () => {
    setTestUser({ id: 'user-2', role: 'USER', email: 'visitor@example.com' });

    await expect(getWorkspaceSettings()).rejects.toThrow('Unauthorized');
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('rejects when the read fails, instead of returning the defaults', async () => {
    findUnique.mockRejectedValue(new Error('connection refused'));

    await expect(getWorkspaceSettings()).rejects.toThrow('connection refused');
  });
});
