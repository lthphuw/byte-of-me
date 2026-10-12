'use client';

import { useMemo } from 'react';
import type { Option } from '@byte-of-me/ui';
import { useQuery } from '@tanstack/react-query';

import { techStackQueries } from '@/entities/tech-stack/query/tech-stack-queries';

export interface TechStackOptionsResult {
  options: Option[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

/**
 * Admin tech stacks as picker options, shared by the project and company
 * dialogs so both read the same cache entry through the same mapping. Only
 * fetched while the host dialog is open.
 */
export function useTechStackOptions(enabled: boolean): TechStackOptionsResult {
  const { data, isLoading, isError, refetch } = useQuery({
    ...techStackQueries.options(),
    enabled,
  });

  const options = useMemo<Option[]>(
    () => data?.map((tech) => ({ label: tech.name, value: tech.id })) ?? [],
    [data]
  );

  return { options, isLoading, isError, refetch: () => void refetch() };
}
