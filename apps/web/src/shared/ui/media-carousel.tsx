'use client';

import { type ReactNode, useState } from 'react';
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  useEmblaState,
} from '@byte-of-me/ui';
import { useTranslations } from 'next-intl';

import {
  MEDIA_SLIDE,
  MEDIA_TRACK,
  mediaSlideBasis,
} from './media-carousel-classes';

import { cn } from '@/shared/lib/utils';

interface MediaCarouselSlide {
  /** Stable across renders: it is the slide's React key. */
  id: string;
  node: ReactNode;
}

interface MediaCarouselProps {
  slides: MediaCarouselSlide[];
  /** A lone slide fills the row from md too, instead of the narrower width a pair's slide has. */
  fillSingle?: boolean;
  className?: string;
}

/**
 * Photos or clips as one carousel at every width; the next slide peeks in to invite a swipe.
 * A slide brings its own frame and size; this owns the track, gutter, arrows (md+) and dots.
 * A slide that pins itself to the viewport sets `data-media-pinned` while it does.
 */
export function MediaCarousel({
  slides,
  fillSingle = false,
  className,
}: MediaCarouselProps) {
  const t = useTranslations('components.mediaCarousel');
  const [api, setApi] = useState<CarouselApi>();
  const { selectedIndex } = useEmblaState(api);

  if (slides.length === 0) return null;

  const several = slides.length > 1;
  const basis = mediaSlideBasis(slides.length, fillSingle);

  return (
    <Carousel setApi={setApi} className={className}>
      <CarouselContent
        className={cn(
          MEDIA_TRACK,
          'md:cursor-grab md:active:cursor-grabbing',
          // Embla's track transform makes it the containing block of `position: fixed`
          // descendants, so a full-screen clip would stay inside the carousel; a slide marked
          // `data-media-pinned` makes the track drop its transform while it is pinned.
          'has-[[data-media-pinned]]:!transform-none'
        )}
      >
        {slides.map((slide) => (
          <CarouselItem key={slide.id} className={cn(MEDIA_SLIDE, basis)}>
            {slide.node}
          </CarouselItem>
        ))}
      </CarouselContent>

      {several && (
        <>
          <CarouselPrevious
            label={t('previous')}
            className="left-2 hidden bg-background/80 md:inline-flex"
          />
          <CarouselNext
            label={t('next')}
            className="right-2 hidden bg-background/80 md:inline-flex"
          />

          <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-background/80 px-2.5 py-1.5">
            {slides.map((slide, i) => (
              <div
                key={slide.id}
                className={cn(
                  'rounded-full',
                  i === selectedIndex
                    ? 'h-2 w-2 bg-foreground'
                    : 'h-1.5 w-1.5 bg-foreground/40'
                )}
              />
            ))}
          </div>
        </>
      )}
    </Carousel>
  );
}
