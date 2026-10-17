import { unwrapApiResponse } from '@byte-of-me/api-core';
import { educationKeys } from '@byte-of-me/contracts/education';
import { ADMIN_PAGE_SIZE } from '@byte-of-me/query';
import { queryOptions } from '@tanstack/react-query';

import { getAdminEducationById } from '@/entities/education/api/get-admin-education-by-id';
import { getPaginatedAdminEducations } from '@/entities/education/api/get-paginated-admin-educations';

export const educationQueries = {
  /** One page of the manager list. The server prefetch and `useCrudManager` share this key. */
  adminPage: (page: number) =>
    queryOptions({
      queryKey: educationKeys.adminPage(page),
      queryFn: async () =>
        unwrapApiResponse(
          await getPaginatedAdminEducations(page, ADMIN_PAGE_SIZE)
        ),
    }),
  /** The full entry, achievements included, that the edit dialog loads. */
  adminById: (educationId: string) =>
    queryOptions({
      queryKey: educationKeys.detail(educationId),
      queryFn: async () =>
        unwrapApiResponse(await getAdminEducationById(educationId)),
    }),
};
