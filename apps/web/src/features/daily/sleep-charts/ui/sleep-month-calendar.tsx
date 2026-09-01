'use client';

import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import {
  daysInMonth,
  mondayIndex,
  monthDisplay,
} from '@/features/daily/sleep-charts/lib/day-series';
import { Link } from '@/shared/i18n/navigation';
import { splitMinutes } from '@/shared/lib/health/duration';
import { addDays, localDateKey } from '@/shared/lib/health/local-date';
import { cn } from '@/shared/lib/utils';
import { MONTH_CALENDAR_FILL } from '@/shared/ui/chart';

/** Shade edges as fractions of the nightly target — against the TARGET, never
 *  against the window's own maximum, or one long night re-shades the month.
 *  At the 8h default: under 6h, 6h–7h12m, 7h12m–8h, 8h or more. */
const BAND_EDGES = [0.75, 0.9, 1] as const;

/** A Monday, for naming the seven columns. Formatted in UTC, like every other
 *  date key here. */
const WEEKDAY_ANCHOR_MS = Date.UTC(2024, 0, 1);

const DAY_MS = 86_400_000;

/** One night as the grid needs it. The caller resolves the glyph, so this
 *  slice never has to know what a mood rating looks like. */
export interface CalendarNight {
  /** `YYYY-MM-DD`, the same key `localDateKey` produces. */
  localDate: string;
  /** Minutes asleep. `null` is a night never logged — never `0`, which would
   *  claim a night of no sleep. */
  value: number | null;
  mood: { icon: LucideIcon; label: string } | null;
  /** A reflection or any photo. */
  hasEntry: boolean;
}

/**
 * The month as a grid of BUTTONS, not a picture: each mark carries its whole
 * meaning — date, duration, mood, written-up — in its own accessible name, so
 * there is no legend and no `sr-only` table. Shade is duration, glyph is mood.
 */
export function SleepMonthCalendar({
  nights,
  monthStartKey,
  todayKey,
  targetMin,
  onSelect,
  prevMonthKey,
  nextMonthKey,
  className,
}: {
  nights: CalendarNight[];
  /** `YYYY-MM-DD` of the 1st of the month being drawn. */
  monthStartKey: string;
  /** The reader's today, so "future" is decided against their calendar rather
   *  than against the last logged row. */
  todayKey: string;
  /** The scale the shades band against. Never printed here, and never
   *  defaulted — a fallback would be a claim the caller did not make. */
  targetMin: number;
  /** Opens the sheet for this day. */
  onSelect: (key: string) => void;
  /** `YYYY-MM` of the month before this one. */
  prevMonthKey: string;
  /** `null` at the current month — there is no future to page into. */
  nextMonthKey: string | null;
  className?: string;
}) {
  const t = useTranslations('dashboard.daily');
  const locale = useLocale();

  const monthStart = new Date(`${monthStartKey}T00:00:00.000Z`);
  const dayCount = daysInMonth(monthStart);
  const byDay = new Map(nights.map((night) => [night.localDate, night]));

  const dayFormat = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  });

  const weekdayFormat = new Intl.DateTimeFormat(locale, {
    weekday: 'narrow',
    timeZone: 'UTC',
  });
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    weekdayFormat.format(new Date(WEEKDAY_ANCHOR_MS + i * DAY_MS))
  );

  // `09/2026`, identical in both locales. `Intl` with `month: 'long'` renders
  // the Vietnamese as a lowercase "tháng 9 năm 2026", which is what a header
  // must not be; the spoken name keeps that form on the `aria-label`.
  const monthLabel = monthDisplay(monthStartKey);
  const monthSpoken = new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(monthStart);

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* The month lives in the URL, so the SERVER read is sized by it. The
          selected day stays client state — those rows are already here. */}
      <div className="flex items-center justify-between gap-2">
        <MonthStep
          monthKey={prevMonthKey}
          label={t('sleep.prevMonth')}
          icon={ChevronLeft}
        />

        {/* `base/semibold` outranks the `sm` headings below it: with no hue,
            scale and weight are the whole hierarchy (§14). */}
        <h2
          aria-label={monthSpoken}
          className="min-w-0 flex-1 truncate text-center text-base font-semibold tracking-tight"
        >
          {monthLabel}
        </h2>

        <MonthStep
          monthKey={nextMonthKey}
          label={t('sleep.nextMonth')}
          icon={ChevronRight}
        />
      </div>

      <div className="grid grid-cols-7 gap-2">
        {weekdays.map((weekday, i) => (
          <span
            key={i}
            aria-hidden
            className="text-center text-[11px] font-medium leading-none text-muted-foreground"
          >
            {weekday}
          </span>
        ))}
      </div>

      {/* `group`, not `radiogroup`: these open a sheet, they do not hold a
          selection with a "none" state to gesture back to. */}
      <div
        role="group"
        aria-label={t('sleep.selectDay')}
        className="grid grid-cols-7 gap-2"
      >
        {Array.from({ length: mondayIndex(monthStart) }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}

        {Array.from({ length: dayCount }, (_, i) => {
          const date = addDays(monthStart, i);
          const key = localDateKey(date);
          const night = byDay.get(key) ?? null;
          const isToday = key === todayKey;
          const isFuture = key > todayKey;
          const Icon = night?.mood?.icon ?? null;

          // Everything the mark draws, said in words. This is the legend.
          const parts = [dayFormat.format(date)];
          if (!isFuture) {
            parts.push(
              night?.value == null
                ? t('sleep.calendarMissed')
                : t('units.hoursMinutes', splitMinutes(night.value))
            );
          }
          if (night?.mood) parts.push(night.mood.label);
          if (night?.hasEntry) parts.push(t('day.hasEntry'));

          return (
            <button
              key={key}
              type="button"
              disabled={isFuture}
              aria-current={isToday ? 'date' : undefined}
              aria-label={parts.join(' — ')}
              aria-haspopup="dialog"
              onClick={() => onSelect(key)}
              className={cn(
                'group flex w-full flex-col items-center justify-center gap-1 rounded-2xl px-0.5 py-1.5',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                isFuture && 'cursor-default'
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'text-[11px] leading-none tabular-nums text-muted-foreground',
                  'transition-colors duration-200 motion-reduce:transition-none',
                  !isFuture && 'group-hover:text-foreground'
                )}
              >
                {date.getUTCDate()}
              </span>

              {isFuture ? (
                // A pip, not the hollow ring — the ring means "missed", and a
                // day that has not happened cannot have missed anything.
                <span
                  aria-hidden
                  className="flex aspect-square w-full max-w-9 items-center justify-center"
                >
                  <span className="size-1.5 rounded-full bg-muted-foreground/25" />
                </span>
              ) : (
                <span
                  aria-hidden
                  className={cn(
                    'flex aspect-square w-full max-w-9 items-center justify-center rounded-full',
                    'transition-[box-shadow,transform] duration-200 ease-out motion-reduce:transition-none',
                    night?.value == null
                      ? 'border-2 border-muted-foreground/35 text-muted-foreground'
                      : markClass(night.value, targetMin),
                    // Affordance only: touch has no hover, so nothing may be
                    // knowable from it alone.
                    'group-hover:ring-1 group-hover:ring-foreground/25',
                    'group-active:scale-[0.92] motion-reduce:group-active:scale-100',
                    isToday &&
                      'ring-2 ring-foreground ring-offset-1 ring-offset-card'
                  )}
                >
                  {/* 20px, not 16px: at 16px a Frown's mouth and a Meh's are
                      the same two pixels, and tone is spent on duration. */}
                  {Icon ? <Icon className="size-5 shrink-0" /> : null}
                </span>
              )}

              {/* Written up. Reserved height whether or not the dot is
                  there, so a row with entries is not a pixel taller. */}
              <span
                aria-hidden
                className="flex h-1.5 items-center justify-center"
              >
                {night?.hasEntry ? (
                  <span className="size-1.5 rounded-full bg-foreground/60" />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** One month step. `null` renders a DISABLED button rather than nothing, so
 *  the month label does not slide sideways on the screen most landed on. */
function MonthStep({
  monthKey,
  label,
  icon: Icon,
}: {
  monthKey: string | null;
  label: string;
  icon: LucideIcon;
}) {
  // The same press the day cells get, inside the 150–300ms band (§14).
  const className =
    'flex size-11 shrink-0 items-center justify-center rounded-full transition-[background-color,color,transform] duration-200 ease-out motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card';

  if (monthKey === null) {
    return (
      <button
        type="button"
        disabled
        aria-label={label}
        className={cn(className, 'text-muted-foreground/40')}
      >
        <Icon aria-hidden className="size-5" />
      </button>
    );
  }

  return (
    <Link
      href={{ pathname: '/space/daily', query: { month: monthKey } }}
      scroll={false}
      aria-label={label}
      className={cn(
        className,
        'text-muted-foreground hover:bg-muted hover:text-foreground',
        'active:scale-95 active:bg-muted motion-reduce:active:scale-100'
      )}
    >
      <Icon aria-hidden className="size-5" />
    </Link>
  );
}

/** The fill step a night falls in, clamped at both ends. Each band also names
 *  the tone the glyph inherits, so the two dark steps flip to
 *  `--primary-foreground`; both pairings hold in both themes. */
function markClass(value: number, targetMin: number): string {
  const fraction = value / targetMin;
  const band = Math.min(
    BAND_EDGES.filter((edge) => fraction >= edge).length,
    MONTH_CALENDAR_FILL.length - 1
  );

  return cn(
    MONTH_CALENDAR_FILL[band],
    band < 2 ? 'text-foreground' : 'text-primary-foreground'
  );
}
