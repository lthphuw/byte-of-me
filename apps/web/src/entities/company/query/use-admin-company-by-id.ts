'use client';

import { useEditingRecord } from '@byte-of-me/query';

import { getAdminCompanyById } from '@/entities/company/api/get-admin-company-by-id';
import { companyQueries } from '@/entities/company/query/company-queries';

/** The full company for the edit dialog. `undefined` means "new": nothing is fetched. */
export function useAdminCompanyById(id: string | undefined) {
  return useEditingRecord({
    id: id ?? null,
    queryKey: (companyId) => companyQueries.adminById(companyId).queryKey,
    fetchRecord: getAdminCompanyById,
  });
}
