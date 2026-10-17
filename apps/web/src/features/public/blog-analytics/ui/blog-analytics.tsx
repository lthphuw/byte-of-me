'use client';

import { useEffect, useRef, useState } from 'react';
import { useServerMutation } from '@byte-of-me/query';
import { useTranslations } from 'next-intl';

import {
  trackBlogView,
  updateBlogReadingTime,
} from '@/features/public/blog-analytics/lib';

export function BlogAnalytics({ blogId }: { blogId: string }) {
  const t = useTranslations('blogDetails');
  const [logId, setLogId] = useState<string | null>(null);
  const startTime = useRef<number>(Date.now());
  const accumulatedTime = useRef<number>(0);

  // Fire-and-forget: nothing here renders a result, so `mutateAsync` is used
  // for its per-call settlement. The `.catch` only stops an unhandled
  // rejection. No `errorMessage`: a refused view or reading-time beat is only
  // logged, and a reader is never told that analytics failed.
  const recordView = useServerMutation<string, string>({
    mutationFn: (id) => trackBlogView(id),
  });
  const recordReadingTime = useServerMutation<
    { logId: string; seconds: number },
    null
  >({
    mutationFn: ({ logId: id, seconds }) => updateBlogReadingTime(id, seconds),
  });
  const { mutateAsync: recordViewAsync } = recordView;
  const { mutateAsync: recordReadingTimeAsync } = recordReadingTime;

  useEffect(() => {
    const timer = setTimeout(() => {
      recordViewAsync(blogId)
        .then((id) => setLogId(id))
        .catch(() => {});
    }, 3000);

    return () => clearTimeout(timer);
  }, [blogId, recordViewAsync]);

  useEffect(() => {
    if (!logId) return;

    const syncTime = () => {
      // Only a visible stretch counts; time spent hidden is never reading time.
      const sessionSeconds = document.hidden
        ? 0
        : Math.floor((Date.now() - startTime.current) / 1000);
      const totalToSync = accumulatedTime.current + sessionSeconds;

      if (totalToSync < 1) return;

      // Taken before the send: hiding a tab fires `visibilitychange` and then
      // `pagehide`, and both would otherwise send the same seconds.
      accumulatedTime.current = 0;
      startTime.current = Date.now();

      // Sync total accumulated active time to the specific log row. On a
      // refusal or a dropped request, keep the seconds for the next sync.
      recordReadingTimeAsync({ logId, seconds: totalToSync }).catch(() => {
        accumulatedTime.current += totalToSync;
      });
    };

    // Heartbeat: Sync every 15s to prevent data loss if the browser crashes
    const heartbeat = setInterval(() => {
      if (!document.hidden) {
        syncTime();
      }
    }, 15000);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Pause: bank the visible stretch that just ended, then send it. This
        // is the last event a backgrounded mobile tab reliably delivers —
        // `pagehide` may never fire for it.
        accumulatedTime.current += Math.floor(
          (Date.now() - startTime.current) / 1000
        );
        startTime.current = Date.now();
        syncTime();
      } else {
        // Resume: Set new start point when user returns to tab
        startTime.current = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Flush when the page is left. `pagehide`, not `beforeunload`: a
    // `beforeunload` listener keeps the page out of the back/forward cache.
    window.addEventListener('pagehide', syncTime);

    return () => {
      clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', syncTime);
    };
  }, [logId, recordReadingTimeAsync]);

  return null;
}
