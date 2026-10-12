/**
 * `getAdminWorkspaceSettings` is the action behind the dashboard's settings
 * query. What this defends is its contract: the owner gets the whole settings
 * object in a success envelope; a non-owner is refused before any read, which
 * throws rather than returning an envelope; and a failed read comes back as a
 * failure envelope with its message, never as defaults.
 *
 * Prisma is replaced at the delegate, as in `get-admin-tag-options.spec.ts`.
 */
import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from 'bun:test';

import type * as GetAdminWorkspaceSettingsModule from './get-admin-workspace-settings';

import {
  resetTestUser,
  setTestUser,
} from '@/shared/lib/auth/set-test-user.test-helper';
import type { ImageCompressionConfig } from '@/shared/lib/media/image-compression-config';

const SAVED: ImageCompressionConfig = {
  enabled: false,
  maxWidth: 1600,
  quality: 60,
  format: 'original',
};

const findUnique = mock<(args: unknown) => Promise<unknown>>();
let originalWorkspaceSettings: PropertyDescriptor | undefined;
const logError = spyOn(logger, 'error').mockImplementation(() => {});

let getAdminWorkspaceSettings: typeof GetAdminWorkspaceSettingsModule.getAdminWorkspaceSettings;

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
  ({ getAdminWorkspaceSettings } = await import(
    './get-admin-workspace-settings'
  ));
});

beforeEach(() => {
  findUnique.mockReset().mockResolvedValue(null);
  logError.mockClear();
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
  logError.mockRestore();
});

describe('getAdminWorkspaceSettings', () => {
  it('returns the whole settings object for the owner, in the success envelope', async () => {
    findUnique.mockResolvedValue({ preferences: { imageCompression: SAVED } });

    expect(await getAdminWorkspaceSettings()).toStrictEqual({
      success: true,
      data: { imageCompression: SAVED },
    });
  });

  it('refuses a non-owner before any read', async () => {
    setTestUser({ id: 'user-2', role: 'USER', email: 'visitor@example.com' });

    await expect(getAdminWorkspaceSettings()).rejects.toThrow('Unauthorized');
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('reports a failed read through the envelope, with its message, and logs it', async () => {
    findUnique.mockRejectedValue(new Error('connection refused'));

    expect(await getAdminWorkspaceSettings()).toStrictEqual({
      success: false,
      errorMsg: 'connection refused',
    });
    expect(logError).toHaveBeenCalledTimes(1);
  });
});
