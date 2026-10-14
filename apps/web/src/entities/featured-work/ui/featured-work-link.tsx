import { ArrowUpRight, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  WORK_LINK,
  WORK_LINK_TEXT,
  WORK_META,
  WORK_STATE,
} from './featured-work-row-classes';

import type {
  FeaturedWorkPullRequestState,
  PublicFeaturedWorkLink,
} from '@/entities/featured-work/model/types';
import { cn } from '@/shared/lib/utils';

const GLYPH = 'ml-1 inline size-4 align-baseline text-muted-foreground';

/** The state's catalogue key. A pull request's state is GitHub's word; the label is ours. */
const STATE_KEY = {
  OPEN: 'featuredPrStateOpen',
  MERGED: 'featuredPrStateMerged',
  CLOSED: 'featuredPrStateClosed',
} as const;

/** Merged is the one state worth a colour; the text still names it. */
const STATE_TONE: Record<FeaturedWorkPullRequestState, string> = {
  OPEN: 'text-foreground',
  MERGED: 'border-primary text-primary',
  CLOSED: 'text-muted-foreground',
};

/**
 * One proof link under a featured work's title. The text is the authored label, else the
 * pull request's title, else its repo and number, else the host. The meta line shows the
 * repo and number, and for a pull request its state and stars.
 */
export function FeaturedWorkLinkRow({ link }: { link: PublicFeaturedWorkLink }) {
  const t = useTranslations('homepage');
  const { github, host, label, pr, url } = link;

  const primary =
    label ?? github?.title ?? (pr ? `${pr.repo} #${pr.number}` : host);
  // A pull request's repo and number; a non-PR link shows its host only when it has a label.
  const detail = pr ? `${pr.repo} #${pr.number}` : label ? host : null;
  const showDetail = detail !== null && detail !== primary;

  return (
    <li>
      <div className={WORK_LINK}>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={WORK_LINK_TEXT}
        >
          {primary}
          <ArrowUpRight aria-hidden className={GLYPH} />
          <span className="sr-only">{t('featuredOpensInNewTab')}</span>
        </a>

        {(showDetail || github) && (
          <span className={WORK_META}>
            {showDetail && (
              <span className="[overflow-wrap:anywhere]">{detail}</span>
            )}
            {github && (
              <>
                <span className={cn(WORK_STATE, STATE_TONE[github.state])}>
                  {t(STATE_KEY[github.state])}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Star aria-hidden className="size-3.5" />
                  {t('featuredStars', { count: github.stars })}
                </span>
              </>
            )}
          </span>
        )}
      </div>
    </li>
  );
}
