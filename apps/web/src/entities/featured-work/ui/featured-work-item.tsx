'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { ArrowUpRight, ChevronDown } from 'lucide-react';

import {
  FeaturedWorkDemo,
  type FeaturedWorkDemoItem,
} from './featured-work-demo';
import {
  BODY_ROW,
  DETAILS_CELL,
  PLAIN_ROW_HEADER,
  ROW_BODY_STACK,
  ROW_DESCRIPTION_TEXT,
  ROW_META_CELL,
  ROW_NUMBER_TEXT,
  ROW_TITLE_TEXT,
  ROW_TRACKS,
} from './featured-work-row-classes';

import { cn } from '@/shared/lib/utils';
import { DisclosureRegion } from '@/shared/ui/disclosure-region';

const PLAIN_HEADER = `group ${PLAIN_ROW_HEADER}`;
/**
 * A row with a demo or details spans the row grid and takes its columns (subgrid),
 * so what sits under it lines up with the title column. The demo follows at once,
 * so the header keeps less room below than a plain row's.
 */
const BODY_HEADER = 'col-span-full grid grid-cols-subgrid gap-y-2 pb-4 pt-5';
const SCROLL_TARGET = 'scroll-mt-24 md:scroll-mt-28';
/** A plain row's title keeps its hairline underline; `group-hover:` is hover-gated by config. */
const TITLE_UNDERLINE =
  'underline decoration-border underline-offset-4 group-hover:decoration-primary';
const GLYPH = 'ml-1 inline size-4 align-baseline text-muted-foreground';
const ACTION =
  'inline-flex min-h-11 items-center gap-1 rounded-sm text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
/**
 * The chevron animates only after the first user toggle, and only its transform.
 * Until then `transition-none` stops the default `transition-property: all` that the
 * duration and easing classes would otherwise turn on: a deep link or a hashchange
 * turns the chevron with no animation, matching the panel.
 */
const CHEVRON_IDLE = 'transition-none';
const CHEVRON_ARMED = 'transition-transform motion-reduce:transition-none';
const ROW_LINK =
  '-mx-3 block rounded-lg px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

interface FeaturedWorkItemProps {
  /** `featured-works-<id>`: the row's id and its deep-link target. */
  anchorId: string;
  number: string;
  title: string;
  description: string | null;
  /** The repo / stars block, or the host. Null when there is nothing to show. */
  meta: ReactNode;
  /** Plain rows only: the whole row becomes this external link. */
  href: string | null;
  /** Screen-reader suffix of that link: "(opens in a new tab)". */
  newTabLabel: string;
  /** Server-rendered details text. Null when the work has none. */
  details: ReactNode;
  /** The demo pair, always on show. A row with no details and no demo is plain. */
  media: FeaturedWorkDemoItem[];
  /** The details toggle's label while the details are shut / open. */
  showDetailsLabel: string;
  hideDetailsLabel: string;
  /** The external link, on the action line under the demo. */
  footer?: ReactNode;
}

export function FeaturedWorkItem({
  anchorId,
  number,
  title,
  description,
  meta,
  href,
  newTabLabel,
  details,
  media,
  showDetailsLabel,
  hideDetailsLabel,
  footer,
}: FeaturedWorkItemProps) {
  const hasMedia = media.length > 0;
  const hasDetails = Boolean(details);
  const plain = !hasMedia && !hasDetails;
  const [open, setOpen] = useState(false);
  const [hasToggled, setHasToggled] = useState(false);
  const panelId = `${anchorId}-details`;

  // Only this row's own id is compared with the hash. Streamed Suspense sections
  // can leave the same id in the document twice, so a DOM lookup would be wrong.
  useEffect(() => {
    if (!hasDetails) return;
    const openIfTargeted = () => {
      if (window.location.hash !== `#${anchorId}`) return;
      // A deep link opens without animating, so the transition is disarmed first.
      setHasToggled(false);
      setOpen(true);
    };
    openIfTargeted();
    window.addEventListener('hashchange', openIfTargeted);
    return () => window.removeEventListener('hashchange', openIfTargeted);
  }, [anchorId, hasDetails]);

  const toggle = () => {
    setHasToggled(true);
    setOpen((value) => !value);
  };

  const header = (
    <div className={plain ? PLAIN_HEADER : BODY_HEADER}>
      <span className={cn(ROW_NUMBER_TEXT, 'text-muted-foreground')}>
        {number}
      </span>

      <div className={ROW_BODY_STACK}>
        <h3 className={cn(ROW_TITLE_TEXT, '[overflow-wrap:anywhere]')}>
          <span className={href ? TITLE_UNDERLINE : undefined}>{title}</span>
          {href && <ArrowUpRight aria-hidden className={GLYPH} />}
        </h3>
        {description && (
          <p className={cn(ROW_DESCRIPTION_TEXT, 'text-muted-foreground')}>
            {description}
          </p>
        )}
      </div>

      {meta && <div className={ROW_META_CELL}>{meta}</div>}
    </div>
  );

  if (plain) {
    return (
      <div id={anchorId} className={SCROLL_TARGET}>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={ROW_LINK}
          >
            {header}
            <span className="sr-only">{newTabLabel}</span>
          </a>
        ) : (
          header
        )}
      </div>
    );
  }

  return (
    <div id={anchorId} className={cn(SCROLL_TARGET, 'grid pb-2', ROW_TRACKS)}>
      {header}
      {hasMedia && (
        <FeaturedWorkDemo
          media={media}
          className={cn(BODY_ROW, !hasDetails && !footer && 'pb-3')}
        />
      )}
      {(hasDetails || footer) && (
        <div className={cn(BODY_ROW, 'flex flex-wrap items-center gap-x-6')}>
          {hasDetails && (
            <button
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={toggle}
              className={cn(
                ACTION,
                'text-muted-foreground hover:text-foreground'
              )}
            >
              {open ? hideDetailsLabel : showDetailsLabel}
              <ChevronDown
                aria-hidden
                className={cn(
                  'size-4',
                  hasToggled ? CHEVRON_ARMED : CHEVRON_IDLE,
                  open
                    ? 'rotate-180 duration-250 ease-enter'
                    : 'duration-200 ease-exit'
                )}
              />
            </button>
          )}
          {footer}
        </div>
      )}
      {hasDetails && (
        <DisclosureRegion
          id={panelId}
          open={open}
          animated={hasToggled}
          className={DETAILS_CELL}
        >
          {/* The bottom padding sits inside the clip box, so a closed row keeps none. */}
          <div className="pb-3 pt-1">{details}</div>
        </DisclosureRegion>
      )}
    </div>
  );
}
