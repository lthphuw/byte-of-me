'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';

import { cn } from '@/shared/lib/utils';

/**
 * Whether the first image or video under `ref` has drawn. It checks at mount as well
 * as listening: a file that finished before hydration never fires its event again.
 * A failed file counts as settled, so its cover lifts and does not pulse forever.
 */
export function useMediaDrawn<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const media = ref.current?.querySelector<
      HTMLImageElement | HTMLVideoElement
    >('img, video');
    if (!media) return;

    const settle = () => setDrawn(true);
    const isImage = media instanceof HTMLImageElement;
    const drawnAlready = isImage
      ? media.complete
      : media.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
    if (drawnAlready) settle();

    const events = isImage ? ['load', 'error'] : ['loadeddata', 'error'];
    for (const name of events) media.addEventListener(name, settle);
    return () => {
      for (const name of events) media.removeEventListener(name, settle);
    };
  }, []);

  return { ref, drawn };
}

/**
 * A box around one image or video: the cover sits over the media until it has drawn.
 * The media is the child, so a server component can pass its `next/image` in.
 */
export function MediaFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { ref, drawn } = useMediaDrawn<HTMLDivElement>();
  return (
    <div ref={ref} className={cn('relative overflow-hidden', className)}>
      {children}
      <MediaCover drawn={drawn} />
    </div>
  );
}

/**
 * The cover over a media frame until its file has drawn, then it fades out in place:
 * the cover and the media share one box, so nothing moves. A span, because a clip can
 * sit inside a button and a div may not. The pulse is an animation of opacity, and an
 * animation overrides `opacity-0`, so it has to stop before the cover can clear.
 */
export function MediaCover({
  drawn,
  className,
}: {
  drawn: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'absolute inset-0 bg-muted transition-opacity duration-200 ease-enter',
        drawn ? 'opacity-0' : 'motion-safe:animate-pulse',
        className
      )}
    />
  );
}
