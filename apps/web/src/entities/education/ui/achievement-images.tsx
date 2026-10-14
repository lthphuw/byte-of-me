'use client';

import Image from 'next/image';

import type { Media } from '@/shared/types/models';
import { MediaCarousel } from '@/shared/ui/media-carousel';
import { MediaFrame } from '@/shared/ui/media-cover';

interface AchievementImagesProps {
  images: Media[];
  title: string;
}

/** An achievement's photos, as the shared media carousel draws them. */
export function AchievementImages({ images, title }: AchievementImagesProps) {
  if (!images?.length) return null;

  const several = images.length > 1;

  return (
    <MediaCarousel
      slides={images.map((img, i) => ({
        id: img.id,
        node: (
          <MediaFrame className="aspect-[4/3] w-full select-none rounded-xl">
            <Image
              src={img.url}
              alt={several ? `${title} (${i + 1}/${images.length})` : title}
              fill
              draggable={false}
              sizes="(max-width: 768px) 85vw, 400px"
              className="object-cover"
            />
          </MediaFrame>
        ),
      }))}
    />
  );
}
