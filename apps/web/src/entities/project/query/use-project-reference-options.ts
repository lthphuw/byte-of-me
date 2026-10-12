'use client';

import { useQuery } from '@tanstack/react-query';
import { useLocale } from 'next-intl';

import { projectQueries } from '@/entities/project/query/project-queries';

/**
 * Admin projects for a picker (the blog editor's related project). Fetched only
 * while `enabled`, so a closed editor pays for nothing.
 */
export function useProjectReferenceOptions(enabled: boolean) {
  const locale = useLocale();
  const query = useQuery({ ...projectQueries.options(locale), enabled });

  return {
    options: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    retry: () => void query.refetch(),
  };
}
