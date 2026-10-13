/**
 * A non-admin caller is refused by every education action before any read or
 * write. The guard sits above `try`, so the refusal rejects the call instead of
 * coming back as an envelope. Prisma is replaced whole, so a leaked query shows.
 */
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

import type * as CreateEducationModule from './create-education';
import type * as DeleteEducationModule from './delete-education';
import type * as GetAdminEducationByIdModule from './get-admin-education-by-id';
import type * as GetPaginatedAdminEducationsModule from './get-paginated-admin-educations';
import type * as UpdateEducationModule from './update-education';

import type { EducationFormValues } from '@/entities/education/model/education-schema';
import {
  resetTestUser,
  setTestUser,
} from '@/shared/lib/auth/set-test-user.test-helper';

const educationDelegate = {
  findFirst: mock<(args: unknown) => Promise<unknown>>(),
  findMany: mock<(args: unknown) => Promise<unknown>>(),
  count: mock<(args: unknown) => Promise<number>>(),
  create: mock<(args: unknown) => Promise<unknown>>(),
  update: mock<(args: unknown) => Promise<unknown>>(),
  delete: mock<(args: unknown) => Promise<unknown>>(),
};
const transaction = mock<(fn: unknown) => Promise<unknown>>();

const originals = {
  education: Object.getOwnPropertyDescriptor(prisma, 'education'),
  transaction: Object.getOwnPropertyDescriptor(prisma, '$transaction'),
};

let createEducation: typeof CreateEducationModule.createEducation;
let updateEducation: typeof UpdateEducationModule.updateEducation;
let deleteEducation: typeof DeleteEducationModule.deleteEducation;
let getAdminEducationById: typeof GetAdminEducationByIdModule.getAdminEducationById;
let getPaginatedAdminEducations: typeof GetPaginatedAdminEducationsModule.getPaginatedAdminEducations;

beforeAll(async () => {
  Object.defineProperty(prisma, 'education', {
    value: educationDelegate,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(prisma, '$transaction', {
    value: transaction,
    writable: true,
    configurable: true,
  });
  ({ createEducation } = await import('./create-education'));
  ({ updateEducation } = await import('./update-education'));
  ({ deleteEducation } = await import('./delete-education'));
  ({ getAdminEducationById } = await import('./get-admin-education-by-id'));
  ({ getPaginatedAdminEducations } = await import(
    './get-paginated-admin-educations'
  ));
});

beforeEach(() => {
  for (const fn of Object.values(educationDelegate)) fn.mockReset();
  transaction.mockReset();
});

afterAll(() => {
  if (originals.education)
    Object.defineProperty(prisma, 'education', originals.education);
  if (originals.transaction)
    Object.defineProperty(prisma, '$transaction', originals.transaction);
  resetTestUser();
});

// The inputs are never read: the guard refuses before parsing starts.
const refusedCalls: Array<[string, () => Promise<unknown>]> = [
  ['createEducation', () => createEducation({} as EducationFormValues)],
  [
    'updateEducation',
    () => updateEducation('edu-1', {} as EducationFormValues),
  ],
  ['deleteEducation', () => deleteEducation('edu-1')],
  ['getAdminEducationById', () => getAdminEducationById('edu-1')],
  [
    'getPaginatedAdminEducations',
    () => getPaginatedAdminEducations(1, 12),
  ],
];

describe('education actions refuse a non-admin caller', () => {
  it.each(refusedCalls)(
    '%s rejects before touching the database',
    async (_name, call) => {
      setTestUser({ id: 'user-2', role: 'USER' });
      try {
        await expect(call()).rejects.toThrow();

        for (const fn of Object.values(educationDelegate)) {
          expect(fn).not.toHaveBeenCalled();
        }
        expect(transaction).not.toHaveBeenCalled();
      } finally {
        resetTestUser();
      }
    }
  );
});
