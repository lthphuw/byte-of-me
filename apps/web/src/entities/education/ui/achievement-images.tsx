'use client';

import { useEffect, useState } from 'react';
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@byte-of-me/ui';
import Image from 'next/image';

import { cn } from '@/shared/lib/utils';
import type { Media } from '@/shared/types/models';

interface AchievementImagesProps {
  images: Media[];
  title: string;
}

/**
 * An achievement's photos as one carousel at every width.
 *
 * It used to be a scroll strip of 160px thumbnails on desktop, which fit side
 * by side and so had nothing to swipe, and a carousel on phones. Slides are now
 * wide enough that a second image is only partly in view: it can be dragged or
 * swiped into place, and the arrows and dots do the same for a mouse.
 */
export function AchievementImages({ images, title }: AchievementImagesProps) {
  const [current, setCurrent] = useState(0);
  const [api, setApi] = useState<CarouselApi>();

  // Subscribed here so the cleanup can remove it. Inside an inline `setApi`
  // every render added another `select` listener and none were ever removed.
  useEffect(() => {
    if (!api) return;

    const sync = () => setCurrent(api.selectedScrollSnap());
    sync();
    api.on('select', sync);
    return () => {
      api.off('select', sync);
    };
  }, [api]);

  if (!images?.length) return null;

  const several = images.length > 1;

  return (
    <Carousel setApi={setApi}>
      <CarouselContent className="-ml-3 md:cursor-grab md:active:cursor-grabbing">
        {images.map((img, i) => (
          <CarouselItem
            key={img.id}
            className={cn(
              'pl-3',
              several
                ? 'basis-[85%] md:basis-[58%]'
                : 'basis-full md:basis-[58%]'
            )}
          >
            <div className="relative aspect-[4/3] w-full select-none overflow-hidden rounded-xl">
              <Image
                src={img.url}
                alt={several ? `${title} (${i + 1}/${images.length})` : title}
                fill
                draggable={false}
                sizes="(max-width: 768px) 85vw, 400px"
                className="object-cover"
              />
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>

      {several && (
        <>
          <CarouselPrevious className="left-2 hidden bg-background/80 md:inline-flex" />
          <CarouselNext className="right-2 hidden bg-background/80 md:inline-flex" />

          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1.5">
            {images.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'rounded-full',
                  i === current ? 'h-2 w-2 bg-white' : 'h-1.5 w-1.5 bg-white/50'
                )}
              />
            ))}
          </div>
        </>
      )}
    </Carousel>
  );
}
