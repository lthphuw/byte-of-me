import type { AdminProject } from './types';

import { getTranslatedContent } from '@/shared/lib/i18n-utils';

/** The project's title in `locale`, falling back to its slug. */
export function adminProjectTitle(project: AdminProject, locale: string) {
  return (
    getTranslatedContent(project.translations, locale)?.title || project.slug
  );
}
