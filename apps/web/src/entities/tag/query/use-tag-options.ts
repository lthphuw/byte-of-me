'use client';

import { useMemo } from 'react';
import type { MultiSelectOption } from '@byte-of-me/ui';
import { useQuery } from '@tanstack/react-query';
import { useLocale } from 'next-intl';

import { tagQueries } from '@/entities/tag/query/tag-queries';

/**
 * Admin tags as picker options. The blog editor and the project dialog read the
 * same cache entry, so a tag saved on one page is already on the other.
 */
export function useTagOptions(enabled = true): {
  tagOptions: MultiSelectOption[];
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
} {
  const locale = useLocale();
  const query = useQuery({ ...tagQueries.options(locale), enabled });

  const tagOptions = useMemo(
    () => query.data?.map((tag) => ({ label: tag.name, value: tag.id })) ?? [],
    [query.data]
  );

  return {
    tagOptions,
    isLoading: query.isLoading,
    isError: query.isError,
    retry: () => void query.refetch(),
  };
}
