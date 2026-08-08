'use server';

import { prisma } from '@byte-of-me/db';
import { logger } from '@byte-of-me/logger';
import { getLocale, getTranslations } from 'next-intl/server';

import {
  type ShareNoteInput,
  shareNoteSchema,
} from '@/entities/note-share/model/note-share-schema';
import type { NoteShareRow } from '@/entities/note-share/model/types';
import { mailer } from '@/shared/api/mailer';
import { env } from '@/shared/config/env';
import { siteConfig } from '@/shared/config/site';
import {
  isSiteOwnerEmail,
  normalizeEmail,
  requireAdmin,
} from '@/shared/lib/auth';
import { checkRateLimit } from '@/shared/lib/rate-limit';
import { sharedNoteTemplate } from '@/shared/lib/templates/shared-note-template';
import { getErrorMessage } from '@/shared/lib/utils';
import { parseInput } from '@/shared/lib/validate-action-input';
import type { ApiResponse } from '@/shared/types/api/api-response.type';

/**
 * Grant one address access to one note, and tell them about it.
 *
 * See `create-note.ts` for why no note action calls `revalidateTag`.
 */
export async function shareNote(
  input: ShareNoteInput
): Promise<ApiResponse<NoteShareRow>> {
  const session = await requireAdmin();

  const parsed = parseInput(shareNoteSchema, input);
  if (!parsed.ok) {
    return { success: false, errorMsg: parsed.errorMsg };
  }
  const { noteId, role } = parsed.data;
  const email = normalizeEmail(parsed.data.email);

  // The owner already reaches this note through /space. A self-grant would
  // give them a second, weaker path to their own note that every action on
  // the shared surface would then have to reason about.
  if (isSiteOwnerEmail(email)) {
    return { success: false, errorMsg: 'You already have access to this note' };
  }

  try {
    // Ownership is verified against a real row rather than trusted from the
    // id: this action CREATES a permission, so a note id the caller merely
    // guessed must never become somebody else's access.
    const note = await prisma.note.findFirst({
      where: { id: noteId, ownerId: session.id },
      select: { id: true, title: true },
    });

    if (!note) {
      return { success: false, errorMsg: 'Note not found' };
    }

    // Bounded even though only the owner can reach it, because it sends mail.
    // `checkRateLimit` fails OPEN by design — a limiter outage must never
    // become an outage of the thing it protects.
    const { allowed } = await checkRateLimit({
      key: `note-share:${session.id}`,
      limit: 30,
      windowSec: 3600,
    });

    if (!allowed) {
      return {
        success: false,
        errorMsg: 'Too many invitations sent, try again later',
      };
    }

    // Upsert, not create: re-sharing with a different role is the natural way
    // to change one, and the unique constraint would otherwise turn that into
    // an error the dialog has to explain away.
    const share = await prisma.noteShare.upsert({
      where: { noteId_email: { noteId, email } },
      update: { role },
      create: { noteId, email, role, invitedById: session.id },
      select: { id: true, email: true, role: true, recipientId: true },
    });

    await sendInvitation({
      email,
      noteId,
      title: note.title,
      ownerName: session.name ?? siteConfig.name,
    });

    return {
      success: true,
      data: {
        id: share.id,
        email: share.email,
        role: share.role === 'EDITOR' ? 'EDITOR' : 'VIEWER',
        accepted: share.recipientId !== null,
      },
    };
  } catch (error) {
    const errorMsg = getErrorMessage(error, 'Failed to share note');
    logger.error(`Share note error: ${errorMsg}`);
    return { success: false, errorMsg };
  }
}

/**
 * Sending is deliberately outside the caller's failure path.
 *
 * The grant is the durable thing: it already exists by the time this runs, and
 * the recipient can already open the note. Letting a mail outage surface as a
 * failed share would tell the owner nothing happened when something did, and
 * invite them to retry into a duplicate they cannot see.
 */
async function sendInvitation({
  email,
  noteId,
  title,
  ownerName,
}: {
  email: string;
  noteId: string;
  title: string;
  ownerName: string;
}): Promise<void> {
  try {
    const locale = await getLocale();
    const t = await getTranslations('email');

    // Derived from config, never a literal (AGENTS §11.7). `siteConfig.url`
    // is the deployment's own public origin — the same one the OG card and
    // the sitemap are built from.
    const url = `${siteConfig.url}/${locale}/shared/notes/${noteId}`;

    await mailer.sendMail({
      to: email,
      from: env.EMAIL_FROM,
      subject: t('sharedNote.subject', { name: ownerName }),
      text: `${t('sharedNote.title')}\n${url}\n\n`,
      html: await sharedNoteTemplate({
        url,
        host: siteConfig.name,
        owner: ownerName,
        title,
      }),
    });
  } catch (error) {
    logger.error(`Share invitation email failed: ${getErrorMessage(error)}`);
  }
}
