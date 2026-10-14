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

export interface MediaCarouselSlide {
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
 * Photos or clips as one carousel at every width, as the education gallery draws them.
 *
 * A slide is wide enough that the next one is only partly in view: it can be dragged or
 * swiped into place, and the arrows (md and up) and the dots do the same for a mouse. A slide
 * brings its own frame and its own size; this owns the track, the gutter, the arrows and the dots.
 * A slide that pins itself to the viewport sets `data-media-pinned` on the element while it does.
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
          // Embla moves the track with a transform, and a transformed box is the containing block
          // of its `position: fixed` descendants, so a slide that pins itself to the viewport
          // (a clip in full screen) would stay inside the carousel. A slide that does so marks
          // itself `data-media-pinned`, and the track drops its transform for as long as it does.
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
