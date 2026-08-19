import { z } from 'zod';

/** Stable ids for the validation messages, so the dashboard form can translate
 *  them (`dashboard.userProfile.validation.*`) without the entity importing
 *  next-intl. */
export type UserProfileErrorKey =
  | 'platformRequired'
  | 'urlInvalid'
  | 'languageRequired';

/** Used server-side, where there is no request locale to resolve against. */
const DEFAULT_MESSAGES: Record<UserProfileErrorKey, string> = {
  platformRequired: 'Platform is required',
  urlInvalid: 'Enter a full https:// address, or an email address',
  languageRequired: 'Language is required',
};

/**
 * A social link is rendered straight into an `href` on the public site, so the
 * scheme is restricted rather than left to `new URL()`, which happily accepts
 * `javascript:`.
 */
function isWebAddress(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}

/** The `email` platform stores a bare address — `contact-infos` builds the
 *  `mailto:` itself — so requiring a URL for every row would lock the author
 *  out of saving a profile that already has one. */
const EMAIL_ADDRESS = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function createUserProfileSchema(
  t: (key: UserProfileErrorKey) => string = (key) => DEFAULT_MESSAGES[key]
) {
  return z.object({
    socialLinks: z.array(
      z.object({
        platform: z.string().min(1, t('platformRequired')),
        // Was a bare `z.string()`: any typo saved silently and shipped a dead
        // link to the public footer.
        url: z
          .string()
          .trim()
          .refine(
            (value) => isWebAddress(value) || EMAIL_ADDRESS.test(value),
            t('urlInvalid')
          ),
        sortOrder: z.coerce.number().min(0),
      })
    ),
    birthdate: z.coerce.date().nullable().optional(),
    translations: z
      .array(
        z.object({
          language: z.string().min(1, t('languageRequired')),
          displayName: z.string().nullable().optional(),
          tagLine: z.string().nullable().optional(),
          greeting: z.string().nullable().optional(),
          firstName: z.string().nullable().optional(),
          lastName: z.string().nullable().optional(),
          bio: z.string().nullable().optional(),
          aboutMe: z.any().nullable().optional(),
          quote: z.string().nullable().optional(),
          quoteAuthor: z.string().nullable().optional(),
        })
      )
      .min(1),
  });
}

export const userProfileSchema = createUserProfileSchema();

export type UserProfileFormValues = z.infer<typeof userProfileSchema>;
