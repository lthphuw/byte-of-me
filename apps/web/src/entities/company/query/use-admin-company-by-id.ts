'use client';

import { getAdminCompanyById } from '@/entities/company/api/get-admin-company-by-id';
import { companyQueries } from '@/entities/company/query/company-queries';
import { useEditingRecord } from '@/shared/hooks/use-editing-record';

/** The full company for the edit dialog. `undefined` means "new": nothing is fetched. */
export function useAdminCompanyById(id: string | undefined) {
  return useEditingRecord({
    id: id ?? null,
    queryKey: (companyId) => companyQueries.adminById(companyId).queryKey,
    fetchRecord: getAdminCompanyById,
  });
}
