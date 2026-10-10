import type { ReactNode } from 'react';
import { RichTextHtml } from '@byte-of-me/ui/rich-text-html';
import { ArrowUpRight, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { FeaturedWorkDemoItem } from './featured-work-demo';
import { FeaturedWorkItem } from './featured-work-item';

import type { PublicFeaturedWork } from '@/entities/featured-work/model/types';
import { isVideoMimeType } from '@/entities/media/model/upload-constraints';

const META = 'font-mono text-xs text-muted-foreground';
/**
 * Overrides on RichTextHtml's compact variant for the body. The title column is the
 * measure, and an author's `#` or `##` must not out-size the row title.
 */
const DETAILS_PROSE =
  'max-w-prose [&>:last-child]:mb-0 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_tr>:first-child]:bg-card';
const EXTERNAL_LINK =
  'inline-flex min-h-11 items-center gap-1 rounded-sm text-sm font-medium text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/**
 * One numbered line of the homepage list. A work with details or a demo expands in
 * place, and its external link moves to the end of the body. A work with neither
 * stays one link, or static when it has no url.
 */
export function FeaturedWorkRow({
  work,
  index,
}: {
  work: PublicFeaturedWork;
  index: number;
}) {
  const t = useTranslations('homepage');
  const { github, host, url } = work;

  let meta: ReactNode = null;
  if (github) {
    meta = (
      <>
        <span className={`${META} [overflow-wrap:anywhere]`}>{github.repo}</span>
        <span className={`${META} inline-flex items-center gap-1 tabular-nums`}>
          <Star aria-hidden className="size-3.5" />
          {t('featuredStars', { count: github.stars })}
        </span>
      </>
    );
  } else if (host) {
    meta = <span className={`${META} [overflow-wrap:anywhere]`}>{host}</span>;
  }

  const details: ReactNode = work.detailsHtml ? (
    <RichTextHtml html={work.detailsHtml} variant="compact" className={DETAILS_PROSE} />
  ) : null;

  const media: FeaturedWorkDemoItem[] = work.media.map((item) => {
    const name = item.label ?? work.title;
    return {
      id: item.id,
      url: item.url,
      isVideo: isVideoMimeType(item.mimeType),
      caption: item.label,
      name,
      playLabel: t('featuredDemoPlay', { label: name }),
    };
  });
  const expandable = Boolean(details) || media.length > 0;

  const footer: ReactNode =
    expandable && url ? (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={EXTERNAL_LINK}
      >
        {github
          ? t('featuredViewOnGithub')
          : t('featuredVisitHost', { host: host ?? '' })}
        <ArrowUpRight aria-hidden className="size-4" />
        <span className="sr-only">{t('featuredOpensInNewTab')}</span>
      </a>
    ) : null;

  return (
    <FeaturedWorkItem
      anchorId={`featured-works-${work.id}`}
      number={String(index + 1).padStart(2, '0')}
      title={work.title}
      description={work.description}
      meta={meta}
      href={expandable ? null : url}
      newTabLabel={t('featuredOpensInNewTab')}
      details={details}
      media={media}
      footer={footer}
    />
  );
}
