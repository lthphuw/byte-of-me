'use client';

import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';

import {
  FeaturedWorkDemo,
  type FeaturedWorkDemoControlLabels,
  type FeaturedWorkDemoItem,
} from './featured-work-demo';
import {
  WORK_BODY,
  WORK_HEAD,
  WORK_MEDIA_BLEED,
  WORK_META,
  WORK_ROW,
  WORK_TITLE,
} from './featured-work-row-classes';

import { cn } from '@/shared/lib/utils';

const SCROLL_TARGET = 'scroll-mt-24 md:scroll-mt-28';
/** The title keeps a hairline underline; `group-hover:` is hover-gated by config. */
const TITLE_LINK =
  'rounded-sm underline decoration-border underline-offset-4 group-hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const GLYPH = 'ml-1 inline size-4 align-baseline text-muted-foreground';

interface FeaturedWorkItemProps {
  /** `featured-works-<id>`: the row's id and its deep-link target. */
  anchorId: string;
  title: string;
  /** The repo / stars block, or the host. Null when there is nothing to show. */
  meta: ReactNode;
  /** The title's link target. Null leaves the title as plain text. */
  href: string | null;
  /** Screen-reader suffix of that link: "(opens in a new tab)". */
  newTabLabel: string;
  /** The body, always on show. Null when the work has none. */
  details: ReactNode;
  /** The demo pair, always on show. */
  media: FeaturedWorkDemoItem[];
  /** The full-screen toolbar's labels for the demo pair. */
  demoControls: FeaturedWorkDemoControlLabels;
}

/**
 * One featured work: the title (the only link), its meta, its demo, then its details.
 * On a phone the demo is a swipeable strip; from md it is two columns.
 */
export function FeaturedWorkItem({
  anchorId,
  title,
  meta,
  href,
  newTabLabel,
  details,
  media,
  demoControls,
}: FeaturedWorkItemProps) {
  return (
    <div id={anchorId} className={cn('group', SCROLL_TARGET, WORK_ROW)}>
      <div className={WORK_HEAD}>
        <h3 className={WORK_TITLE}>
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={TITLE_LINK}
            >
              {title}
              <ArrowUpRight aria-hidden className={GLYPH} />
              <span className="sr-only">{newTabLabel}</span>
            </a>
          ) : (
            title
          )}
        </h3>
        {meta && <div className={WORK_META}>{meta}</div>}
      </div>

      {media.length > 0 && (
        <FeaturedWorkDemo
          media={media}
          controlLabels={demoControls}
          className={WORK_MEDIA_BLEED}
        />
      )}

      {details && <div className={WORK_BODY}>{details}</div>}
    </div>
  );
}
