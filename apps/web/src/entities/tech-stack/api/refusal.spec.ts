/**
 * A non-admin caller is refused by every tech-stack action before any read or
 * write. The guard sits above `try`, so the refusal rejects the call instead of
 * coming back as an envelope. Prisma is replaced whole, so a leaked query shows.
 */
import type { TechStackFormValues } from '@byte-of-me/contracts/tech-stack';
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

import type * as CreateTechStackModule from './create-tech-stack';
import type * as DeleteTechStackModule from './delete-tech-stack';
import type * as GetAdminTechStackByIdModule from './get-admin-tech-stack-by-id';
import type * as GetAllAdminTechStacksModule from './get-all-admin-tech-stacks';
import type * as UpdateTechStackModule from './update-tech-stack';

import {
  resetTestUser,
  setTestUser,
} from '@/shared/lib/auth/set-test-user.test-helper';

const techStackDelegate = {
  findFirst: mock<(args: unknown) => Promise<unknown>>(),
  findUnique: mock<(args: unknown) => Promise<unknown>>(),
  findMany: mock<(args: unknown) => Promise<unknown>>(),
  create: mock<(args: unknown) => Promise<unknown>>(),
  updateMany: mock<(args: unknown) => Promise<unknown>>(),
  deleteMany: mock<(args: unknown) => Promise<unknown>>(),
};

const original = Object.getOwnPropertyDescriptor(prisma, 'techStack');

let addTechStack: typeof CreateTechStackModule.addTechStack;
let updateTechStack: typeof UpdateTechStackModule.updateTechStack;
let deleteTechStack: typeof DeleteTechStackModule.deleteTechStack;
let getAdminTechStackById: typeof GetAdminTechStackByIdModule.getAdminTechStackById;
let getAllAdminTechStack: typeof GetAllAdminTechStacksModule.getAllAdminTechStack;

beforeAll(async () => {
  Object.defineProperty(prisma, 'techStack', {
    value: techStackDelegate,
    writable: true,
    configurable: true,
  });
  ({ addTechStack } = await import('./create-tech-stack'));
  ({ updateTechStack } = await import('./update-tech-stack'));
  ({ deleteTechStack } = await import('./delete-tech-stack'));
  ({ getAdminTechStackById } = await import('./get-admin-tech-stack-by-id'));
  ({ getAllAdminTechStack } = await import('./get-all-admin-tech-stacks'));
});

beforeEach(() => {
  for (const fn of Object.values(techStackDelegate)) fn.mockReset();
});

afterAll(() => {
  if (original) Object.defineProperty(prisma, 'techStack', original);
  resetTestUser();
});

// The inputs are never read: the guard refuses before parsing starts.
const refusedCalls: Array<[string, () => Promise<unknown>]> = [
  ['addTechStack', () => addTechStack({} as TechStackFormValues)],
  [
    'updateTechStack',
    () => updateTechStack('tech-1', {} as TechStackFormValues),
  ],
  ['deleteTechStack', () => deleteTechStack('tech-1')],
  ['getAdminTechStackById', () => getAdminTechStackById('tech-1')],
  ['getAllAdminTechStack', () => getAllAdminTechStack()],
];

describe('tech-stack actions refuse a non-admin caller', () => {
  it.each(refusedCalls)(
    '%s rejects before touching the database',
    async (_name, call) => {
      setTestUser({ id: 'user-2', role: 'USER' });
      try {
        await expect(call()).rejects.toThrow();

        for (const fn of Object.values(techStackDelegate)) {
          expect(fn).not.toHaveBeenCalled();
        }
      } finally {
        resetTestUser();
      }
    }
  );
});
