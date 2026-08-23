'use client';

import { ListTree, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { NOTE_GRAPH_HREF, NOTES_HREF } from '@/entities/note';
import { Link } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/utils';

/** Which of the two views of the same notes is on screen. */
export type NoteView = 'list' | 'graph';

/**
 * List ⇄ Graph, the two ways of looking at the vault.
 *
 * A feature rather than a piece of either widget, because both widgets need
 * it and neither may import the other: the explorer panel renders it under
 * its header, and `SpaceGraphScreen` renders it in its own. That is the same
 * layering reason `ExplorerHeader` takes the space nav trigger as a slot —
 * except that this one sits in a WIDGET file on the notes side
 * (`note-tree-panel.tsx`), so it needs no slot at all: a widget importing a
 * feature is the direction FSD allows.
 *
 * Links, not buttons with a router push: these are two routes, so the browser
 * should be able to open either in a new tab, and `aria-current="page"` is
 * then the honest state — `aria-pressed` would describe a toggle that stayed
 * on this page. The rail marks its own destinations the same way.
 *
 * The current segment INVERTS rather than taking a tint. The palette is 0%
 * saturation throughout (AGENTS §14), so a coloured "selected" state does not
 * exist here; the fill plus the weight change is what carries the state, and
 * both survive greyscale and high-contrast alike.
 */
export function NoteViewSwitch({
  current,
  className,
}: {
  current: NoteView;
  className?: string;
}) {
  const t = useTranslations('dashboard.note.views');

  return (
    <nav
      aria-label={t('label')}
      className={cn(
        'flex items-center gap-0.5 rounded-md border p-0.5',
        className
      )}
    >
      <ViewLink
        href={NOTES_HREF}
        isCurrent={current === 'list'}
        label={t('list')}
        icon={<ListTree className="size-4 shrink-0" />}
      />
      <ViewLink
        href={NOTE_GRAPH_HREF}
        isCurrent={current === 'graph'}
        label={t('graph')}
        icon={<Share2 className="size-4 shrink-0" />}
      />
    </nav>
  );
}

function ViewLink({
  href,
  isCurrent,
  label,
  icon,
}: {
  href: string;
  isCurrent: boolean;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={isCurrent ? 'page' : undefined}
      className={cn(
        // 36px tall to sit level with the icon buttons this shares a pane
        // with, and 44px to a finger: the `::after` widens what can be
        // TAPPED without widening what is drawn, the same trick the
        // workspace's resize handles use. The row's own padding is exactly
        // the 4px it grows into, so nothing above or below is overlapped.
        'relative flex h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-[5px] px-3 text-xs font-medium transition-colors',
        "after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']",
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        isCurrent
          ? 'bg-primary text-primary-foreground'
          : 'font-normal text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
    </Link>
  );
}
