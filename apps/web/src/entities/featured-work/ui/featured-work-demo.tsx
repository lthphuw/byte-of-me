'use client';

import {
  type MouseEvent,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useIntersection } from '@byte-of-me/ui/hooks/use-intersection';
import { useMediaQuery } from '@byte-of-me/ui/hooks/use-media-query';
import { Maximize, Minimize, Play, ZoomIn, ZoomOut } from 'lucide-react';

import { useDemoZoom, ZOOM_MAX, ZOOM_MIN } from './use-demo-zoom';

import { cn } from '@/shared/lib/utils';
import { MediaCarousel } from '@/shared/ui/media-carousel';
import { MediaCover, useMediaDrawn } from '@/shared/ui/media-cover';

/** One demo item, translated and resolved by the server row. */
export interface FeaturedWorkDemoItem {
  id: string;
  url: string;
  isVideo: boolean;
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
/** Two taps on a clip within this long are a double tap, which takes it full screen. */
const DOUBLE_TAP_MS = 300;
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
 * The media's box. Every inline box is 16:9, whatever the file's own ratio, so the two
 * clips of a pair are the same size; the file is fitted inside it. Full screen fills the
 * space the toolbar leaves instead.
 */
function Frame({
  children,
  ref,
  fullscreen = false,
}: {
  children?: ReactNode;
  ref?: Ref<HTMLSpanElement>;
  fullscreen?: boolean;
}) {
  return (
    <span
      ref={ref}
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
 * with sound and a zoom toolbar; a double tap on the frame does the same. With a mouse
 * that button shows only while the clip is hovered or focused; on a touch screen, which has
 * no hover, it is always there. Where the browser refuses element full screen, the
 * same box is pinned to the viewport instead (iPhone Safari has no element full screen).
 */
function DemoVideo({
  src,
  playLabel,
  fullscreenLabel,
  controlLabels,
}: {
  src: string;
  playLabel: string;
  fullscreenLabel: string;
  controlLabels: FeaturedWorkDemoControlLabels;
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
  // Set the moment full screen is asked for: the page leaves the viewport before the
  // `fullscreenchange` event arrives, and the visibility effect would pause the clip in between.
  const fullscreenAsked = useRef(false);
  const lastTap = useRef(0);
  // Known only in the browser, so the button appears after mount.
  const [fullscreenReady, setFullscreenReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setFullscreenReady(true);
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

  const toggle = (event: MouseEvent<HTMLButtonElement>) => {
    // The click that ends a drag or pinch is a pan, not a tap on the clip.
    if (zoom.takeMoved()) return;
    const video = videoRef.current;
    if (!video) return;

    // The first tap of a double tap paused or resumed the clip; the clip plays in full screen
    // either way, and `userPaused` is cleared so leaving it does not leave a clip nobody paused.
    if (!fullscreen && event.timeStamp - lastTap.current < DOUBLE_TAP_MS) {
      lastTap.current = 0;
      setUserPaused(false);
      enterFullscreen();
      return;
    }
    lastTap.current = event.timeStamp;

    if (video.paused) {
      setUserPaused(false);
      playQuietly(video);
    } else {
      setUserPaused(true);
      video.pause();
    }
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
      <div
        ref={stageRef}
        // Tells the carousel to let go of its transform: the in-page full screen is `fixed`.
        data-media-pinned={fullscreen ? '' : undefined}
        className={cn(fullscreen ? STAGE_FULL : 'group/stage relative')}
      >
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
          <Frame ref={coverRef} fullscreen={fullscreen}>
            <video
              ref={videoRef}
              src={requested ? `${src}${FIRST_FRAME}` : undefined}
              muted
              loop
              playsInline
              preload={requested ? 'metadata' : 'none'}
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
              <button type="button" onClick={zoom.resetZoom} className={LEVEL}>
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
            className={cn(
              'absolute right-1 top-1 flex size-11 items-center justify-center rounded-md transition-opacity duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              // Hidden until the clip is hovered or something in it has focus, for a mouse only:
              // a touch screen has no hover, so there it stays on show.
              'can-hover:opacity-0 can-hover:focus-visible:opacity-100 can-hover:group-focus-within/stage:opacity-100 can-hover:group-hover/stage:opacity-100'
            )}
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

function DemoImage({ src, alt }: { src: string; alt: string }) {
  const { ref: coverRef, drawn } = useMediaDrawn<HTMLSpanElement>();
  const imageRef = useRef<HTMLImageElement>(null);

  return (
    <Frame ref={coverRef}>
      {/* A plain <img> is the only way a stored SVG or GIF is drawn: never inline, never <object>. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
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
    />
  ) : (
    <DemoImage src={item.url} alt={item.name} />
  );

  return (
    <figure className="relative min-w-0">
      {media}
      {/* On the frame, not under it: the carousel's dots sit at the bottom of the slide, and the full-screen button opposite, top right. */}
      {item.caption && (
        <figcaption className="pointer-events-none absolute left-2 top-2 max-w-[calc(100%-1rem)] rounded-full bg-background/80 px-2 py-1 font-mono text-xs leading-none text-foreground [overflow-wrap:anywhere]">
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
 * The demo of a featured work, always on show: a clip plays while it is on screen, an image
 * loads lazily, and each sits in a reserved 16:9 frame. The media are one carousel, as the
 * education gallery is: the next one only partly in view, dragged or swiped into place. A lone
 * clip fills the row.
 */
export function FeaturedWorkDemo({
  media,
  controlLabels,
  className,
}: FeaturedWorkDemoProps) {
  return (
    <MediaCarousel
      fillSingle
      className={className}
      slides={media.map((item) => ({
        id: item.id,
        node: <DemoFigure item={item} controlLabels={controlLabels} />,
      }))}
    />
  );
}
