'use client';

import type { Option } from '@byte-of-me/ui';

import { useTagOptions } from '@/entities/tag/query/use-tag-options';
import { useTechStackOptions } from '@/features/dashboard/tech-stack-management';

/**
 * Tag + tech-stack pickers for the project dialog. Only fetched while the
 * dialog is open, so closing it stops paying for the two admin lists.
 */
export function useProjectReferenceOptions(enabled: boolean): {
  tagOptions: Option[];
  techOptions: Option[];
} {
  const { tagOptions } = useTagOptions(enabled);
  const { options: techOptions } = useTechStackOptions(enabled);

  return { tagOptions, techOptions };
}
