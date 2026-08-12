'use client';

import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { m, type Transition } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/shared/lib/utils';

interface ExpandableRichTextProps {
  /**
   * Already-rendered rich text, passed down from a server component.
   *
   * Deliberately `children` rather than a `content` string this component
   * renders itself: importing `RichText` here would pull the Tiptap extension
   * schema (~1 MB of tiptap/prosemirror/lowlight) into the client bundle of
   * every page that shows an achievement. Rendering stays on the server; only
   * the collapse behaviour is a client concern.
   */
  children: ReactNode;
  /** Height the collapsed state clamps to, in px. Rounded down to whole lines. */
  collapsedHeight?: number;
  className?: string;
}

/**
 * Enter eases out; exit eases in and runs shorter, so collapsing gets out of
 * the way rather than lingering. Same curve and timings as the
 * `collapsible-down` / `collapsible-up` animations in `tailwind.config.ts` —
 * this is the same gesture, so it should not read as a different one.
 */
const EXPAND_TRANSITION: Transition = { duration: 0.18, ease: 'easeOut' };
const COLLAPSE_TRANSITION: Transition = { duration: 0.12, ease: 'easeIn' };

/** The first clamp is a measurement result, not a user action — never animate it. */
const INSTANT_TRANSITION: Transition = { duration: 0 };

/**
 * The clamp height, rounded DOWN to a whole number of text lines.
 *
 * This is what lets the collapsed state end in a clean cut instead of a fade.
 * An arbitrary pixel clamp lands wherever it lands — usually part-way through a
 * row of glyphs, leaving a sliced half-line that looks like a rendering fault,
 * which is the thing a gradient mask is normally there to hide. Cutting on a
 * line boundary removes the problem rather than veiling it, so no mask is
 * needed and the text stays at full contrast right down to the edge.
 *
 * Falls back to the raw height when the line height is not a usable number:
 * `getComputedStyle` reports `normal` for some elements, and content that is an
 * image or a table has no meaningful line grid to snap to.
 */
function snapToLineGrid(element: HTMLElement, collapsedHeight: number): number {
  const lineHeight = Number.parseFloat(getComputedStyle(element).lineHeight);

  if (!Number.isFinite(lineHeight) || lineHeight <= 0) return collapsedHeight;
  if (lineHeight > collapsedHeight) return collapsedHeight;

  return Math.floor(collapsedHeight / lineHeight) * lineHeight;
}

/**
 * Collapsed view of rich text, sharing the copy of `ExpandableText`.
 *
 * Clamping happens by measured height rather than `-webkit-line-clamp`, which
 * only ever counts lines of a single text block and so leaves lists, images
 * and blockquotes uncut.
 *
 * Reduced motion needs no handling here: `MotionProvider` wraps the app in
 * `MotionConfig reducedMotion="user"`, and `height` is one of framer-motion's
 * positional keys — under that setting it is applied instantly instead of
 * tweened, as is the chevron's rotation. Hence `m.*` (which `LazyMotion` also
 * requires) rather than a CSS transition, which would have needed its own
 * `prefers-reduced-motion` gate.
 */
export function ExpandableRichText({
  children,
  collapsedHeight = 104,
  className,
}: ExpandableRichTextProps) {
  const t = useTranslations('components.expandableText');
  const contentRef = useRef<HTMLDivElement>(null);
  const contentId = useId();
  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [clampHeight, setClampHeight] = useState(collapsedHeight);
  const [hasToggled, setHasToggled] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const element = contentRef.current;
    if (!element) return;

    // Images and webfonts settle after the first paint, so the measurement is
    // repeated whenever the content box changes size. The line grid is read
    // here too: a webfont swap changes the line height, and a clamp snapped to
    // the fallback font's grid would stop being a clean cut once it lands.
    const measure = () => {
      const snapped = snapToLineGrid(element, collapsedHeight);
      setClampHeight(snapped);
      setIsOverflowing(element.scrollHeight > snapped + 8);
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(element);

    return () => observer.disconnect();
  }, [children, collapsedHeight]);

  const isCollapsed = isOverflowing && !expanded;

  // Clipping stays on for the whole expand animation — the box is still
  // shorter than its content until the tween lands — and comes off once it
  // finishes, which is also what stops a late-loading image being cut off
  // while expanded.
  const isClipped = isCollapsed || (isOverflowing && isAnimating);

  const toggle = () => {
    setHasToggled(true);
    setIsAnimating(true);
    setExpanded((prev) => !prev);
  };

  return (
    <div className={className}>
      {/*
        Animating to `'auto'` rather than to a measured pixel height on
        purpose. The `collapsible-down` comment in tailwind.config.ts warns off
        height tweens because Radix measures once at mount and TipTap renders a
        tick later; neither applies here — these children are server-rendered
        HTML, already in the DOM, and framer-motion measures at the moment of
        the click, not at mount. `'auto'` is also self-correcting: framer
        measures the target, tweens in pixels, then writes `height: auto` at the
        end, so content that settles late (images, webfonts) simply grows the
        box instead of being clipped by a stale target.
      */}
      <m.div
        id={contentId}
        className={cn(isClipped && 'overflow-hidden')}
        style={{
          // The very first clamp is plain CSS, not a framer value. `LazyMotion`
          // code-splits the animation features, and until that chunk resolves
          // an `m.*` element ignores `animate` altogether — so a page that has
          // not finished loading framer would show the full, unclamped text.
          // Dropped on the first toggle, so it can never fight the tween.
          maxHeight: !hasToggled && isCollapsed ? clampHeight : undefined,
        }}
        initial={false}
        animate={{ height: isCollapsed ? clampHeight : 'auto' }}
        transition={
          !hasToggled
            ? INSTANT_TRANSITION
            : expanded
              ? EXPAND_TRANSITION
              : COLLAPSE_TRANSITION
        }
        onAnimationComplete={() => setIsAnimating(false)}
      >
        <div ref={contentRef}>{children}</div>
      </m.div>

      {isOverflowing && (
        <div className="mt-2 border-t border-border pt-2">
          <button
            type="button"
            onClick={toggle}
            aria-expanded={expanded}
            aria-controls={contentId}
            // Underlined at rest, per the design system: the palette is
            // achromatic, so `text-primary` alone is indistinguishable from body
            // text and a hover-only underline does not exist on touch at all.
            // `items-start` + wrapping, because the Vietnamese labels are longer.
            className="inline-flex cursor-pointer items-start gap-1 text-left text-xs font-medium text-primary underline underline-offset-4 hover:no-underline"
          >
            {expanded ? t('showLess') : t('showMore')}
            <m.span
              aria-hidden
              className="inline-flex pt-px"
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={expanded ? EXPAND_TRANSITION : COLLAPSE_TRANSITION}
            >
              <ChevronDown className="size-3.5" />
            </m.span>
          </button>
        </div>
      )}
    </div>
  );
}
