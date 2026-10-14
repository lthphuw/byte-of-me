import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/utils';

interface ListPageHeaderProps {
  title: string;
  /** Optional strapline under the title (contact). */
  description?: string;
  /** Result count, e.g. "12 posts" (blogs, projects). */
  count?: string;
  /** Filter controls, laid out on their own row beneath the heading. */
  children?: ReactNode;
  className?: string;
}

/**
 * Heading for the public list pages: title, description, count, filters beneath.
 * A `<header>` nested inside `<main>` is not a banner landmark, so it does not
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
            {count && <span>{count}</span>}
          </p>
        )}
      </div>

      {children}
    </header>
  );
}
