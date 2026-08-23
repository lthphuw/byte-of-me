'use client';

import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { updateWorkspaceSettings } from '@/entities/workspace-settings';
import type { ImageCompressionConfig } from '@/shared/lib/media/image-compression-config';

/**
 * The compression settings popover's own state — read from the server once
 * (`dashboard/media/page.tsx` → `getWorkspaceSettings`) and written in the
 * background from here on.
 *
 * A smaller cousin of `WorkspaceSettingsContext`: that provider tracks a
 * whole settings object with many controls that can each be mid-flight at
 * once, which this popover does not need — it owns exactly one nested field,
 * and the popover holds it open for one editing session rather than the
 * whole workspace's lifetime. `updateWorkspaceSettings` still receives the
 * WHOLE `imageCompression` object on every write, never a single inner key:
 * the `preferences` column merges patches with a shallow `jsonb ||`, which
 * REPLACES the `imageCompression` key outright rather than merging inside it.
 */
export function useCompressionSettings(initial: ImageCompressionConfig) {
  const [config, setConfig] = useState(initial);
  const [saveError, setSaveError] = useState(false);

  /** What the server last confirmed — what a failed write rolls back to. */
  const confirmed = useRef(initial);

  const mutation = useMutation({
    mutationFn: (next: ImageCompressionConfig) =>
      updateWorkspaceSettings({ imageCompression: next }),
    onSuccess: (result) => {
      if (result.success) {
        confirmed.current = result.data.imageCompression;
        setConfig(result.data.imageCompression);
        setSaveError(false);
      } else {
        setConfig(confirmed.current);
        setSaveError(true);
      }
    },
    onError: () => {
      setConfig(confirmed.current);
      setSaveError(true);
    },
  });

  const update = (patch: Partial<ImageCompressionConfig>) => {
    const next = { ...config, ...patch };
    setConfig(next);
    setSaveError(false);
    mutation.mutate(next);
  };

  return { config, update, isSaving: mutation.isPending, saveError };
}
