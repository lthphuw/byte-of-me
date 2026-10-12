'use client';

import type { Option } from '@byte-of-me/ui';

import type { ProjectOption } from '@/entities/project/api/get-admin-project-options';
import { useProjectReferenceOptions } from '@/entities/project/query';
import { useTagOptions } from '@/entities/tag/query';

/** What one picker needs to draw its skeleton, its error with Retry, or its options. */
export type PickerState = {
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
};

/**
 * Tag + related-project pickers for the blog form. `enabled` lets the manager
 * start both fetches when the dialog opens, in parallel with the post fetch
 * the form is gated on; the form's own call then reads the same cache entries.
 */
export function useBlogReferenceOptions(enabled = true): {
  tagOptions: Option[];
  projects: ProjectOption[];
  tagsState: PickerState;
  projectsState: PickerState;
} {
  const tags = useTagOptions(enabled);
  const projectOptions = useProjectReferenceOptions(enabled);

  return {
    tagOptions: tags.tagOptions,
    projects: projectOptions.options,
    tagsState: {
      isLoading: tags.isLoading,
      isError: tags.isError,
      retry: tags.retry,
    },
    projectsState: {
      isLoading: projectOptions.isLoading,
      isError: projectOptions.isError,
      retry: projectOptions.retry,
    },
  };
}
