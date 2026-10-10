import { ArrowUpRight, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { PublicFeaturedWork } from '@/entities/featured-work/model/types';

const META = 'font-mono text-xs text-muted-foreground';

/** One numbered line of the homepage list; the whole line is a link when the work has a url. */
export function FeaturedWorkRow({
  work,
  index,
}: {
  work: PublicFeaturedWork;
  index: number;
}) {
  const t = useTranslations('homepage');
  const { github, host, url } = work;

  // Underlined at rest: a hover-only underline does not exist on touch (§14).
  // `group-hover:` is already wrapped in the hover-capable media query by
  // `future.hoverOnlyWhenSupported`.
  const titleClass = url
    ? 'underline decoration-border underline-offset-4 group-hover:decoration-primary'
    : undefined;

  const row = (
    <div className="group grid grid-cols-[2rem_1fr] gap-x-4 gap-y-2 py-5 md:grid-cols-[2rem_1fr_fit-content(45%)] md:gap-x-6">
      <span className="pt-1 text-xs tabular-nums text-muted-foreground">
        {String(index + 1).padStart(2, '0')}
      </span>

      <div className="min-w-0 space-y-2">
        <h3 className="font-heading text-lg tracking-tight [overflow-wrap:anywhere] md:text-xl">
          <span className={titleClass}>{work.title}</span>
          {url && (
            <ArrowUpRight
              aria-hidden
              className="ml-1 inline size-4 align-baseline text-muted-foreground"
            />
          )}
        </h3>
        {work.description && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {work.description}
          </p>
        )}
      </div>

      {(github || host) && (
        <div className="col-start-2 flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 md:col-start-3 md:max-w-[45%] md:flex-col md:items-end">
          {github ? (
            <>
              <span className={`${META} [overflow-wrap:anywhere]`}>
                {github.repo}
              </span>
              <span
                className={`${META} inline-flex items-center gap-1 tabular-nums`}
              >
                <Star aria-hidden className="size-3.5" />
                {t('featuredStars', { count: github.stars })}
              </span>
              {github.merged && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {t('featuredMerged')}
                </span>
              )}
            </>
          ) : (
            <span className={`${META} [overflow-wrap:anywhere]`}>{host}</span>
          )}
        </div>
      )}
    </div>
  );

  if (!url) return row;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="-mx-3 block rounded-lg px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {row}
    </a>
  );
}
