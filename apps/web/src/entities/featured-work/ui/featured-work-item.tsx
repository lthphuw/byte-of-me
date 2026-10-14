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
  WORK_ROW,
  WORK_TITLE,
} from './featured-work-row-classes';

import { cn } from '@/shared/lib/utils';
import { ExpandableRichText } from '@/shared/ui/expandable-rich-text';

const SCROLL_TARGET = 'scroll-mt-24 md:scroll-mt-28';

interface FeaturedWorkItemProps {
  /** `featured-works-<id>`: the row's id and its deep-link target. */
  anchorId: string;
  title: string;
  /** The proof links, on the title's line. Null when the work has none. */
  links: ReactNode;
  /** The body, clamped with a toggle when long. Null when the work has none. */
  details: ReactNode;
  /** The demo pair, always on show. */
  media: FeaturedWorkDemoItem[];
  /** The full-screen toolbar's labels for the demo pair. */
  demoControls: FeaturedWorkDemoControlLabels;
}

/**
 * One featured work: the title with its proof links beside it, then the demo, then the
 * details, clamped to three lines with a toggle when longer. The demo is a carousel, as the
 * education gallery is.
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
        <FeaturedWorkDemo media={media} controlLabels={demoControls} />
      )}

      {details && (
        <ExpandableRichText className={WORK_BODY}>{details}</ExpandableRichText>
      )}
    </div>
  );
}
