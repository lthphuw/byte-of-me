import { cn } from '@/shared/lib/utils';

/** Geometry of the arc, in the SVG's own units. The viewBox is square and the
 *  element scales with its box, so these numbers never need a breakpoint. */
const VIEW = 200;
const RADIUS = 86;
const STROKE = 14;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * A duration against its target, drawn as an arc with the figure inside it.
 *
 * This is the answer to "the most important number renders as a caption": a
 * length of sleep is a quantity with a goal attached, and a ring shows the
 * quantity, the goal and the shortfall in one mark — where "8h 10m" as running
 * text shows only the first and asks the reader to do the rest.
 *
 * Deliberately NOT a client component and deliberately hook-free, so the same
 * ring serves the hub (a server component reading last night) and the entry
 * form (a client component redrawing on every keystroke). The only moving part
 * is a CSS transition on `stroke-dashoffset`, which needs no JavaScript to
 * follow a value change and is switched off by `motion-reduce` — framer's
 * `MotionConfig reducedMotion="user"` covers transform and layout animations
 * and would not have covered this one.
 *
 * The arc carries no information the text does not: `children` holds the real
 * figure, and the SVG is `aria-hidden`. Colour alone never says "short night".
 */
export function DurationRing({
  fraction,
  className,
  children,
}: {
  /** 0..1. Values above 1 are clamped — a long night fills the ring, it does
   *  not wrap around and start a second lap. */
  fraction: number;
  className?: string;
  children: React.ReactNode;
}) {
  const clamped = Math.max(0, Math.min(1, fraction));
  const offset = CIRCUMFERENCE * (1 - clamped);

  return (
    <div className={cn('relative size-40 shrink-0', className)}>
      <svg
        aria-hidden
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        className="size-full -rotate-90"
      >
        <circle
          cx={VIEW / 2}
          cy={VIEW / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          className="stroke-muted"
        />
        <circle
          cx={VIEW / 2}
          cy={VIEW / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          className="stroke-primary transition-[stroke-dashoffset] duration-300 ease-out motion-reduce:transition-none"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 text-center">
        {children}
      </div>
    </div>
  );
}
