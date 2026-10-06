'use client';

import { useMemo } from 'react';
import type { Option } from '@byte-of-me/ui';
import { useQuery } from '@tanstack/react-query';
import { useLocale } from 'next-intl';

import { getAdminTagOptions } from '@/entities/tag/api/get-admin-tag-options';
import { tagKeys } from '@/entities/tag/model/query-keys';
import { unwrapApiResponse } from '@/shared/lib/query/unwrap-api-response';

/**
 * Admin tags mapped to picker options, shared by the blog form and the project
 * dialog so both read one cache entry. Not exported from the slice barrel: it
 * would pull an admin action into the public filters' bundle.
 */
export function useTagOptions(enabled = true): {
  tagOptions: Option[];
  isLoading: boolean;
} {
  const locale = useLocale();

  const { data, isLoading } = useQuery({
    queryKey: tagKeys.options(locale),
    queryFn: async () => unwrapApiResponse(await getAdminTagOptions()),
    enabled,
  });

  const tagOptions = useMemo(
    () => data?.map((tag) => ({ label: tag.name, value: tag.id })) ?? [],
    [data]
  );

  return { tagOptions, isLoading };
}
