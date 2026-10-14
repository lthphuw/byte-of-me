import { useTranslations } from 'next-intl';

import { WORK_LINK } from './featured-work-row-classes';

import type {
  FeaturedWorkPullRequestState,
  PublicFeaturedWorkLink,
} from '@/entities/featured-work/model/types';

/** The state's catalogue key. Said to screen readers only: the link itself is just `#123`. */
const STATE_KEY = {
  OPEN: 'featuredPrStateOpen',
  MERGED: 'featuredPrStateMerged',
  CLOSED: 'featuredPrStateClosed',
} as const satisfies Record<FeaturedWorkPullRequestState, string>;

/**
 * One proof link as plain text: a pull request is its number (`#123`), any other link its
 * authored label, else its host. The authored label and the repo stay on a pull request as
 * its hover title and its spoken name, so nothing the author typed is lost.
 */
export function FeaturedWorkLink({ link }: { link: PublicFeaturedWorkLink }) {
  const t = useTranslations('homepage');
  const { github, host, label, pr, url } = link;

  const text = pr ? `#${pr.number}` : (label ?? host);
  const title = pr
    ? [label, `${pr.repo} #${pr.number}`].filter(Boolean).join(' · ')
    : undefined;

  return (
    <li>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={title}
        className={WORK_LINK}
      >
        {text}
        <span className="sr-only">
          {pr && label ? `, ${label}` : ''}
          {github ? `, ${t(STATE_KEY[github.state])}` : ''} {t('featuredOpensInNewTab')}
        </span>
      </a>
    </li>
  );
}
