'use client';

import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';

import {
  FeaturedWorkDemo,
  type FeaturedWorkDemoControlLabels,
  type FeaturedWorkDemoItem,
} from './featured-work-demo';
import {
  BODY_ROW,
  DETAILS_CELL,
  PLAIN_ROW_HEADER,
  ROW_BODY_STACK,
  ROW_META_CELL,
  ROW_NUMBER_TEXT,
  ROW_TITLE_TEXT,
  ROW_TRACKS,
} from './featured-work-row-classes';

import { cn } from '@/shared/lib/utils';

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
const ROW_LINK =
  '-mx-3 block rounded-lg px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

interface FeaturedWorkItemProps {
  /** `featured-works-<id>`: the row's id and its deep-link target. */
  anchorId: string;
  number: string;
  title: string;
  /** The repo / stars block, or the host. Null when there is nothing to show. */
  meta: ReactNode;
  /** Plain rows only: the whole row becomes this external link. */
  href: string | null;
  /** Screen-reader suffix of that link: "(opens in a new tab)". */
  newTabLabel: string;
  /** The body, always on show. Null when the work has none. */
  details: ReactNode;
  /** The demo pair, always on show. A row with no details and no demo is plain. */
  media: FeaturedWorkDemoItem[];
  /** The full-screen toolbar's labels for the demo pair. */
  demoControls: FeaturedWorkDemoControlLabels;
  /** The external link, on the action line under the demo. */
  footer?: ReactNode;
}

export function FeaturedWorkItem({
  anchorId,
  number,
  title,
  meta,
  href,
  newTabLabel,
  details,
  media,
  demoControls,
  footer,
}: FeaturedWorkItemProps) {
  const hasMedia = media.length > 0;
  const hasDetails = Boolean(details);
  const plain = !hasMedia && !hasDetails;

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
          controlLabels={demoControls}
          className={cn(BODY_ROW, !hasDetails && !footer && 'pb-3')}
        />
      )}
      {footer && (
        <div className={cn(BODY_ROW, 'flex flex-wrap items-center gap-x-6')}>
          {footer}
        </div>
      )}
      {hasDetails && (
        <div className={cn(DETAILS_CELL, 'pb-3 pt-1')}>{details}</div>
      )}
    </div>
  );
}
