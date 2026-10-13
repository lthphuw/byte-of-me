import { isRichTextBlank } from '@byte-of-me/ui/lib/rich-text-content';

import type { EducationFormValues } from '@/entities/education/model/education-schema';

type Achievement = EducationFormValues['achievements'][number];

/**
 * Whether removing an achievement would lose something: a title or body in any
 * language, or an image. A body holding only empty blocks does not count.
 */
export function achievementHasContent(
  achievement: Pick<Achievement, 'translations' | 'imageIds'>
): boolean {
  return (
    achievement.imageIds.length > 0 ||
    achievement.translations.some(
      (t) => Boolean(t.title.trim()) || !isRichTextBlank(t.content)
    )
  );
}
