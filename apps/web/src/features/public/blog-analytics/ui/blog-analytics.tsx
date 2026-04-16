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
      const now = Date.now();
      const sessionSeconds = Math.floor((now - startTime.current) / 1000);
      const totalToSync = accumulatedTime.current + sessionSeconds;

      if (totalToSync > 0) {
        // Sync total accumulated active time to the specific log row
        await updateBlogReadingTime(logId, totalToSync);

        // Reset buffers after successful sync
        accumulatedTime.current = 0;
        startTime.current = Date.now();
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
        // Pause: Save active time to buffer when tab is hidden
        accumulatedTime.current += Math.floor(
          (Date.now() - startTime.current) / 1000
        );
      } else {
        // Resume: Set new start point when user returns to tab
        startTime.current = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Attempt to flush remaining time when user closes the tab/navigates away
    window.addEventListener('beforeunload', syncTime);

    return () => {
      clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', syncTime);
    };
  }, [logId]);

  return null;
}
