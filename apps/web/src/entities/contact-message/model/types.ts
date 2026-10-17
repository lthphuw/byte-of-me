import type { Prisma } from '@byte-of-me/db/types';

export type AdminContactMessage = Prisma.ContactMessageGetPayload<object>;

/**
 * Why `sendContactMessage` failed, as a stable id the public form translates
 * (`contact.form.errors.*`): the entity is shared with the dashboard and cannot call next-intl (as
 * `ContactMessageErrorKey`).
 */
export type ContactMessageFailureCode = 'invalid' | 'rate-limited' | 'unknown';
