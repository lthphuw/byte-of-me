import type { ReactNode } from 'react';
import { RichTextHtml } from '@byte-of-me/ui/rich-text-html';
import { useTranslations } from 'next-intl';

import type { FeaturedWorkDemoItem } from './featured-work-demo';
import { FeaturedWorkItem } from './featured-work-item';
import { FeaturedWorkLinkBadge } from './featured-work-link';
import { WORK_LINKS } from './featured-work-row-classes';

import type { PublicFeaturedWork } from '@/entities/featured-work/model/types';
import { isVideoMimeType } from '@/entities/media/model/upload-constraints';

/**
 * Overrides on RichTextHtml's compact variant for the body. The author's headings stay
 * at body size so they do not out-size the work's title.
 */
const DETAILS_PROSE =
  'max-w-prose [&>:last-child]:mb-0 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_tr>:first-child]:bg-card';

/**
 * One featured work on the homepage. Its proof links sit under the title, one row each;
 * the demo and the details always show.
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
      links={links}
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
