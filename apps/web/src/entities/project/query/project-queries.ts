import { unwrapApiResponse } from '@byte-of-me/api-core';
import {
  projectKeys,
  type PublicProjectFilters,
} from '@byte-of-me/contracts/project';
import { queryOptions } from '@tanstack/react-query';

import { getAdminProjectById } from '@/entities/project/api/get-admin-project-by-id';
import { getAdminProjectOptions } from '@/entities/project/api/get-admin-project-options';
import { getPaginatedAdminProjects } from '@/entities/project/api/get-paginated-admin-projects';
import { getPaginatedPublicProjects } from '@/entities/project/api/get-paginated-public-projects';
import { ADMIN_PAGE_SIZE } from '@/shared/lib/query/admin-list';

/**
 * Not in the key, so it lives here: the server prefetch and the client hook
 * both read this factory and cannot disagree on the page size.
 */
const PUBLIC_PAGE_SIZE = 8;

export const projectQueries = {
  /** One page of the public timeline, for the prefetch and `usePublicProjectList`. */
  publicList: (page: number, filters: PublicProjectFilters) =>
    queryOptions({
      queryKey: projectKeys.publicList(page, filters),
      queryFn: async () =>
        unwrapApiResponse(
          await getPaginatedPublicProjects({
            ...filters,
            page,
            limit: PUBLIC_PAGE_SIZE,
          })
        ),
    }),
  /** Admin projects for a picker, resolved in `locale`. */
  options: (locale: string) =>
    queryOptions({
      queryKey: projectKeys.options(locale),
      queryFn: async () => unwrapApiResponse(await getAdminProjectOptions()),
    }),
  /** One page of the manager list. The server prefetch and `useCrudManager` share this key. */
  adminPage: (page: number) =>
    queryOptions({
      queryKey: projectKeys.adminPage(page),
      queryFn: async () =>
        unwrapApiResponse(
          await getPaginatedAdminProjects(page, ADMIN_PAGE_SIZE)
        ),
    }),
  /** The full record the edit dialog loads. */
  adminById: (id: string) =>
    queryOptions({
      queryKey: projectKeys.detail(id),
      queryFn: async () => unwrapApiResponse(await getAdminProjectById(id)),
    }),
};
