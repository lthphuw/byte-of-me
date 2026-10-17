import type { UseFormReturn } from 'react-hook-form';
import type { UserProfileFormValues } from '@byte-of-me/contracts/user-profile';

import type { AdminUserProfile } from '@/entities/user-profile/model/types';

// The editor keeps a document as an object; legacy HTML stays a string.
function parseAboutMe(content: unknown) {
  if (!content || content === '<p></p>') return '<p></p>';
  if (typeof content !== 'string') return content;
  try {
    return content.startsWith('{') || content.startsWith('[')
      ? JSON.parse(content)
      : content;
  } catch {
    return content;
  }
}

/**
 * Only the columns the save output carries: server extras (ids, timestamps,
 * middleName) left in the form made it dirty after every save.
 */
export function toProfileFormValues(
  user: AdminUserProfile
): UserProfileFormValues {
  return {
    birthdate: user.userProfile?.birthdate
      ? new Date(user.userProfile.birthdate)
      : null,
    socialLinks: (user.socialLinks ?? []).map(
      ({ platform, url, sortOrder }) => ({ platform, url, sortOrder })
    ),
    translations: (user.userProfile?.translations ?? []).map((t) => ({
      language: t.language,
      displayName: t.displayName,
      firstName: t.firstName,
      lastName: t.lastName,
      greeting: t.greeting,
      tagLine: t.tagLine,
      bio: t.bio,
      quote: t.quote,
      quoteAuthor: t.quoteAuthor,
      aboutMe: parseAboutMe(t.aboutMe),
    })),
  };
}

/**
 * The saved values become the baseline, and `keepValues` keeps what was typed
 * in flight. A URL typed with spaces is written back trimmed, unless it changed.
 */
export function rebaseAfterSave(
  form: Pick<
    UseFormReturn<UserProfileFormValues>,
    'getValues' | 'setValue' | 'reset'
  >,
  saved: UserProfileFormValues
): void {
  saved.socialLinks.forEach((link, index) => {
    const name = `socialLinks.${index}.url` as const;
    if (form.getValues(name)?.trim() === link.url) {
      form.setValue(name, link.url);
    }
  });
  form.reset(saved, { keepValues: true });
}
