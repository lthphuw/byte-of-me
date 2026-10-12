'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import {
  useUpdateImageCompression,
  useWorkspaceSettings,
} from '@/entities/workspace-settings/query';
import type { ImageCompressionConfig } from '@/shared/lib/media/image-compression-config';

/**
 * The compression popover's state, read from the settings query. A change shows
 * at once in `draft`, and the draft is dropped when the LATEST write settles: on
 * success the query holds the server's answer, on refusal the controls fall back
 * to it.
 */
export function useCompressionSettings() {
  const t = useTranslations('dashboard.media.compression');
  const { imageCompression } = useWorkspaceSettings();
  const save = useUpdateImageCompression({ errorMessage: t('saveError') });
  const [draft, setDraft] = useState<ImageCompressionConfig | null>(null);
  const latestWrite = useRef(0);

  const update = (patch: Partial<ImageCompressionConfig>) => {
    const next = { ...(draft ?? imageCompression), ...patch };
    latestWrite.current += 1;
    const write = latestWrite.current;
    setDraft(next);
    save.mutate(next, {
      onSettled: () => {
        if (write === latestWrite.current) setDraft(null);
      },
    });
  };

  return {
    config: draft ?? imageCompression,
    update,
    isSaving: save.isPending,
    saveError: save.isError,
  };
}
