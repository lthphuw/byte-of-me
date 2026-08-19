'use client';

import { useMemo } from 'react';
import type { Option } from '@byte-of-me/ui';
import { useQuery } from '@tanstack/react-query';

import { getAllAdminTechStack } from '@/entities/tech-stack/api/get-all-admin-tech-stacks';
import { techStackKeys } from '@/entities/tech-stack/model/query-keys';

export interface TechStackOptionsResult {
  options: Option[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

/**
 * Admin tech-stack list mapped to picker options, shared by the project and
 * company dialogs so both read the same cache entry through the same mapping.
 * Only fetched while the host dialog is open.
 */
export function useTechStackOptions(enabled: boolean): TechStackOptionsResult {
  const { data, isLoading, isError, refetch } = useQuery({
    // getAllAdminTechStack resolves (never throws) with an ApiResponse —
    // unwrap it so a failure sets `isError` instead of silently mapping to an
    // empty option list, which reads as "no tech stacks exist" and lets a save
    // drop every association.
    queryKey: techStackKeys.options(),
    queryFn: async () => {
      const res = await getAllAdminTechStack();
      if (!res.success) {
        throw new Error(res.errorMsg);
      }
      return res.data;
    },
    enabled,
  });

  const options = useMemo<Option[]>(
    () => data?.map((tech) => ({ label: tech.name, value: tech.id })) ?? [],
    [data]
  );

  return { options, isLoading, isError, refetch: () => void refetch() };
}
