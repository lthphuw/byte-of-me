import { queryOptions } from '@tanstack/react-query';

import { getAdminCompanyById } from '@/entities/company/api/get-admin-company-by-id';
import { getPaginatedAdminCompanies } from '@/entities/company/api/get-paginated-admin-companies';
import { companyKeys } from '@/entities/company/model/query-keys';
import { ADMIN_PAGE_SIZE } from '@/shared/lib/query/admin-list';
import { unwrapApiResponse } from '@/shared/lib/query/unwrap-api-response';

export const companyQueries = {
  /** One page of the manager list. The server prefetch and `useCrudManager` share this key. */
  adminPage: (page: number) =>
    queryOptions({
      queryKey: companyKeys.adminPage(page),
      queryFn: async () =>
        unwrapApiResponse(
          await getPaginatedAdminCompanies(page, ADMIN_PAGE_SIZE)
        ),
    }),
  /** The full record, roles and tasks included, that the edit dialog loads. */
  adminById: (companyId: string) =>
    queryOptions({
      queryKey: companyKeys.detail(companyId),
      queryFn: async () =>
        unwrapApiResponse(await getAdminCompanyById(companyId)),
    }),
};
