'use client';

import {
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useIntersection } from '@byte-of-me/ui/hooks/use-intersection';
import { useMediaQuery } from '@byte-of-me/ui/hooks/use-media-query';
import {
  Maximize,
  Minimize,
  Play,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

import { useDemoZoom, ZOOM_MAX, ZOOM_MIN } from './use-demo-zoom';

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

/** The full-screen toolbar's accessible names, shared by every clip in a row. */
export interface FeaturedWorkDemoControlLabels {
  zoomIn: string;
  zoomOut: string;
  zoomReset: string;
  exitFullscreen: string;
}

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
/** A clip plays while at least this much of it is on screen. */
const VISIBLE = { threshold: 0.25 };
/** A clip's file is requested this far before it reaches the screen, so it is ready on arrival. */
const NEAR = { rootMargin: '200px 0px' };
/** `#t=0.1` makes the browser decode a first frame to show while the clip is paused. */
const FIRST_FRAME = '#t=0.1';
/** Full screen, native or the in-page fallback: pinned to the viewport, and touch is the zoom's. */
const STAGE_FULL = 'fixed inset-0 z-50 flex touch-none flex-col bg-background';
const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card';
const CONTROL =
  'flex size-11 items-center justify-center rounded-full bg-background/80 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40';
const LEVEL =
  'flex h-11 min-w-14 items-center justify-center rounded-full bg-background/80 px-3 font-mono text-xs tabular-nums text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/**
 * The media's box. It reserves 16:9 so nothing shifts before the file arrives, then
 * takes the file's own ratio, so a wide clip is not framed by empty bars. Full screen
 * fills the space the toolbar leaves instead.
 */
function Frame({
  children,
  ratio,
  ref,
  fullscreen = false,
}: {
  children?: ReactNode;
  ratio?: number;
  ref?: Ref<HTMLSpanElement>;
  fullscreen?: boolean;
}) {
  return (
    <span
      ref={ref}
      style={ratio && !fullscreen ? { aspectRatio: ratio } : undefined}
      className={cn(
        'relative block overflow-hidden bg-muted',
        fullscreen
          ? 'w-full self-stretch bg-background'
          : 'aspect-video rounded-md border border-border'
      )}
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

function ControlButton({
  label,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={CONTROL}
    >
      {children}
    </button>
  );
}

/**
 * One clip. The frame is a play/pause button; it plays while it is on screen unless
 * the visitor asked for reduced motion or paused it themselves. A second button
 * beside it (never inside: a button may not hold a button) takes the clip full screen,
 * with sound and a zoom toolbar. Where the browser refuses element full screen, the
 * same box is pinned to the viewport instead (iPhone Safari has no element full screen).
 */
function DemoVideo({
  src,
  playLabel,
  fullscreenLabel,
  controlLabels,
  knownRatio,
}: {
  src: string;
  playLabel: string;
  fullscreenLabel: string;
  controlLabels: FeaturedWorkDemoControlLabels;
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
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [failed, setFailed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const zoom = useDemoZoom(videoRef, fullscreen);
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
    setFullscreenReady(true);
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

  // Full screen is the one place the clip has sound; leaving it restores the loop.
  const applyFullscreen = useCallback((on: boolean) => {
    fullscreenAsked.current = on;
    if (videoRef.current) videoRef.current.muted = !on;
    setFullscreen(on);
  }, []);

  useEffect(() => {
    const onChange = () =>
      applyFullscreen(document.fullscreenElement === stageRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [applyFullscreen]);

  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement === stageRef.current) {
      // `fullscreenchange` then calls applyFullscreen(false).
      void document.exitFullscreen().catch(() => undefined);
    } else {
      applyFullscreen(false);
    }
  }, [applyFullscreen]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') exitFullscreen();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [fullscreen, exitFullscreen]);

  const toggle = () => {
    // The click that ends a drag or pinch is a pan, not a tap on the clip.
    if (zoom.takeMoved()) return;
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
    const stage = stageRef.current;
    const video = videoRef.current;
    if (!stage || !video) return;
    zoom.resetZoom();
    applyFullscreen(true);
    // A refusal keeps the in-page overlay that applyFullscreen just drew.
    if (document.fullscreenEnabled && stage.requestFullscreen) {
      stage.requestFullscreen().catch(() => undefined);
    }
    playQuietly(video);
  };

  // A clip that will not load keeps its frame and is no longer offered as playable.
  if (failed) return <Frame />;

  const { zoom: level, x, y } = zoom.view;
  const transform =
    fullscreen && level > ZOOM_MIN
      ? `translate(${x}px, ${y}px) scale(${level})`
      : undefined;

  return (
    <div ref={nearRef} className="relative">
      <div ref={stageRef} className={cn(fullscreen ? STAGE_FULL : 'relative')}>
        <button
          ref={frameRef}
          type="button"
          aria-label={playLabel}
          aria-pressed={playing}
          onClick={toggle}
          {...zoom.pointerHandlers}
          className={cn(
            fullscreen ? 'flex min-h-0 flex-1' : 'block w-full rounded-md',
            FOCUS
          )}
        >
          <Frame ref={coverRef} ratio={ratio} fullscreen={fullscreen}>
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
              style={transform ? { transform } : undefined}
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
        {fullscreen && (
          <div className="flex shrink-0 items-center justify-between gap-2 p-3">
            <div className="flex items-center gap-2">
              <ControlButton
                label={controlLabels.zoomOut}
                disabled={level <= ZOOM_MIN}
                onClick={zoom.zoomOut}
              >
                <ZoomOut aria-hidden className="size-5" />
              </ControlButton>
              <button
                type="button"
                onClick={zoom.resetZoom}
                className={LEVEL}
              >
                {Math.round(level * 100)}%
                <span className="sr-only">{controlLabels.zoomReset}</span>
              </button>
              <ControlButton
                label={controlLabels.zoomIn}
                disabled={level >= ZOOM_MAX}
                onClick={zoom.zoomIn}
              >
                <ZoomIn aria-hidden className="size-5" />
              </ControlButton>
            </div>
            <ControlButton
              label={controlLabels.exitFullscreen}
              onClick={exitFullscreen}
            >
              <Minimize aria-hidden className="size-5" />
            </ControlButton>
          </div>
        )}
        {fullscreenReady && !fullscreen && (
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

function DemoFigure({
  item,
  controlLabels,
}: {
  item: FeaturedWorkDemoItem;
  controlLabels: FeaturedWorkDemoControlLabels;
}) {
  const media: ReactNode = item.isVideo ? (
    <DemoVideo
      src={item.url}
      playLabel={item.playLabel}
      fullscreenLabel={item.fullscreenLabel}
      controlLabels={controlLabels}
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
  controlLabels: FeaturedWorkDemoControlLabels;
  /** Placement around the demo, e.g. its bleed to the screen edge on a phone. */
  className?: string;
}

/**
 * The demo of a featured work, always on show: a clip plays while it is on screen, an
 * image loads lazily, and each sits in a reserved 16:9 frame. On a phone the pair is a
 * swipeable strip, each figure most of the width so the next one shows at its edge;
 * from md the pair sits side by side.
 */
export function FeaturedWorkDemo({
  media,
  controlLabels,
  className,
}: FeaturedWorkDemoProps) {
  return (
    <div
      className={cn(
        'flex min-w-0 snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto [scrollbar-width:none] [&>figure]:shrink-0 [&>figure]:snap-start',
        // A pair is a strip of large clips, the next one peeking in; one clip takes the card.
        media.length > 1 ? '[&>figure]:w-[82%]' : '[&>figure]:w-full',
        'md:grid md:gap-4 md:overflow-visible md:[&>figure]:w-auto',
        media.length > 1 && 'md:grid-cols-2',
        className
      )}
    >
      {media.map((item) => (
        <DemoFigure key={item.id} item={item} controlLabels={controlLabels} />
      ))}
    </div>
  );
}
