'use client';

import { cn } from '@/shared/lib/utils';
import { Carousel, CarouselContent, CarouselItem } from '@/shared/ui/carousel';
import { ScrollArea, ScrollBar } from '@/shared/ui/scroll-area';

import Image from 'next/image';

export function AchievementImages({
  images,
  urls,
  title,
  currentSlide,
  onSlideChange,
  onOpenGallery,
}: any) {
  if (!images?.length) return null;

  return (
    <>
      {/* Desktop */}
      <ScrollArea className="hidden max-w-full pb-2 md:block">
        <div className="flex w-max space-x-4">
          {images.map((img: any, i: number) => (
            <button
              key={img.id}
              onClick={() => onOpenGallery(urls, i)}
              className="relative aspect-[4/3] w-40 shrink-0 overflow-hidden rounded-md"
            >
              <Image src={img.url} alt={title} fill className="object-cover" />
            </button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Mobile */}
      <div className="relative block md:hidden">
        <Carousel
          className=""
          setApi={(api) => {
            if (!api) return;
            api.on('select', () => {
              onSlideChange(api.selectedScrollSnap());
            });
          }}
        >
          <CarouselContent className="-ml-3">
            {images.map((img: any, i: number) => (
              <CarouselItem
                key={img.id}
                className={cn(
                  'pl-3',
                  images.length === 1 ? 'basis-full' : 'basis-[90%]'
                )}
              >
                <button
                  onClick={() => onOpenGallery(urls, i)}
                  className="relative aspect-[4/3] w-full overflow-hidden rounded-xl"
                >
                  <Image
                    src={img.url}
                    alt={title}
                    fill
                    className="object-cover"
                  />
                </button>
              </CarouselItem>
            ))}
          </CarouselContent>

          {/* Dots */}
          {images.length > 1 && (
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1.5">
              {images.map((_: any, i: number) => (
                <div
                  key={i}
                  className={`rounded-full ${
                    i === currentSlide
                      ? 'h-2 w-2 bg-white'
                      : 'h-1.5 w-1.5 bg-white/50'
                  }`}
                />
              ))}
            </div>
          )}
        </Carousel>
      </div>
    </>
  );
}
