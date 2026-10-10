'use client';

import { type ReactNode, type Ref, useEffect, useRef, useState } from 'react';
import { useIntersection } from '@byte-of-me/ui/hooks/use-intersection';
import { useMediaQuery } from '@byte-of-me/ui/hooks/use-media-query';
import { Maximize, Play } from 'lucide-react';

import { cn } from '@/shared/lib/utils';
import { MediaCover, useMediaDrawn } from '@/shared/ui/media-cover';

/** One demo item, translated and resolved by the server row. */
export interface FeaturedWorkDemoItem {
  id: string;
  url: string;
  isVideo: boolean;
  /** Width over height of the stored file, known before it draws; null until it loads. */
  knownRatio: number | null;
  /** The visible figcaption (the stored label); null draws none. */
  caption: string | null;
  /** The image's alt: the label, else the work title. */
  name: string;
  /** The video button's accessible name: "Play {name}"; `aria-pressed` says it plays. */
  playLabel: string;
  /** The full-screen button's accessible name: "Full screen {name}". */
  fullscreenLabel: string;
}

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
/** A clip plays while at least this much of it is on screen. */
const VISIBLE = { threshold: 0.25 };
/** A clip's file is requested this far before it reaches the screen, so it is ready on arrival. */
const NEAR = { rootMargin: '200px 0px' };
/** `#t=0.1` makes the browser decode a first frame to show while the clip is paused. */
const FIRST_FRAME = '#t=0.1';

/**
 * The media's box. It reserves 16:9 so nothing shifts before the file arrives, then
 * takes the file's own ratio, so a wide clip is not framed by empty bars.
 */
function Frame({
  children,
  ratio,
  ref,
}: {
  children?: ReactNode;
  ratio?: number;
  ref?: Ref<HTMLSpanElement>;
}) {
  return (
    <span
      ref={ref}
      style={ratio ? { aspectRatio: ratio } : undefined}
      className="relative block aspect-video overflow-hidden rounded-md border border-border bg-muted"
    >
      {children}
    </span>
  );
}

/** Width over height of a loaded file, or undefined while its size is unknown. */
function ratioOf(width: number, height: number): number | undefined {
  return width > 0 && height > 0 ? width / height : undefined;
}

function playQuietly(video: HTMLVideoElement) {
  // A refused play() (autoplay policy, an interrupted load) is not an error to show.
  video.play().catch(() => undefined);
}

/** Safari on iPhone has no element Fullscreen API: only the video's own presenter. */
type FullscreenVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitSupportsFullscreen?: boolean;
};

function canFullscreen(video: FullscreenVideo): boolean {
  return (
    document.fullscreenEnabled === true ||
    (typeof video.webkitEnterFullscreen === 'function' &&
      video.webkitSupportsFullscreen !== false)
  );
}

/**
 * One clip. The frame is a play/pause button; it plays while it is on screen unless
 * the visitor asked for reduced motion or paused it themselves. A second button
 * beside it (never inside: a button may not hold a button) opens it full screen,
 * where the native controls and the sound come on.
 */
function DemoVideo({
  src,
  playLabel,
  fullscreenLabel,
  knownRatio,
}: {
  src: string;
  playLabel: string;
  fullscreenLabel: string;
  knownRatio: number | null;
}) {
  const reducedMotion = useMediaQuery(REDUCED_MOTION);
  const { ref: frameRef, entry } = useIntersection<HTMLButtonElement>(VISIBLE);
  const inView = entry?.isIntersecting ?? false;
  // Nothing is downloaded until the clip nears the screen, and then it is kept:
  // scrolling past does not hand the bytes back.
  const { ref: nearRef, entry: nearEntry } =
    useIntersection<HTMLDivElement>(NEAR);
  const [requested, setRequested] = useState(false);
  const { ref: coverRef, drawn } = useMediaDrawn<HTMLSpanElement>();
  const videoRef = useRef<FullscreenVideo>(null);
  const [playing, setPlaying] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [failed, setFailed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  // The stored size gives the box its shape before the clip is fetched; the file's own
  // metadata only corrects it if the stored size was wrong or missing.
  const [ratio, setRatio] = useState<number | undefined>(
    knownRatio ?? undefined
  );
  // Set the moment full screen is asked for: the page leaves the viewport before the
  // `fullscreenchange` event arrives, and the visibility effect would pause the clip in between.
  const fullscreenAsked = useRef(false);
  // Known only in the browser, so the button appears after mount.
  const [fullscreenReady, setFullscreenReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setFullscreenReady(canFullscreen(video));
    // The server-rendered video may have its size before React listens for the event.
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      setRatio(ratioOf(video.videoWidth, video.videoHeight));
    }
  }, []);

  useEffect(() => {
    if (nearEntry?.isIntersecting) setRequested(true);
  }, [nearEntry]);

  // `requested` is in the list so a clip that became visible before its src was set
  // plays once the src exists; an earlier play() has nothing to play and is refused.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || failed || fullscreen || fullscreenAsked.current) return;
    if (inView && !reducedMotion && !userPaused) playQuietly(video);
    else video.pause();
  }, [inView, reducedMotion, userPaused, failed, fullscreen, requested]);

  // Full screen is the one place the clip has sound and controls; leaving it restores the loop.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const sync = (isFullscreen: boolean) => {
      fullscreenAsked.current = isFullscreen;
      video.controls = isFullscreen;
      video.muted = !isFullscreen;
      setFullscreen(isFullscreen);
    };
    const onDocument = () => sync(document.fullscreenElement === video);
    document.addEventListener('fullscreenchange', onDocument);
    const onBegin = () => sync(true);
    const onEnd = () => sync(false);
    video.addEventListener('webkitbeginfullscreen', onBegin);
    video.addEventListener('webkitendfullscreen', onEnd);
    return () => {
      document.removeEventListener('fullscreenchange', onDocument);
      video.removeEventListener('webkitbeginfullscreen', onBegin);
      video.removeEventListener('webkitendfullscreen', onEnd);
    };
  }, []);

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

  const enterFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;
    fullscreenAsked.current = true;
    if (document.fullscreenEnabled && video.requestFullscreen) {
      // A refused request leaves the page as it was, so the loop goes back to the viewport's rule.
      video.requestFullscreen().catch(() => {
        fullscreenAsked.current = false;
      });
    } else {
      video.webkitEnterFullscreen?.();
    }
    playQuietly(video);
  };

  // A clip that will not load keeps its frame and is no longer offered as playable.
  if (failed) return <Frame />;

  return (
    <div ref={nearRef} className="relative">
      <button
        ref={frameRef}
        type="button"
        aria-label={playLabel}
        aria-pressed={playing}
        onClick={toggle}
        className="block w-full rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
      >
        <Frame ref={coverRef} ratio={ratio}>
          <video
            ref={videoRef}
            src={requested ? `${src}${FIRST_FRAME}` : undefined}
            muted
            loop
            playsInline
            preload={requested ? 'metadata' : 'none'}
            onLoadedMetadata={(event) =>
              setRatio(
                ratioOf(
                  event.currentTarget.videoWidth,
                  event.currentTarget.videoHeight
                )
              )
            }
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onError={() => {
              setPlaying(false);
              setFailed(true);
            }}
            className="size-full object-contain"
          />
          <MediaCover drawn={drawn} />
          {/* Shown whenever the clip is not moving, so a refused play() still reads as tappable. */}
          {!playing && (
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-background/80 text-foreground">
                <Play aria-hidden className="size-5 fill-current" />
              </span>
            </span>
          )}
        </Frame>
      </button>
      {fullscreenReady && (
        <button
          type="button"
          aria-label={fullscreenLabel}
          onClick={enterFullscreen}
          className="absolute bottom-1 right-1 flex size-11 items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-background/80 text-foreground">
            <Maximize aria-hidden className="size-4" />
          </span>
        </button>
      )}
    </div>
  );
}

function DemoImage({
  src,
  alt,
  knownRatio,
}: {
  src: string;
  alt: string;
  knownRatio: number | null;
}) {
  const [ratio, setRatio] = useState<number | undefined>(
    knownRatio ?? undefined
  );
  const { ref: coverRef, drawn } = useMediaDrawn<HTMLSpanElement>();
  const imageRef = useRef<HTMLImageElement>(null);

  // A cached image can finish before hydration, and its `load` event is gone.
  useEffect(() => {
    const image = imageRef.current;
    if (image?.complete)
      setRatio(ratioOf(image.naturalWidth, image.naturalHeight));
  }, []);

  return (
    <Frame ref={coverRef} ratio={ratio}>
      {/* A plain <img> is the only way a stored SVG or GIF is drawn: never inline, never <object>. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={(event) =>
          setRatio(
            ratioOf(
              event.currentTarget.naturalWidth,
              event.currentTarget.naturalHeight
            )
          )
        }
        className="size-full object-contain"
      />
      <MediaCover drawn={drawn} />
    </Frame>
  );
}

function DemoFigure({ item }: { item: FeaturedWorkDemoItem }) {
  const media: ReactNode = item.isVideo ? (
    <DemoVideo
      src={item.url}
      playLabel={item.playLabel}
      fullscreenLabel={item.fullscreenLabel}
      knownRatio={item.knownRatio}
    />
  ) : (
    <DemoImage src={item.url} alt={item.name} knownRatio={item.knownRatio} />
  );

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
  /** Placement in the row grid, e.g. `md:col-start-2`. */
  className?: string;
}

/**
 * The side-by-side demo of a featured work, always on show: a clip plays while it is
 * on screen, an image loads lazily, and each sits in a reserved 16:9 frame.
 */
export function FeaturedWorkDemo({ media, className }: FeaturedWorkDemoProps) {
  return (
    <div
      className={cn(
        'grid min-w-0 gap-4 md:gap-6',
        media.length > 1 ? 'sm:grid-cols-2' : 'max-w-xl',
        className
      )}
    >
      {media.map((item) => (
        <DemoFigure key={item.id} item={item} />
      ))}
    </div>
  );
}
