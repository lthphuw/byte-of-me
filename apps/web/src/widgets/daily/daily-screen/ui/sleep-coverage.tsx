import { CalendarCheck, CalendarRange } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { cn } from '@/shared/lib/utils';
import { StatTile } from '@/shared/ui/stat-tile';

const HEADING_ID = 'sleep-coverage-heading';

/** One day of the window. `future` is a day that has not happened yet and is
 *  outside the denominator — it cannot have been missed. */
export type CoverageState = 'logged' | 'missed' | 'future';

export interface CoverageCell {
  key: string;
  state: CoverageState;
}

/**
 * How much of the last five weeks is actually on record, as a 7×5 grid.
 *
 * It replaces the streak, which was removed deliberately: streak pressure makes
 * people log to keep a number alive, and that corrupts the dataset this app
 * exists to collect. Coverage answers the same question without a penalty.
 */
export async function SleepCoverage({
  cells,
  loggedCount,
  dayCount,
}: {
  /** 35 cells, Monday-first, ending in the week that holds today. */
  cells: CoverageCell[];
  loggedCount: number;
  /** Days in the window that have happened — never the 35 the grid draws. */
  dayCount: number;
}) {
  const t = await getTranslations('dashboard.daily');

  return (
    <section aria-labelledby={HEADING_ID} className="flex flex-col gap-2">
      <h2
        id={HEADING_ID}
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
      >
        <CalendarRange aria-hidden className="size-3.5 shrink-0" />
        {t('sleep.coverageWindow', { weeks: cells.length / 7 })}
      </h2>

      <StatTile
        icon={CalendarCheck}
        label={t('sleep.coverage')}
        value={t('sleep.coverageValue', { n: loggedCount, total: dayCount })}
        context={
          // The grid is redundant by design: the figure above already states
          // the count, so a reader who cannot see the marks loses nothing.
          <div aria-hidden className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((cell) => (
              <span
                key={cell.key}
                className={cn(
                  'aspect-square w-full rounded-[3px]',
                  cell.state === 'logged' && 'bg-primary',
                  cell.state === 'missed' && 'bg-muted',
                  cell.state === 'future' && 'bg-muted/40'
                )}
              />
            ))}
          </div>
        }
      />
    </section>
  );
}
