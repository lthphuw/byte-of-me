'use client';

import type { ReactNode } from 'react';

import {
  FeaturedWorkDemo,
  type FeaturedWorkDemoControlLabels,
  type FeaturedWorkDemoItem,
} from './featured-work-demo';
import {
  WORK_BODY,
  WORK_HEAD,
  WORK_MEDIA_BLEED,
  WORK_ROW,
  WORK_TITLE,
} from './featured-work-row-classes';

import { cn } from '@/shared/lib/utils';

const SCROLL_TARGET = 'scroll-mt-24 md:scroll-mt-28';

interface FeaturedWorkItemProps {
  /** `featured-works-<id>`: the row's id and its deep-link target. */
  anchorId: string;
  title: string;
  /** The proof badges, on the title's line. Null when the work has none. */
  links: ReactNode;
  /** The body, always on show. Null when the work has none. */
  details: ReactNode;
  /** The demo pair, always on show. */
  media: FeaturedWorkDemoItem[];
  /** The full-screen toolbar's labels for the demo pair. */
  demoControls: FeaturedWorkDemoControlLabels;
}

/**
 * One featured work: the title with its proof badges beside it, then the demo, then the
 * details. On a phone the demo is a swipeable strip; from md it is two columns.
 */
export function FeaturedWorkItem({
  anchorId,
  title,
  links,
  details,
  media,
  demoControls,
}: FeaturedWorkItemProps) {
  return (
    <div id={anchorId} className={cn(SCROLL_TARGET, WORK_ROW)}>
      <div className={WORK_HEAD}>
        <h3 className={WORK_TITLE}>{title}</h3>
        {links}
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
