'use client';

import Image from 'next/image';

import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

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
      <ScrollArea className="hidden md:block max-w-full pb-2">
        <div className="flex w-max space-x-4">
          {images.map((img: any, i: number) => (
            <button
              key={img.id}
              onClick={() => onOpenGallery(urls, i)}
              className="relative w-40 aspect-[4/3] rounded-md overflow-hidden shrink-0"
            >
              <Image src={img.url} alt={title} fill className="object-cover" />
            </button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Mobile */}
      <div className="block md:hidden relative">
        <Carousel
          setApi={(api) => {
            if (!api) return;
            api.on('select', () => {
              onSlideChange(api.selectedScrollSnap());
            });
          }}
        >
          <CarouselContent>
            {images.map((img: any, i: number) => (
              <CarouselItem key={img.id}>
                <button
                  onClick={() => onOpenGallery(urls, i)}
                  className="relative w-full aspect-[4/3] rounded-xl overflow-hidden"
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
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/40 px-2.5 py-1.5 rounded-full">
              {images.map((_: any, i: number) => (
                <div
                  key={i}
                  className={`rounded-full ${
                    i === currentSlide
                      ? 'w-2 h-2 bg-white'
                      : 'w-1.5 h-1.5 bg-white/50'
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
