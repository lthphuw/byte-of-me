/**
 * A non-owner is refused by `updateWorkspaceSettings` before any read or write.
 * The guard sits above `try`, so the refusal rejects the call instead of coming
 * back as an envelope. Prisma is replaced whole, so a leaked query shows.
 */
import type { WorkspaceSettingsPatch } from '@byte-of-me/contracts/workspace-settings';
import { prisma } from '@byte-of-me/db';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
} from 'bun:test';

import type * as UpdateWorkspaceSettingsModule from './update-workspace-settings';

import {
  resetTestUser,
  setTestUser,
} from '@/shared/lib/auth/set-test-user.test-helper';

const workspaceSettingsDelegate = {
  findUnique: mock<(args: unknown) => Promise<unknown>>(),
  create: mock<(args: unknown) => Promise<unknown>>(),
};
const executeRaw = mock<(...args: unknown[]) => Promise<unknown>>();

const originalWorkspaceSettings = Object.getOwnPropertyDescriptor(
  prisma,
  'workspaceSettings'
);
const originalExecuteRaw = Object.getOwnPropertyDescriptor(
  prisma,
  '$executeRaw'
);

let updateWorkspaceSettings: typeof UpdateWorkspaceSettingsModule.updateWorkspaceSettings;

function restore(
  key: 'workspaceSettings' | '$executeRaw',
  original: PropertyDescriptor | undefined
) {
  if (original) Object.defineProperty(prisma, key, original);
  else Reflect.deleteProperty(prisma, key);
}

beforeAll(async () => {
  Object.defineProperty(prisma, 'workspaceSettings', {
    value: workspaceSettingsDelegate,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(prisma, '$executeRaw', {
    value: executeRaw,
    writable: true,
    configurable: true,
  });
  ({ updateWorkspaceSettings } = await import('./update-workspace-settings'));
});

beforeEach(() => {
  for (const fn of Object.values(workspaceSettingsDelegate)) fn.mockReset();
  executeRaw.mockReset();
});

afterAll(() => {
  restore('workspaceSettings', originalWorkspaceSettings);
  restore('$executeRaw', originalExecuteRaw);
  resetTestUser();
});

describe('updateWorkspaceSettings refuses a non-owner', () => {
  it('rejects before touching the database', async () => {
    setTestUser({ id: 'user-2', role: 'USER' });
    try {
      // The patch is never read: the guard refuses before parsing starts.
      await expect(
        updateWorkspaceSettings({} as WorkspaceSettingsPatch)
      ).rejects.toThrow('Unauthorized');

      expect(executeRaw).not.toHaveBeenCalled();
      for (const fn of Object.values(workspaceSettingsDelegate)) {
        expect(fn).not.toHaveBeenCalled();
      }
    } finally {
      resetTestUser();
    }
  });
});
