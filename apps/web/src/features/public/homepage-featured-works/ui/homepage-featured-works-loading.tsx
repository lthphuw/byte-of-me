import { Skeleton } from '@byte-of-me/ui';

import {
  PLAIN_ROW_HEADER,
  ROW_BODY_STACK,
  ROW_DESCRIPTION_TEXT,
  ROW_META_CELL,
  ROW_NUMBER_TEXT,
  ROW_TITLE_TEXT,
} from '@/entities/featured-work/ui/featured-work-row-classes';
import { cn } from '@/shared/lib/utils';

/** Four rows, like the owner's list; a taller skeleton would shrink the page on resolve. */
const ROWS = 4;
/**
 * Description lines, drawn at the lengths the real rows measure (2026-10-10, four
 * works: 746px at 1280 and 1433px at 390): about five lines in the wide column and
 * about eleven in the 244px phone column. The extra six hide from md.
 */
const DESCRIPTION_LINES_PHONE = 11;
const DESCRIPTION_LINES_WIDE = 5;

/**
 * One line of the text a bar stands in for. The wrapper's height is `1lh` of the
 * surrounding text classes, so the row is as tall as the real one without a pixel value.
 */
function Line({ className, barClassName }: { className?: string; barClassName?: string }) {
  return (
    <div className={cn('flex h-[1lh] items-center', className)}>
      <Skeleton className={cn('h-3', barClassName)} />
    </div>
  );
}

function descriptionLine(index: number) {
  const hiddenFromMd = index >= DESCRIPTION_LINES_WIDE;
  const lastWide = index === DESCRIPTION_LINES_WIDE - 1;
  const lastPhone = index === DESCRIPTION_LINES_PHONE - 1;
  return (
    <Line
      key={index}
      className={hiddenFromMd ? 'md:hidden' : undefined}
      barClassName={cn('w-full', lastWide && 'md:w-3/5', lastPhone && 'w-2/5')}
    />
  );
}

export function HomepageFeaturedWorksLoading() {
  return (
    <div className="space-y-6 md:space-y-8">
      <Skeleton className="h-7 w-40 md:h-9 md:w-56" />

      <div className="divide-y rounded-xl border bg-card px-4 md:px-6">
        {[...Array(ROWS)].map((_, i) => (
          <div key={i} className={PLAIN_ROW_HEADER}>
            <div className={ROW_NUMBER_TEXT}>
              <Line barClassName="w-5" />
            </div>
            <div className={ROW_BODY_STACK}>
              <div className={ROW_TITLE_TEXT}>
                <Line barClassName="h-5 w-48 md:h-6" />
              </div>
              <div className={ROW_DESCRIPTION_TEXT}>
                {[...Array(DESCRIPTION_LINES_PHONE)].map((__, line) => descriptionLine(line))}
              </div>
            </div>
            <div className={ROW_META_CELL}>
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
