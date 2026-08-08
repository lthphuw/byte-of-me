'use client';

import { useQuery } from '@tanstack/react-query';
import { FileText, Folder } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  getSharedInbox,
  noteShareKeys,
  sharedNoteHref,
} from '@/entities/note-share';
import { Link } from '@/shared/i18n/navigation';

/**
 * Everything shared with the signed-in address, as entry points.
 *
 * Each row is a share ROOT — `getSharedInbox` hides grants nested inside
 * another, so the same subtree is never offered twice.
 */
export function SharedInboxView() {
  const t = useTranslations('share.inbox');

  const inbox = useQuery({
    queryKey: noteShareKeys.inbox(),
    queryFn: async () => {
      const res = await getSharedInbox();
      if (!res.success) throw new Error(res.errorMsg);
      return res.data;
    },
  });

  return (
    <main className="container mx-auto flex max-w-2xl flex-1 flex-col gap-6 py-12">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('description')}</p>
      </header>

      {inbox.isPending ? (
        <ul className="flex flex-col gap-2" aria-hidden>
          {[0, 1, 2].map((row) => (
            <li key={row} className="h-14 animate-pulse rounded-md bg-muted" />
          ))}
        </ul>
      ) : null}

      {inbox.isError ? (
        <p className="text-sm text-destructive">{t('failed')}</p>
      ) : null}

      {inbox.data?.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      ) : null}

      <ul className="flex flex-col gap-2">
        {inbox.data?.map((item) => (
          <li key={item.noteId}>
            <Link
              href={sharedNoteHref(item.noteId)}
              className="flex items-center gap-3 rounded-md border px-3 py-3 transition-colors hover:bg-accent"
            >
              {item.isFolder ? (
                <Folder className="size-4 shrink-0" />
              ) : (
                <FileText className="size-4 shrink-0" />
              )}

              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{item.title}</span>
                {/* The owner's display name, never their address: a recipient
                    was given a note, not a contact. */}
                {item.ownerName ? (
                  <span className="block truncate text-xs text-muted-foreground">
                    {t('sharedBy', { owner: item.ownerName })}
                  </span>
                ) : null}
              </span>

              <span className="shrink-0 text-xs text-muted-foreground">
                {item.role === 'EDITOR' ? t('roleEditor') : t('roleViewer')}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
