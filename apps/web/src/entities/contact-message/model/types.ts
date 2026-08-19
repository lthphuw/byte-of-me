import type { Prisma } from '@byte-of-me/db/types';

export type AdminContactMessage = Prisma.ContactMessageGetPayload<object>;

/**
 * Why `sendContactMessage` failed, in a form the public form can translate.
 *
 * Same reasoning as `ContactMessageErrorKey` in the schema: the entity is
 * shared with the dashboard and cannot call next-intl, so it emits a stable id
 * and the locale is resolved at the call site (`contact.form.errors.*`).
 */
export type ContactMessageFailureCode = 'invalid' | 'rate-limited' | 'unknown';
