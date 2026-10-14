import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import type { FeaturedWorkDemoItem } from './featured-work-demo';
import { FeaturedWorkItem } from './featured-work-item';
import { FeaturedWorkLinkBadge } from './featured-work-link';
import { WORK_LINKS } from './featured-work-row-classes';

import type { PublicFeaturedWork } from '@/entities/featured-work/model/types';
import { isVideoMimeType } from '@/entities/media/model/upload-constraints';

/**
 * One featured work on the homepage: its proof badges beside the title, then the demo.
 * The details body is stored and edited in the dashboard, but the homepage does not draw it.
 */
export function FeaturedWorkRow({ work }: { work: PublicFeaturedWork }) {
  const t = useTranslations('homepage');

  const links: ReactNode =
    work.links.length > 0 ? (
      <ul aria-label={t('featuredLinksLabel')} className={WORK_LINKS}>
        {work.links.map((link) => (
          <FeaturedWorkLinkBadge key={link.id} link={link} />
        ))}
      </ul>
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
      links={links}
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
