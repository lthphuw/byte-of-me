'use client';

import { useState } from 'react';
import { ChevronRight, CircleDot } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import type { WorkoutSessionRow } from '@/entities/workout';
import {
  DEFAULT_HISTORY_DAYS,
  HISTORY_WINDOWS,
} from '@/features/health/workout-log/lib/history-range';
import { useWorkoutHistory } from '@/features/health/workout-log/model/use-workout-history';
import { Link } from '@/shared/i18n/navigation';
import { splitMinutes } from '@/shared/lib/health/duration';
import { formatClock, formatDayKey } from '@/shared/lib/local-date-format';
import { cn } from '@/shared/lib/utils';

const MS_PER_MINUTE = 60_000;

/**
 * What has been trained, newest first.
 *
 * The window is a three-way choice rather than a fixed number, because ninety
 * days answers "what have I been doing" and a year answers "when did I last
 * squat" — two different questions with no single right span. Each window is
 * its own `workoutKeys.range(from, to)`, derived from the server-resolved
 * `todayKey` so the default one hydrates from the page's prefetch rather than
 * refetching.
 *
 * A row is a LINK, not a card with a button in it: the whole row goes to the
 * session, which is a 64px target rather than a 44px one inside it, and it
 * gets keyboard and middle-click behaviour for free.
 *
 * An unfinished session is marked twice over — the words "in progress" and a
 * dot icon — because a fill or a tint would be the only cue on a palette with
 * no hue, and §14 rules that out.
 */
export function WorkoutHistory({
  todayKey,
  timeZone,
}: {
  /** The owner's today, resolved once on the server from the request zone.
   *  Recomputing it in the browser would build a different query key either
   *  side of local midnight. */
  todayKey: string;
  timeZone: string;
}) {
  const t = useTranslations('dashboard.health.gym');
  const tError = useTranslations('dashboard.health.errors');
  const [days, setDays] = useState<number>(DEFAULT_HISTORY_DAYS);

  const query = useWorkoutHistory(todayKey, days);

  const result = query.data;
  const sessions = result?.success ? result.data : [];
  const loadError = query.isError
    ? tError('load')
    : result && !result.success
    ? result.errorMsg
    : null;

  // Literal keys, one per window: next-intl's generated declarations only
  // type-check literals, so a computed `t(`range${days}`)` would type-check
  // against nothing and ship a key that may not exist.
  const windowLabels: Record<number, string> = {
    30: t('range30'),
    90: t('range90'),
    365: t('range365'),
  };

  return (
    <section aria-label={t('historyAriaLabel')} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">{t('history')}</h2>
        <p className="text-xs tabular-nums text-muted-foreground">
          {t('sessionCount', { n: sessions.length })}
        </p>
      </div>

      <div
        role="group"
        aria-label={t('rangeAriaLabel')}
        className="flex flex-wrap gap-2"
      >
        {HISTORY_WINDOWS.map((window) => {
          const isActive = window === days;

          return (
            <button
              key={window}
              type="button"
              aria-pressed={isActive}
              onClick={() => setDays(window)}
              className={cn(
                'h-11 rounded-2xl border px-4 text-sm',
                'transition-colors duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                isActive
                  ? 'border-primary bg-primary font-semibold text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {windowLabels[window]}
            </button>
          );
        })}
      </div>

      {loadError ? (
        <p className="text-sm text-destructive-text">{loadError}</p>
      ) : null}

      {query.isPending ? (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {t('loading')}
        </p>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('noHistory')}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {sessions.map((session) => (
            <li key={session.id}>
              <HistoryRow session={session} timeZone={timeZone} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function HistoryRow({
  session,
  timeZone,
}: {
  session: WorkoutSessionRow;
  timeZone: string;
}) {
  const t = useTranslations('dashboard.health.gym');
  const tUnits = useTranslations('dashboard.health.units');
  const locale = useLocale();

  const isOpen = session.endedAt === null;

  // Duration from the two instants, never from `localDate`: a session that
  // runs past local midnight keeps the day it started on, so the day key says
  // nothing about how long it lasted.
  const durationMin = session.endedAt
    ? Math.max(
        0,
        Math.round(
          (new Date(session.endedAt).getTime() -
            new Date(session.startedAt).getTime()) /
            MS_PER_MINUTE
        )
      )
    : null;

  return (
    <Link
      href={`/space/health/gym/${session.id}`}
      className={cn(
        'flex min-h-16 items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm',
        'transition-colors duration-200 hover:border-primary/40 hover:bg-muted',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
      )}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <p className="break-safe text-sm font-medium">{session.title}</p>

        <p className="break-safe text-xs tabular-nums text-muted-foreground">
          {formatDayKey(session.localDate, locale)}
          <span aria-hidden> · </span>
          {formatClock(session.startedAt, locale, timeZone)}
        </p>

        <p className="break-safe flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tabular-nums text-muted-foreground">
          <span>{t('exerciseCount', { n: session.exerciseCount })}</span>

          {durationMin !== null ? (
            <span>{tUnits('hoursMinutes', splitMinutes(durationMin))}</span>
          ) : null}

          {session.sessionRpe !== null ? (
            <span>
              {t('sessionRpe')} {session.sessionRpe}
            </span>
          ) : null}

          {isOpen ? (
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <CircleDot aria-hidden className="size-3.5 shrink-0" />
              {t('open')}
            </span>
          ) : null}
        </p>
      </div>

      <ChevronRight
        aria-hidden
        className="size-4 shrink-0 text-muted-foreground"
      />
    </Link>
  );
}
