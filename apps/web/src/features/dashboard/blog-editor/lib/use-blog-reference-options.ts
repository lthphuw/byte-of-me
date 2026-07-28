'use client';

import { useMemo } from 'react';
import type { Option } from '@byte-of-me/ui';
import { useQuery } from '@tanstack/react-query';

import { getPaginatedAdminProjects } from '@/entities/project/api/get-paginated-admin-projects';
import type { AdminProject } from '@/entities/project/model';
import { projectKeys } from '@/entities/project/model/query-keys';
import { getPaginatedAdminTags } from '@/entities/tag/api/get-paginated-admin-tags';
import { tagKeys } from '@/entities/tag/model/query-keys';

/** Tag + related-project pickers for the blog form. */
export function useBlogReferenceOptions(): {
  tagOptions: Option[];
  projects: AdminProject[];
  isTagLoading: boolean;
  isProjectLoading: boolean;
} {
  const { data: tagsData, isLoading: isTagLoading } = useQuery({
    queryKey: tagKeys.options(1),
    queryFn: () => getPaginatedAdminTags(1, 100),
  });

  const { data: projectData, isLoading: isProjectLoading } = useQuery({
    queryKey: projectKeys.options(),
    queryFn: () => getPaginatedAdminProjects(1, 100),
  });

  const tagOptions = useMemo(
    () =>
      tagsData?.data?.data.map((tag) => ({
        label: tag.translations?.[0]?.name || 'Unknown',
        value: tag.id,
      })) || [],
    [tagsData]
  );

  const projects = useMemo(
    () => projectData?.data?.data || [],
    [projectData]
  );

  return { tagOptions, projects, isTagLoading, isProjectLoading };
}
