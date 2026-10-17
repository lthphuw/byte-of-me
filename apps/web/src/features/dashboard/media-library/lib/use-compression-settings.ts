'use client';

import { useRef, useState } from 'react';
import type { ImageCompressionConfig } from '@byte-of-me/contracts';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import {
  useUpdateImageCompression,
  useWorkspaceSettings,
} from '@/entities/workspace-settings/query';

/**
 * The compression popover's state from the settings query. A change shows at once in `draft`; the
 * draft is dropped when the LATEST write settles, so the controls hold the server's answer or fall
 * back on refusal.
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
      onSuccess: () => toast.success(t('saved')),
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
