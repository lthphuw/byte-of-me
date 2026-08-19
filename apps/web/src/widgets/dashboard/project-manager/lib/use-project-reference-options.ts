'use client';

import { useMemo } from 'react';
import type { Option } from '@byte-of-me/ui';
import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';

import { getPaginatedAdminTags } from '@/entities/tag/api/get-paginated-admin-tags';
import { tagKeys } from '@/entities/tag/model/query-keys';
import { useTechStackOptions } from '@/features/dashboard/tech-stack-management';
import { getTranslatedContent } from '@/shared/lib/i18n-utils';

/**
 * Tag + tech-stack pickers for the project dialog. Only fetched while the
 * dialog is open, so closing it stops paying for the two admin lists.
 */
export function useProjectReferenceOptions(enabled: boolean): {
  tagOptions: Option[];
  techOptions: Option[];
} {
  const t = useTranslations('dashboard.project');
  const locale = useLocale();

  const { data: tagsData } = useQuery({
    queryKey: tagKeys.options(1),
    queryFn: () => getPaginatedAdminTags(1, 100),
    enabled,
  });

  const { options: techOptions } = useTechStackOptions(enabled);

  const tagOptions = useMemo(
    () =>
      tagsData?.data?.data.map((tag) => ({
        // Admin reads keep every locale, so the first row is whichever
        // language sorts first — resolve against the reader's locale instead.
        label:
          getTranslatedContent(tag.translations, locale)?.name ||
          t('unknownTagLabel'),
        value: tag.id,
      })) || [],
    [tagsData, locale, t]
  );

  return { tagOptions, techOptions };
}
