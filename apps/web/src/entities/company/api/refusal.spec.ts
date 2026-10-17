/**
 * A non-admin caller is refused by every company action before any read or
 * write. The guard sits above `try`, so the refusal rejects the call instead of
 * coming back as an envelope. Prisma is replaced whole, so a leaked query shows.
 */
import type { CompanyFormValues } from '@byte-of-me/contracts/company';
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

import type * as CreateCompanyModule from './create-company';
import type * as DeleteCompanyModule from './delete-company';
import type * as GetAdminCompanyByIdModule from './get-admin-company-by-id';
import type * as GetPaginatedAdminCompaniesModule from './get-paginated-admin-companies';
import type * as UpdateCompanyModule from './update-company';

import {
  resetTestUser,
  setTestUser,
} from '@/shared/lib/auth/set-test-user.test-helper';

const companyDelegate = {
  findFirst: mock<(args: unknown) => Promise<unknown>>(),
  findMany: mock<(args: unknown) => Promise<unknown>>(),
  count: mock<(args: unknown) => Promise<number>>(),
  create: mock<(args: unknown) => Promise<unknown>>(),
  update: mock<(args: unknown) => Promise<unknown>>(),
  delete: mock<(args: unknown) => Promise<unknown>>(),
};
const transaction = mock<(fn: unknown) => Promise<unknown>>();

const originals = {
  company: Object.getOwnPropertyDescriptor(prisma, 'company'),
  transaction: Object.getOwnPropertyDescriptor(prisma, '$transaction'),
};

let createCompany: typeof CreateCompanyModule.createCompany;
let updateCompany: typeof UpdateCompanyModule.updateCompany;
let deleteCompany: typeof DeleteCompanyModule.deleteCompany;
let getAdminCompanyById: typeof GetAdminCompanyByIdModule.getAdminCompanyById;
let getPaginatedAdminCompanies: typeof GetPaginatedAdminCompaniesModule.getPaginatedAdminCompanies;

beforeAll(async () => {
  Object.defineProperty(prisma, 'company', {
    value: companyDelegate,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(prisma, '$transaction', {
    value: transaction,
    writable: true,
    configurable: true,
  });
  ({ createCompany } = await import('./create-company'));
  ({ updateCompany } = await import('./update-company'));
  ({ deleteCompany } = await import('./delete-company'));
  ({ getAdminCompanyById } = await import('./get-admin-company-by-id'));
  ({ getPaginatedAdminCompanies } = await import(
    './get-paginated-admin-companies'
  ));
});

beforeEach(() => {
  for (const fn of Object.values(companyDelegate)) fn.mockReset();
  transaction.mockReset();
});

afterAll(() => {
  if (originals.company)
    Object.defineProperty(prisma, 'company', originals.company);
  if (originals.transaction)
    Object.defineProperty(prisma, '$transaction', originals.transaction);
  resetTestUser();
});

// The inputs are never read: the guard refuses before parsing starts.
const refusedCalls: Array<[string, () => Promise<unknown>]> = [
  ['createCompany', () => createCompany({} as CompanyFormValues)],
  ['updateCompany', () => updateCompany('co-1', {} as CompanyFormValues)],
  ['deleteCompany', () => deleteCompany('co-1')],
  ['getAdminCompanyById', () => getAdminCompanyById('co-1')],
  ['getPaginatedAdminCompanies', () => getPaginatedAdminCompanies(1, 12)],
];

describe('company actions refuse a non-admin caller', () => {
  it.each(refusedCalls)(
    '%s rejects before touching the database',
    async (_name, call) => {
      setTestUser({ id: 'user-2', role: 'USER' });
      try {
        await expect(call()).rejects.toThrow();

        for (const fn of Object.values(companyDelegate)) {
          expect(fn).not.toHaveBeenCalled();
        }
        expect(transaction).not.toHaveBeenCalled();
      } finally {
        resetTestUser();
      }
    }
  );
});
