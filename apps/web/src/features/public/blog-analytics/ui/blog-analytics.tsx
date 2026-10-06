'use client';

import { useEffect, useRef, useState } from 'react';

import {
  trackBlogView,
  updateBlogReadingTime,
} from '@/features/public/blog-analytics/lib';

export function BlogAnalytics({ blogId }: { blogId: string }) {
  const [logId, setLogId] = useState<string | null>(null);
  const startTime = useRef<number>(Date.now());
  const accumulatedTime = useRef<number>(0);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const result = await trackBlogView(blogId);

      if (result?.success && result?.data) {
        setLogId(result.data);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [blogId]);

  useEffect(() => {
    if (!logId) return;

    const syncTime = async () => {
      // Only a visible stretch counts; time spent hidden is never reading time.
      const sessionSeconds = document.hidden
        ? 0
        : Math.floor((Date.now() - startTime.current) / 1000);
      const totalToSync = accumulatedTime.current + sessionSeconds;

      if (totalToSync < 1) return;

      // Taken before the await: hiding a tab fires `visibilitychange` and then
      // `pagehide`, and both would otherwise send the same seconds.
      accumulatedTime.current = 0;
      startTime.current = Date.now();

      try {
        // Sync total accumulated active time to the specific log row
        await updateBlogReadingTime(logId, totalToSync);
      } catch {
        // Network failure: keep the seconds for the next sync.
        accumulatedTime.current += totalToSync;
      }
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
  }, [logId]);

  return null;
}
