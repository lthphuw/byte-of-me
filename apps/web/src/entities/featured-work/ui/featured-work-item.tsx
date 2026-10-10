'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { ArrowUpRight, ChevronDown } from 'lucide-react';

import { FeaturedWorkDemo, type FeaturedWorkDemoItem } from './featured-work-demo';
import {
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
 * An expandable row's header spans the row grid and takes its columns (subgrid),
 * so the body below it lines up with the title column and never reaches the meta one.
 */
const DISCLOSURE_HEADER = 'group relative col-span-full grid grid-cols-subgrid gap-y-2 py-5';
const SCROLL_TARGET = 'scroll-mt-24 md:scroll-mt-28';
/** Today's look: the title keeps its hairline underline; `group-hover:` is hover-gated by config. */
const TITLE_UNDERLINE =
  'underline decoration-border underline-offset-4 group-hover:decoration-primary';
const GLYPH = 'ml-1 inline size-4 align-baseline text-muted-foreground';
/**
 * The header box is the hit area: the button's `::before` stretches over it, and
 * its focus ring sits inside the card edge with the same 12px room as the link row.
 */
const HIT_AREA =
  'text-left before:absolute before:inset-y-0 before:-inset-x-3 before:rounded-lg focus-visible:outline-none focus-visible:before:ring-2 focus-visible:before:ring-inset focus-visible:before:ring-ring';
/**
 * The chevron animates only after the first user toggle, and only its transform.
 * Until then `transition-none` stops the default `transition-property: all` that the
 * duration and easing classes would otherwise turn on: a deep link or a hashchange
 * turns the chevron with no animation, matching the panel.
 */
const CHEVRON_IDLE = 'transition-none';
const CHEVRON_ARMED = 'transition-transform motion-reduce:transition-none';
/**
 * With a demo, the body spans the title and meta columns from md and passes the row's
 * two tracks down through subgrids: the details and the link keep the title column,
 * the demo takes both. The subgrid's -mx-1/px-1 clip box cancels out in track sizing.
 */
const BODY_SPAN = 'md:col-span-2 md:grid-cols-subgrid';
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
  /** The demo pair. A row is expandable when it has `details` or at least one item. */
  media: FeaturedWorkDemoItem[];
  /** The last element of an expandable body: the external link. */
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
  footer,
}: FeaturedWorkItemProps) {
  const hasMedia = media.length > 0;
  const expandable = Boolean(details) || hasMedia;
  const [open, setOpen] = useState(false);
  const [hasToggled, setHasToggled] = useState(false);
  const panelId = `${anchorId}-details`;

  // Only this row's own id is compared with the hash. Streamed Suspense sections
  // can leave the same id in the document twice, so a DOM lookup would be wrong.
  useEffect(() => {
    if (!expandable) return;
    const openIfTargeted = () => {
      if (window.location.hash !== `#${anchorId}`) return;
      // A deep link opens without animating, so the transition is disarmed first.
      setHasToggled(false);
      setOpen(true);
    };
    openIfTargeted();
    window.addEventListener('hashchange', openIfTargeted);
    return () => window.removeEventListener('hashchange', openIfTargeted);
  }, [anchorId, expandable]);

  const toggle = () => {
    setHasToggled(true);
    setOpen((value) => !value);
  };

  const header = (
    <div className={expandable ? DISCLOSURE_HEADER : PLAIN_HEADER}>
      <span className={cn(ROW_NUMBER_TEXT, 'text-muted-foreground')}>{number}</span>

      <div className={ROW_BODY_STACK}>
        <h3 className={cn(ROW_TITLE_TEXT, '[overflow-wrap:anywhere]')}>
          {expandable ? (
            <button
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={toggle}
              className={HIT_AREA}
            >
              <span className={TITLE_UNDERLINE}>{title}</span>
              <ChevronDown
                aria-hidden
                className={cn(
                  GLYPH,
                  hasToggled ? CHEVRON_ARMED : CHEVRON_IDLE,
                  open ? 'rotate-180 duration-250 ease-enter' : 'duration-200 ease-exit'
                )}
              />
            </button>
          ) : (
            <>
              <span className={href ? TITLE_UNDERLINE : undefined}>{title}</span>
              {href && <ArrowUpRight aria-hidden className={GLYPH} />}
            </>
          )}
        </h3>
        {description && (
          <p className={cn(ROW_DESCRIPTION_TEXT, 'text-muted-foreground')}>
            {description}
          </p>
        )}
      </div>

      {meta && (
        <div className={ROW_META_CELL}>{meta}</div>
      )}
    </div>
  );

  if (!expandable) {
    return (
      <div id={anchorId} className={SCROLL_TARGET}>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className={ROW_LINK}>
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
    <div id={anchorId} className={cn(SCROLL_TARGET, 'grid', ROW_TRACKS)}>
      {header}
      <DisclosureRegion
        id={panelId}
        open={open}
        animated={hasToggled}
        className={cn('col-start-2 min-w-0', hasMedia && BODY_SPAN)}
        innerClassName={hasMedia ? 'md:col-span-2 md:grid-cols-subgrid md:grid' : undefined}
      >
        {/* The bottom padding sits inside the clip box, so a closed row keeps only the header's padding. */}
        {hasMedia ? (
          <div className="grid grid-cols-1 gap-y-4 pb-5 md:col-span-2 md:grid-cols-subgrid">
            {details && <div className="min-w-0 md:col-start-1">{details}</div>}
            <FeaturedWorkDemo media={media} open={open} className="md:col-span-2" />
            {footer && <div className="min-w-0 md:col-start-1">{footer}</div>}
          </div>
        ) : (
          <div className="pb-5">
            {details}
            {footer}
          </div>
        )}
      </DisclosureRegion>
    </div>
  );
}
