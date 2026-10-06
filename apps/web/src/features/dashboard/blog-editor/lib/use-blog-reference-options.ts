'use client';

import { useMemo } from 'react';
import type { Option } from '@byte-of-me/ui';
import { useQuery } from '@tanstack/react-query';
import { useLocale } from 'next-intl';

import {
  getAdminProjectOptions,
  type ProjectOption,
} from '@/entities/project/api/get-admin-project-options';
import { projectKeys } from '@/entities/project/model/query-keys';
import { useTagOptions } from '@/entities/tag/query/use-tag-options';
import { unwrapApiResponse } from '@/shared/lib/query/unwrap-api-response';

/**
 * Tag + related-project pickers for the blog form. `enabled` lets the manager
 * start both fetches when the dialog opens, in parallel with the post fetch
 * the form is gated on; the form's own call then reads the same cache entries.
 */
export function useBlogReferenceOptions(enabled = true): {
  tagOptions: Option[];
  projects: ProjectOption[];
  isTagLoading: boolean;
  isProjectLoading: boolean;
} {
  const locale = useLocale();
  const { tagOptions, isLoading: isTagLoading } = useTagOptions(enabled);

  const { data: projectData, isLoading: isProjectLoading } = useQuery({
    queryKey: projectKeys.options(locale),
    queryFn: async () => unwrapApiResponse(await getAdminProjectOptions()),
    enabled,
  });

  const projects = useMemo(() => projectData ?? [], [projectData]);

  return { tagOptions, projects, isTagLoading, isProjectLoading };
}
