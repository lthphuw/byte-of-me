import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/utils';

interface ListPageHeaderProps {
  title: string;
  description?: string;
  /** Result count, e.g. "12 posts". Shown next to the description. */
  count?: string;
  /** Filter controls, laid out on their own row beneath the heading. */
  children?: ReactNode;
  className?: string;
}

/**
 * Heading for the public list pages. Gives Blogs and Projects the identity they
 * were missing — both used to open straight into a filter panel with no title,
 * description or count anywhere on the page.
 *
 * A `<header>` nested inside `<main>` is not a banner landmark, so this does not
 * compete with the site header.
 */
export function ListPageHeader({
  title,
  description,
  count,
  children,
  className,
}: ListPageHeaderProps) {
  const hasSubtitle = Boolean(description || count);

  return (
    <header
      className={cn(
        'flex flex-col gap-4 border-b border-border/60 pb-5 md:gap-6 md:pb-6',
        className
      )}
    >
      {/* `space-y-2` flat, per the title → subtitle role in AGENTS.md §14: the
          rhythm scale stays flat at or below 8px, so the old
          `space-y-1.5 md:space-y-2` was a 6→8px step nothing could perceive. */}
      <div className="space-y-2">
        <h1 className="font-heading text-3xl tracking-tight md:text-5xl">
          {title}
        </h1>

        {hasSubtitle && (
          <p className="flex flex-wrap items-center gap-x-2 text-sm leading-relaxed text-muted-foreground md:text-base">
            {description && <span>{description}</span>}
            {description && count && (
              <span aria-hidden className="hidden text-border sm:inline">
                ·
              </span>
            )}
            {/* Own line on mobile — inline after the dot from sm up. */}
            {count && <span className="basis-full sm:basis-auto">{count}</span>}
          </p>
        )}
      </div>

      {children}
    </header>
  );
}
