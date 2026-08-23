'use client';

import { useTranslations } from 'next-intl';

import { BackToGymLink } from './back-to-gym-link';
import { WorkoutLiveLogger } from './workout-live-logger';
import { WorkoutSessionEditor } from './workout-session-editor';

import { useWorkoutSession } from '@/features/gym/workout-session/model/use-workout-session';

/**
 * One session, in whichever of its two modes it is in.
 *
 * **Both modes share one route, and the branch is on the DATA — `endedAt ===
 * null` — not on the URL.** Three reasons, in order of how much they cost to
 * get wrong:
 *
 *  - A `/live` sibling route would have to know which mode a session is in
 *    before it could route to it, which means reading the session on the server
 *    *and* on the client, or redirecting after the read. Both put a redirect in
 *    the path a lifter takes between sets, and a redirect loop is one
 *    mis-ordered condition away.
 *  - Finishing happens IN PLACE. The finish write flips `endedAt`, the query
 *    invalidates, and this component re-renders into the review — no
 *    navigation, no second fetch, no router queue to strand a pending server
 *    action behind (which this repo has been bitten by before, and which would
 *    hang the UI with no failed request to point at).
 *  - One URL is one thing to bookmark, share and come back to.
 *    `/space/gym/[sessionId]` means "this workout", and what it shows depends on
 *    whether the workout is over — which is exactly what the reader means when
 *    they open it.
 *
 * The loading, error and empty states live here rather than in either mode,
 * because they are properties of the READ, not of the workout: both modes need
 * the identical three, and duplicating them is how one of them ends up
 * throwing on a missing session. `getWorkoutSession` answers
 * `{ success: true, data: null }` for both "no such session" and "not yours",
 * deliberately indistinguishable, so a miss renders a line and a way back
 * rather than escaping to the root `error.tsx` and replacing the page.
 */
export function WorkoutSessionView({
  sessionId,
  timeZone,
}: {
  sessionId: string;
  /** The request's zone, resolved on the server, so a clock time renders
   *  identically either side of hydration. The review view prints several; the
   *  live logger prints none and takes none. */
  timeZone: string;
}) {
  const t = useTranslations('dashboard.gym.workout');
  const tError = useTranslations('dashboard.gym.errors');

  const query = useWorkoutSession(sessionId);

  const result = query.data;
  const session = result?.success ? result.data : null;
  const loadError = query.isError
    ? tError('load')
    : result && !result.success
    ? result.errorMsg
    : null;

  if (query.isPending) {
    return (
      <Frame>
        <BackToGymLink />
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {t('loading')}
        </p>
      </Frame>
    );
  }

  if (loadError) {
    return (
      <Frame>
        <BackToGymLink />
        {/* `destructive-text`, not `destructive`: §14 records that the fill
            token measures 3.76:1 as text. */}
        <p className="text-sm text-destructive-text">{loadError}</p>
      </Frame>
    );
  }

  if (!session) {
    return (
      <Frame>
        <BackToGymLink />
        <p className="text-sm text-muted-foreground">{t('notFound')}</p>
      </Frame>
    );
  }

  return session.endedAt === null ? (
    <WorkoutLiveLogger session={session} />
  ) : (
    <WorkoutSessionEditor session={session} timeZone={timeZone} />
  );
}

/** The read's frame, shared by its loading, error and empty states so none of
 *  them changes the page's width, padding or rhythm. */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-x-clip">
      <div className="pb-safe min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
