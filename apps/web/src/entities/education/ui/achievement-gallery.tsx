'use client';

import { useState } from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  Dialog,
  DialogContent,
  DialogTitle,
} from '@byte-of-me/ui';
import Image from 'next/image';

import type { Media } from '@/shared/types/models';

interface AchievementGalleryProps {
  images: Media[];
  title: string;
  /** Index of the image that was opened; `null` keeps the gallery closed. */
  openIndex: number | null;
  onClose: () => void;
}

/**
 * Full-size view of an achievement's images. The thumbnails only ever fit side
 * by side, so there was nothing to swipe through until one is opened here:
 * drag/swipe, the arrow buttons and the arrow keys all move between images.
 */
export function AchievementGallery({
  images,
  title,
  openIndex,
  onClose,
}: AchievementGalleryProps) {
  const [current, setCurrent] = useState(openIndex ?? 0);

  return (
    <Dialog
      open={openIndex !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        // No description to point at: the title and the counter say it all.
        aria-describedby={undefined}
        className="w-[calc(100vw-1.5rem)] max-w-4xl gap-3 p-3 md:p-4"
      >
        <DialogTitle className="truncate pr-10 text-sm font-medium md:text-base">
          {title}
        </DialogTitle>

        {openIndex !== null && (
          <Carousel
            opts={{ startIndex: openIndex }}
            setApi={(api) => {
              if (!api) return;
              setCurrent(api.selectedScrollSnap());
              api.on('select', () => setCurrent(api.selectedScrollSnap()));
            }}
          >
            <CarouselContent className="-ml-0">
              {images.map((img, i) => (
                <CarouselItem key={img.id} className="pl-0">
                  <div className="relative h-[60vh] w-full overflow-hidden rounded-md bg-muted/40 md:h-[70vh]">
                    <Image
                      src={img.url}
                      alt={`${title} (${i + 1}/${images.length})`}
                      fill
                      sizes="(min-width: 896px) 896px, 100vw"
                      className="object-contain"
                      priority={i === openIndex}
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>

            {images.length > 1 && (
              <>
                <CarouselPrevious className="left-2 bg-background/80 backdrop-blur-none" />
                <CarouselNext className="right-2 bg-background/80 backdrop-blur-none" />
              </>
            )}
          </Carousel>
        )}

        {images.length > 1 && (
          <p
            aria-live="polite"
            className="text-center text-xs tabular-nums text-muted-foreground"
          >
            {current + 1} / {images.length}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
