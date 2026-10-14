'use client';

import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { menuTransition, motionEase } from '@byte-of-me/ui';
import { m, type Transition } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/shared/lib/utils';

interface ExpandableRichTextProps {
  /**
   * Server-rendered rich text. `children`, not a `content` string rendered here:
   * importing `RichText` would pull the Tiptap schema (~1 MB) into client JS.
   */
  children: ReactNode;
  className?: string;
}

/**
 * Expand eases on `sleek`; collapse runs shorter and eases in. The chevron turns
 * on the `menuTransition` spring, which settles without a tween's hard stop.
 */
const EXPAND_TRANSITION: Transition = {
  duration: 0.25,
  ease: motionEase.sleek,
};
const COLLAPSE_TRANSITION: Transition = {
  duration: 0.2,
  ease: motionEase.in,
};

/** The first clamp is a measurement result, not a user action — never animate it. */
const INSTANT_TRANSITION: Transition = { duration: 0 };

/**
 * Descent bound for the text-block search: a paragraph is 1 level down, a list item
 * or blockquote paragraph 2. The bound stops a deep tree being walked per resize.
 */
const MAX_BLOCK_DESCENT = 4;

/**
 * First block-level descendant with text, whose line grid the clamp cuts through. The
 * wrapper is wrong (24px vs the `<p>`'s 28px: 96px = 3.43 lines, a sliced glyph row).
 * Inline children are skipped (the block's strut sets the line box); null if no text.
 */
function findTextBlock(root: HTMLElement): HTMLElement | null {
  let textBlock: HTMLElement | null = null;
  let current = root;

  for (let depth = 0; depth < MAX_BLOCK_DESCENT; depth += 1) {
    const child = Array.from(current.children).find((candidate) => {
      if (!(candidate instanceof HTMLElement)) return false;
      if (!candidate.textContent?.trim()) return false;

      const { display } = getComputedStyle(candidate);
      return display !== 'none' && !display.startsWith('inline');
    });

    if (!(child instanceof HTMLElement)) break;

    textBlock = child;
    current = child;
  }

  return textBlock;
}

/** Height the collapsed state clamps to, in px, rounded down to whole lines. */
const COLLAPSED_HEIGHT = 104;

/**
 * Clamp height rounded DOWN to whole text lines: a clean cut, so no fade mask is needed.
 * Falls back to the raw height when line-height is unusable (`normal`) or there is no
 * text block (image, table).
 */
function snapToLineGrid(element: HTMLElement, collapsedHeight: number): number {
  const textBlock = findTextBlock(element);
  if (!textBlock) return collapsedHeight;

  const lineHeight = Number.parseFloat(getComputedStyle(textBlock).lineHeight);

  if (!Number.isFinite(lineHeight) || lineHeight <= 0) return collapsedHeight;
  if (lineHeight > collapsedHeight) return collapsedHeight;

  return Math.floor(collapsedHeight / lineHeight) * lineHeight;
}

/**
 * Collapsed rich text, clamped by measured height: `-webkit-line-clamp` counts one text
 * block's lines only, leaving lists, images and blockquotes uncut. Reduced motion needs
 * no code: `MotionConfig reducedMotion="user"` makes the height and chevron instant.
 */
export function ExpandableRichText({
  children,
  className,
}: ExpandableRichTextProps) {
  const t = useTranslations('components.expandableText');
  const contentRef = useRef<HTMLDivElement>(null);
  const contentId = useId();
  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [clampHeight, setClampHeight] = useState(COLLAPSED_HEIGHT);
  const [hasToggled, setHasToggled] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const element = contentRef.current;
    if (!element) return;

    // Images and webfonts settle after first paint, so re-measure on every size change,
    // line grid included: a webfont swap changes line height and would un-snap the clamp.
    const measure = () => {
      const snapped = snapToLineGrid(element, COLLAPSED_HEIGHT);
      setClampHeight(snapped);
      setIsOverflowing(element.scrollHeight > snapped + 8);
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(element);

    return () => observer.disconnect();
  }, [children]);

  const isCollapsed = isOverflowing && !expanded;

  // Clip through the whole expand tween (the box is shorter than its content until it
  // lands); releasing it afterwards is what stops a late image being cut off.
  const isClipped = isCollapsed || (isOverflowing && isAnimating);

  const toggle = () => {
    setHasToggled(true);
    setIsAnimating(true);
    setExpanded((prev) => !prev);
  };

  return (
    <div className={className}>
      {/* `'auto'` is safe: server HTML is already in the DOM, and late images just grow it. */}
      <m.div
        id={contentId}
        className={cn(isClipped && 'overflow-hidden')}
        style={{
          // First clamp is plain CSS: until the LazyMotion chunk loads, `m.*` ignores
          // `animate` and would show the full text. Dropped on first toggle so it
          // cannot fight the tween.
          maxHeight: !hasToggled && isCollapsed ? clampHeight : undefined,
        }}
        initial={false}
        animate={{
          height: isCollapsed ? clampHeight : 'auto',
          // The text under the fold arrives with the box rather than being
          // uncovered at full strength by it.
          opacity: expanded && hasToggled ? [0.6, 1] : 1,
        }}
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
        <div className="mt-2 border-t border-border">
          <button
            type="button"
            onClick={toggle}
            aria-expanded={expanded}
            aria-controls={contentId}
            // Underlined at rest (no hover on touch). `items-start` + wrap: Vietnamese is longer.
            // `py-3.5` is a touch target: label measured 83×16, so 16 + 2×14 = 44. Padding,
            // not an overlay: tappable tech-stack badges sit 16px below and would lose taps.
            className="inline-flex cursor-pointer items-start gap-1 py-3.5 text-left text-xs font-medium text-primary underline underline-offset-4 hover:no-underline"
          >
            {expanded ? t('showLess') : t('showMore')}
            <m.span
              aria-hidden
              className="inline-flex pt-px"
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={menuTransition}
            >
              <ChevronDown className="size-3.5" />
            </m.span>
          </button>
        </div>
      )}
    </div>
  );
}
