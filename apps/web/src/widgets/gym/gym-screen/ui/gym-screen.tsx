import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import {
  BarChart3,
  ClipboardList,
  Dumbbell,
  type LucideIcon,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { exerciseKeys, getExercises, getRoutines } from '@/entities/exercise';
import {
  getOpenWorkoutSession,
  getWorkoutSessions,
  workoutKeys,
} from '@/entities/workout';
import { DEFAULT_EXERCISE_FILTERS } from '@/features/gym/exercise-catalog';
import { DEFAULT_ROUTINE_INCLUDE_ARCHIVED } from '@/features/gym/routine-editor';
import {
  DEFAULT_HISTORY_DAYS,
  historyRange,
  WorkoutHistory,
  WorkoutStartPanel,
} from '@/features/gym/workout-log';
import { Link } from '@/shared/i18n/navigation';
import { localDateKey, toLocalDate } from '@/shared/lib/health/local-date';
import { getRequestTimeZone } from '@/shared/lib/health/request-time-zone';
import { getQueryClient } from '@/shared/lib/query/get-query-client';
import { cn } from '@/shared/lib/utils';

/**
 * The gym screen: start or resume a workout, then read what has been trained.
 *
 * **`todayKey` and `timeZone` are resolved HERE and handed down.** Both are
 * request facts, and both would be answered differently by a browser: the day
 * flips either side of local midnight, and a clock time formatted in one zone
 * on the server and another in the browser is a hydration mismatch. Deriving
 * the history's `from`/`to` from a single server-resolved day is also what
 * makes the prefetched key and the client key the same key.
 *
 * Four prefetches, and each has a reason to be here rather than to wait for a
 * client fetch:
 *
 * - the **open session**, because it decides which of the start panel's two
 *   shapes renders, and a flash of "Start a workout" before "Resume" appears
 *   would offer an action the server is going to refuse;
 * - the **history window**, because it is the page's content;
 * - the **routines**, because they are the tiles the start panel is made of;
 * - the **exercise catalogue**, because the picker inside the session editor
 *   reads it, and the first navigation there should not wait on a round trip
 *   inside a modal.
 *
 * Every key comes from its factory with the arguments the client hooks pass,
 * taken from the shared defaults rather than spelled out twice. A key that
 * drifts does not raise — it falls through to a client fetch and leaves the
 * screen on skeletons (AGENTS §6).
 *
 * Nothing throws. The actions return `ApiResponse` envelopes and
 * `prefetchQuery` swallows what does raise, so a failed read arrives as
 * `{ success: false }` and is rendered in place — a throw inside an RSC
 * escapes to the root `error.tsx` and replaces the page and its navigation.
 */
export async function GymScreen() {
  const t = await getTranslations('dashboard.health.gym');
  const timeZone = await getRequestTimeZone();

  const todayKey = localDateKey(toLocalDate(new Date(), timeZone));
  const { from, to } = historyRange(todayKey, DEFAULT_HISTORY_DAYS);

  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: workoutKeys.open(),
      queryFn: () => getOpenWorkoutSession(),
    }),
    queryClient.prefetchQuery({
      queryKey: workoutKeys.range(from, to),
      queryFn: () => getWorkoutSessions({ from, to }),
    }),
    queryClient.prefetchQuery({
      queryKey: exerciseKeys.routineList(DEFAULT_ROUTINE_INCLUDE_ARCHIVED),
      queryFn: () =>
        getRoutines({ includeArchived: DEFAULT_ROUTINE_INCLUDE_ARCHIVED }),
    }),
    queryClient.prefetchQuery({
      queryKey: exerciseKeys.list(
        DEFAULT_EXERCISE_FILTERS.search,
        DEFAULT_EXERCISE_FILTERS.muscle,
        DEFAULT_EXERCISE_FILTERS.includeArchived
      ),
      queryFn: () =>
        getExercises({
          includeArchived: DEFAULT_EXERCISE_FILTERS.includeArchived,
        }),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="flex min-h-0 flex-1 flex-col overflow-x-clip">
        <div className="pb-safe min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-8">
            <WorkoutStartPanel timeZone={timeZone} />

            {/* The three surfaces this one leads to. Links rather than tabs:
                routines, the catalogue and the statistics are things the gym
                screen USES, not sibling views of the same data, and the module
                already has one navigation system in the segmented control
                above. */}
            <nav className="grid grid-cols-2 gap-3">
              <SubLink
                href="/space/gym/routines"
                label={t('routinesLink')}
                icon={ClipboardList}
              />
              <SubLink
                href="/space/gym/exercises"
                label={t('catalogLink')}
                icon={Dumbbell}
              />
              {/* Full width rather than a third column: three tiles across a
                  375px phone leaves each label under 110px, and the Vietnamese
                  strings are what overflow an action bar first (§14). */}
              <SubLink
                href="/space/gym/stats"
                label={t('statsLink')}
                icon={BarChart3}
                className="col-span-2"
              />
            </nav>

            <WorkoutHistory todayKey={todayKey} timeZone={timeZone} />
          </div>
        </div>
      </div>
    </HydrationBoundary>
  );
}

function SubLink({
  href,
  label,
  icon: Icon,
  className,
}: {
  href:
    | '/space/gym/routines'
    | '/space/gym/stats'
    | '/space/gym/exercises';
  label: string;
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex min-h-14 items-center justify-center gap-2 rounded-2xl border bg-card px-4 text-sm font-medium shadow-sm',
        'transition-colors duration-200 hover:border-primary/40 hover:bg-muted',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className
      )}
    >
      <Icon aria-hidden className="size-4 shrink-0" />
      {label}
    </Link>
  );
}
