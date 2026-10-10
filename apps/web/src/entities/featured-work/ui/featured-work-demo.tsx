'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';
import { useIntersection } from '@byte-of-me/ui/hooks/use-intersection';
import { useMediaQuery } from '@byte-of-me/ui/hooks/use-media-query';
import { Play } from 'lucide-react';

import { cn } from '@/shared/lib/utils';

/** One demo item, translated and resolved by the server row. */
export interface FeaturedWorkDemoItem {
  id: string;
  url: string;
  isVideo: boolean;
  /** The visible figcaption (the stored label); null draws none. */
  caption: string | null;
  /** The image's alt: the label, else the work title. */
  name: string;
  /** The video button's accessible name: "Play/Pause {name}". */
  toggleLabel: string;
}

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
/** A clip plays while at least this much of it is on screen. */
const VISIBLE = { threshold: 0.25 };
/** `#t=0.1` makes the browser decode a first frame to show while the clip is paused. */
const FIRST_FRAME = '#t=0.1';

/** The reserved 16:9 box: it holds its size before the media arrives, so nothing shifts. */
function Frame({ children }: { children?: ReactNode }) {
  return (
    <span className="relative block aspect-video overflow-hidden rounded-md border border-border bg-muted">
      {children}
    </span>
  );
}

function playQuietly(video: HTMLVideoElement) {
  // A refused play() (autoplay policy, an interrupted load) is not an error to show.
  video.play().catch(() => undefined);
}

/**
 * One clip. The whole frame is a button; the clip plays while its row is open and it
 * is on screen, unless the visitor asked for reduced motion or paused it themselves.
 */
function DemoVideo({
  src,
  toggleLabel,
  open,
}: {
  src: string;
  toggleLabel: string;
  open: boolean;
}) {
  const reducedMotion = useMediaQuery(REDUCED_MOTION);
  const { ref: frameRef, entry } = useIntersection<HTMLButtonElement>(VISIBLE);
  const inView = entry?.isIntersecting ?? false;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [userPaused, setUserPaused] = useState(false);

  // A pause the visitor chose lasts until the row closes.
  useEffect(() => {
    if (!open) setUserPaused(false);
  }, [open]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (open && inView && !reducedMotion && !userPaused) playQuietly(video);
    else video.pause();
  }, [open, inView, reducedMotion, userPaused]);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      setUserPaused(false);
      playQuietly(video);
    } else {
      setUserPaused(true);
      video.pause();
    }
  };

  return (
    <button
      ref={frameRef}
      type="button"
      aria-label={toggleLabel}
      aria-pressed={playing}
      onClick={toggle}
      className="block w-full rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Frame>
        <video
          ref={videoRef}
          src={`${src}${FIRST_FRAME}`}
          muted
          loop
          playsInline
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          className="size-full object-contain"
        />
        {!playing && (reducedMotion || userPaused) && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-background/80 text-foreground">
              <Play aria-hidden className="size-5 fill-current" />
            </span>
          </span>
        )}
      </Frame>
    </button>
  );
}

function DemoFigure({
  item,
  open,
  mounted,
}: {
  item: FeaturedWorkDemoItem;
  open: boolean;
  mounted: boolean;
}) {
  let media: ReactNode = <Frame />;
  if (mounted && item.isVideo) {
    media = <DemoVideo src={item.url} toggleLabel={item.toggleLabel} open={open} />;
  } else if (mounted) {
    media = (
      <Frame>
        {/* A plain <img> is the only way a stored SVG or GIF is drawn: never inline, never <object>. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.url}
          alt={item.name}
          loading="lazy"
          decoding="async"
          className="size-full object-contain"
        />
      </Frame>
    );
  }

  return (
    <figure className="min-w-0">
      {media}
      {item.caption && (
        <figcaption className="mt-2 font-mono text-xs text-muted-foreground [overflow-wrap:anywhere]">
          {item.caption}
        </figcaption>
      )}
    </figure>
  );
}

interface FeaturedWorkDemoProps {
  media: FeaturedWorkDemoItem[];
  /** The row's open state. Media mounts at the first true and stays mounted. */
  open: boolean;
  /** Placement in the body grid, e.g. `md:col-span-2`. */
  className?: string;
}

/**
 * The side-by-side demo of a featured work. A collapsed row holds empty 16:9
 * frames and fetches nothing; the first opening mounts the media.
 */
export function FeaturedWorkDemo({ media, open, className }: FeaturedWorkDemoProps) {
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);

  return (
    // `pt-1` leaves room for the button's focus ring inside the region's clip box.
    <div
      className={cn(
        'grid min-w-0 gap-4 pt-1 md:gap-6',
        media.length > 1 ? 'sm:grid-cols-2' : 'max-w-xl',
        className
      )}
    >
      {media.map((item) => (
        <DemoFigure key={item.id} item={item} open={open} mounted={mounted} />
      ))}
    </div>
  );
}
