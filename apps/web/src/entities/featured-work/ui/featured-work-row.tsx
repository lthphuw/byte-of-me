import type { ReactNode } from 'react';
import { RichTextHtml } from '@byte-of-me/ui/rich-text-html';
import { Star } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { FeaturedWorkDemoItem } from './featured-work-demo';
import { FeaturedWorkItem } from './featured-work-item';

import type { PublicFeaturedWork } from '@/entities/featured-work/model/types';
import { isVideoMimeType } from '@/entities/media/model/upload-constraints';

const META = 'inline-flex items-center gap-1';
/**
 * Overrides on RichTextHtml's compact variant for the body. The text is the work's
 * account, so it sets at body size, not the compact card size.
 */
const DETAILS_PROSE =
  'max-w-prose text-base leading-[1.65] [&>:last-child]:mb-0 [&_p]:text-base [&_p]:leading-[1.65] [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-lg [&_h2]:font-semibold [&_tr>:first-child]:bg-card';

/**
 * One featured work on the homepage. Its title is the only link, to the work's url;
 * the demo and the details always show.
 */
export function FeaturedWorkRow({ work }: { work: PublicFeaturedWork }) {
  const t = useTranslations('homepage');
  const { github, host, url } = work;

  let meta: ReactNode = null;
  if (github) {
    meta = (
      <>
        <span className="[overflow-wrap:anywhere]">{github.repo}</span>
        <span className={`${META} tabular-nums`}>
          <Star aria-hidden className="size-3.5" />
          {t('featuredStars', { count: github.stars })}
        </span>
      </>
    );
  } else if (host) {
    meta = <span className="[overflow-wrap:anywhere]">{host}</span>;
  }

  const details: ReactNode = work.detailsHtml ? (
    <RichTextHtml
      html={work.detailsHtml}
      variant="compact"
      className={DETAILS_PROSE}
    />
  ) : null;

  const media: FeaturedWorkDemoItem[] = work.media.map((item) => {
    const name = item.label ?? work.title;
    return {
      id: item.id,
      url: item.url,
      isVideo: isVideoMimeType(item.mimeType),
      knownRatio: item.width && item.height ? item.width / item.height : null,
      caption: item.label,
      name,
      playLabel: t('featuredDemoPlay', { label: name }),
      fullscreenLabel: t('featuredDemoFullscreen', { label: name }),
    };
  });

  return (
    <FeaturedWorkItem
      anchorId={`featured-works-${work.id}`}
      title={work.title}
      meta={meta}
      href={url}
      newTabLabel={t('featuredOpensInNewTab')}
      details={details}
      media={media}
      demoControls={{
        zoomIn: t('featuredDemoZoomIn'),
        zoomOut: t('featuredDemoZoomOut'),
        zoomReset: t('featuredDemoZoomReset'),
        exitFullscreen: t('featuredDemoExitFullscreen'),
      }}
    />
  );
}
