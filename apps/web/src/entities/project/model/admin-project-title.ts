import { getTranslatedContent } from '@byte-of-me/api-core';

import type { AdminProject } from './types';

/** The project's title in `locale`, falling back to its slug. */
export function adminProjectTitle(project: AdminProject, locale: string) {
  return (
    getTranslatedContent(project.translations, locale)?.title || project.slug
  );
}
