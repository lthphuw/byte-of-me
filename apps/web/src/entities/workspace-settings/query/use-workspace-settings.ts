'use client';

import type { WorkspaceSettings } from '@byte-of-me/contracts/workspace-settings';
import { useSuspenseQuery } from '@tanstack/react-query';

import { workspaceSettingsQueries } from '@/entities/workspace-settings/query/workspace-settings-queries';

/**
 * The owner's settings. The dashboard layout hydrates the query, so this renders
 * at once. A failed read throws to the error boundary; it never falls back to
 * defaults, which would look like the saved settings.
 */
export function useWorkspaceSettings(): WorkspaceSettings {
  return useSuspenseQuery(workspaceSettingsQueries.current()).data;
}
