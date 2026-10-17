/**
 * `getImageCompressionSettings` is the one settings read the image uploader
 * makes, and it runs in the browser before each batch. What this defends is
 * its contract: the success envelope carries the compression config and
 * nothing else; a non-owner is refused before the row is read; and a failed
 * read comes back as a failure envelope, never as the built-in defaults.
 *
 * Prisma is replaced at the delegate, as in `get-admin-tag-options.spec.ts`.
 */
import type { ImageCompressionConfig } from '@byte-of-me/contracts';
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

import type * as GetImageCompressionSettingsModule from './get-image-compression-settings';

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
const logError = spyOn(logger, 'error').mockImplementation(() => {});

let getImageCompressionSettings: typeof GetImageCompressionSettingsModule.getImageCompressionSettings;

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
  ({ getImageCompressionSettings } = await import(
    './get-image-compression-settings'
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

describe('getImageCompressionSettings', () => {
  it('returns the compression config alone, in the success envelope', async () => {
    findUnique.mockResolvedValue({
      preferences: { imageCompression: SAVED, somethingElse: 'x' },
    });

    expect(await getImageCompressionSettings()).toStrictEqual({
      success: true,
      data: SAVED,
    });
  });

  it('refuses a non-owner before any read', async () => {
    setTestUser({ id: 'user-2', role: 'USER', email: 'visitor@example.com' });

    await expect(getImageCompressionSettings()).rejects.toThrow('Unauthorized');
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('reports a failed read through the envelope and logs it, without falling back to defaults', async () => {
    findUnique.mockRejectedValue(new Error('connection refused'));

    expect(await getImageCompressionSettings()).toStrictEqual({
      success: false,
      errorMsg: 'connection refused',
    });
    expect(logError).toHaveBeenCalledTimes(1);
  });
});
