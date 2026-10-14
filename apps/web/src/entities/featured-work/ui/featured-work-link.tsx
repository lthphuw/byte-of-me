import { useTranslations } from 'next-intl';

import { WORK_BADGE } from './featured-work-row-classes';

import type {
  FeaturedWorkPullRequestState,
  PublicFeaturedWorkLink,
} from '@/entities/featured-work/model/types';

/** The state's catalogue key. The dot carries the colour; the word is for screen readers. */
const STATE_KEY = {
  OPEN: 'featuredPrStateOpen',
  MERGED: 'featuredPrStateMerged',
  CLOSED: 'featuredPrStateClosed',
} as const;

const STATE_DOT: Record<FeaturedWorkPullRequestState, string> = {
  OPEN: 'bg-foreground',
  MERGED: 'bg-primary',
  CLOSED: 'bg-muted-foreground',
};

/**
 * One proof link as a badge: the authored label, else the pull request's number, else the
 * host. A pull request shows its state as a dot, and its repo as the hover title.
 */
export function FeaturedWorkLinkBadge({ link }: { link: PublicFeaturedWorkLink }) {
  const t = useTranslations('homepage');
  const { github, host, label, pr, url } = link;

  const text = label ?? (pr ? `#${pr.number}` : host);
  const title = pr ? `${pr.repo} #${pr.number}` : undefined;

  return (
    <li>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={title}
        className={WORK_BADGE}
      >
        {github && (
          <span
            aria-hidden
            className={`size-1.5 shrink-0 rounded-full ${STATE_DOT[github.state]}`}
          />
        )}
        {text}
        <span className="sr-only">
          {github ? `${t(STATE_KEY[github.state])}, ` : ''}
          {t('featuredOpensInNewTab')}
        </span>
      </a>
    </li>
  );
}
