'use client';

import { useMemo } from 'react';
import type { Option } from '@byte-of-me/ui';
import { useQuery } from '@tanstack/react-query';

import { getPaginatedAdminTags } from '@/entities/tag/api/get-paginated-admin-tags';
import { tagKeys } from '@/entities/tag/model/query-keys';
import { getAllAdminTechStack } from '@/entities/tech-stack/api/get-all-admin-tech-stacks';
import { techStackKeys } from '@/entities/tech-stack/model/query-keys';

/**
 * Tag + tech-stack pickers for the project dialog. Only fetched while the
 * dialog is open, so closing it stops paying for the two admin lists.
 */
export function useProjectReferenceOptions(enabled: boolean): {
  tagOptions: Option[];
  techOptions: Option[];
} {
  const { data: tagsData } = useQuery({
    queryKey: tagKeys.options(1),
    queryFn: () => getPaginatedAdminTags(1, 100),
    enabled,
  });

  const { data: techData } = useQuery({
    // Shared with CompanyDialog on purpose — same options data.
    queryKey: techStackKeys.options(),
    queryFn: () => getAllAdminTechStack(),
    enabled,
  });

  const tagOptions = useMemo(
    () =>
      tagsData?.data?.data.map((t) => ({
        label: t.translations?.[0]?.name || 'Unknown',
        value: t.id,
      })) || [],
    [tagsData]
  );

  const techOptions = useMemo(
    () => techData?.data?.map((t) => ({ label: t.name, value: t.id })) || [],
    [techData]
  );

  return { tagOptions, techOptions };
}
