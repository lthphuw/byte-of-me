import { Skeleton } from '@byte-of-me/ui';

import {
  WORK_BODY,
  WORK_HEAD,
  WORK_LINKS,
  WORK_MEDIA_BLEED,
  WORK_ROW,
  WORK_TITLE,
} from '@/entities/featured-work/ui/featured-work-row-classes';
import { cn } from '@/shared/lib/utils';

/**
 * Two works, about what the homepage shows now. Each one has a demo and a body, so the
 * list keeps roughly its height when it resolves.
 */
const ROWS = 2;
/** Proof-link badges per work: most works have two. */
const LINKS = 2;

/**
 * One line of the text a bar stands in for. The wrapper's height is `1lh` of the
 * surrounding text classes, so the line is as tall as the real one without a pixel value.
 */
function Line({
  className,
  barClassName,
}: {
  className?: string;
  barClassName?: string;
}) {
  return (
    <div className={cn('flex h-[1lh] items-center', className)}>
      <Skeleton className={cn('h-3', barClassName)} />
    </div>
  );
}

export function HomepageFeaturedWorksLoading() {
  return (
    <div className="space-y-6 md:space-y-8">
      <Skeleton className="h-7 w-40 md:h-9 md:w-56" />

      <ul className="divide-y overflow-hidden rounded-xl border bg-card px-4 md:px-5">
        {[...Array(ROWS)].map((_, i) => (
          <li key={i} className={WORK_ROW}>
            <div className={WORK_HEAD}>
              <div className={WORK_TITLE}>
                <Line barClassName="h-4 w-3/4 md:h-5 md:w-2/3" />
              </div>
              <ul className={WORK_LINKS}>
                {[...Array(LINKS)].map((_, j) => (
                  <li key={j}>
                    <Skeleton className="h-9 w-20 rounded-full" />
                  </li>
                ))}
              </ul>
            </div>

            <div
              className={cn(
                WORK_MEDIA_BLEED,
                'flex gap-3 md:grid md:grid-cols-2 md:gap-4'
              )}
            >
              <Skeleton className="aspect-video w-[82%] shrink-0 rounded-md md:w-full" />
              <Skeleton className="hidden aspect-video shrink-0 rounded-md md:block md:w-full" />
            </div>

            <div className={WORK_BODY}>
              <Line barClassName="w-full" />
              <Line barClassName="w-full" />
              <Line barClassName="w-2/3" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
