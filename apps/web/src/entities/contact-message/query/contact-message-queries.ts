import { queryOptions } from '@tanstack/react-query';

import { getPaginatedContactMessages } from '@/entities/contact-message/api/get-paginated-contacts';
import { contactMessageKeys } from '@/entities/contact-message/model/query-keys';
import { unwrapApiResponse } from '@/shared/lib/query/unwrap-api-response';

const CONTACT_PAGE_SIZE = 6;

export const contactMessageQueries = {
  /** One page of the owner's messages, filtered by `search`. A refused read throws. */
  list: (page: number, search: string) =>
    queryOptions({
      queryKey: contactMessageKeys.list(page, search),
      queryFn: async () =>
        unwrapApiResponse(
          await getPaginatedContactMessages(page, CONTACT_PAGE_SIZE, { search })
        ),
    }),
};
