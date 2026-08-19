import { z } from 'zod';

/** Stable ids for the validation messages, so the public form can translate
 *  them (`contact.validation.*`) without the entity importing next-intl. */
export type ContactMessageErrorKey =
  | 'nameTooShort'
  | 'nameTooLong'
  | 'emailInvalid'
  | 'subjectTooLong'
  | 'messageTooShort'
  | 'messageTooLong';

/** Used server-side, where there is no request locale to resolve against. */
const DEFAULT_MESSAGES: Record<ContactMessageErrorKey, string> = {
  nameTooShort: 'Name is too short',
  nameTooLong: 'Name is too long',
  emailInvalid: 'Invalid email address',
  subjectTooLong: 'Subject is too long',
  messageTooShort: 'Message must be at least 10 characters',
  messageTooLong: 'Message is too long',
};

export const MESSAGE_MIN_LENGTH = 10;
export const MESSAGE_MAX_LENGTH = 2000;

export function createContactMessageSchema(
  t: (key: ContactMessageErrorKey) => string = (key) => DEFAULT_MESSAGES[key]
) {
  return z.object({
    name: z.string().trim().min(2, t('nameTooShort')).max(100, t('nameTooLong')),

    email: z.string().trim().email(t('emailInvalid')),

    subject: z
      .string()
      .trim()
      .max(200, t('subjectTooLong'))
      .optional()
      .or(z.literal('')),

    // `.trim()` runs before the bounds: the field used to hold editor HTML, so
    // an empty message was already 7 characters (`<p></p>`) and `<p>abc</p>`
    // cleared min(10) with three typed characters.
    message: z
      .string()
      .trim()
      .min(MESSAGE_MIN_LENGTH, t('messageTooShort'))
      .max(MESSAGE_MAX_LENGTH, t('messageTooLong')),
  });
}

export const contactMessageSchema = createContactMessageSchema();

export type ContactMessageFormValues = z.infer<typeof contactMessageSchema>;
