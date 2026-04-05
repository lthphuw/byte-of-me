'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Education } from '@/models/education';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { RichText } from '@/components/rich-text';

export function EducationSection({ educations }: { educations: Education[] }) {
  const [images, setImages] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const [currentSlides, setCurrentSlides] = useState<{ [key: string]: number }>(
    {}
  );

  const openGallery = (imgs: string[], i: number) => {
    setImages(imgs);
    setIndex(i);
    setIsOpen(true);
  };

  const prev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIndex((i) => (i === 0 ? images.length - 1 : i - 1));
  };

  const next = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIndex((i) => (i === images.length - 1 ? 0 : i + 1));
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, images.length]);

  return (
    <div className="space-y-8">
      {educations.map((edu) => (
        <div key={edu.id} className="space-y-3">
          {/* Header */}
          <div className="flex items-center gap-3">
            {edu.logo && (
              <Image
                src={edu.logo.url}
                alt={edu.title}
                width={36}
                height={36}
                className="rounded-md object-contain"
              />
            )}
            <div>
              <h3 className="font-semibold text-lg">{edu.title}</h3>
              <p className="text-sm text-muted-foreground">
                {new Date(edu.startDate).getFullYear()} -{' '}
                {edu.endDate ? new Date(edu.endDate).getFullYear() : 'Present'}
              </p>
            </div>
          </div>

          {edu.description && <RichText content={edu.description} />}

          {/* Achievements */}
          {edu.achievements.length > 0 && (
            <div className="pl-4 border-l space-y-4">
              {edu.achievements.map((a) => {
                const urls = a.images.map((i) => i.url);
                const currentSlide = currentSlides[a.id] || 0;

                return (
                  <div key={a.id} className="space-y-2">
                    <h4 className="font-medium">{a.title}</h4>
                    {a.content && (
                      <article className="text-sm text-muted-foreground leading-relaxed break-words overflow-hidden">
                        {a.content}
                      </article>
                    )}

                    {/* Desktop: Scrollable Thumbnails */}
                    <ScrollArea className="hidden md:block max-w-full pb-2">
                      <div className="flex w-max space-x-4">
                        {a.images.map((img, i) => (
                          <button
                            key={img.id}
                            onClick={() => openGallery(urls, i)}
                            className="relative w-28 sm:w-36 md:w-40 aspect-[4/3] rounded-md overflow-hidden shrink-0"
                          >
                            <Image
                              src={img.url}
                              alt={a.title}
                              fill
                              className="object-cover"
                            />
                          </button>
                        ))}
                      </div>
                      <ScrollBar orientation="horizontal" />
                    </ScrollArea>

                    {/* Mobile: Instagram/Threads Style Swiper */}
                    {a.images.length > 0 && (
                      <div className="block md:hidden relative max-w-[320px] mx-auto sm:max-w-full">
                        <Carousel
                          setApi={(api) => {
                            if (!api) return;
                            // Only attach the listener once to avoid duplicate loops
                            api.on('select', () => {
                              setCurrentSlides((prev) => {
                                const newIndex = api.selectedScrollSnap();
                                // Avoid updating state if the index hasn't changed
                                if (prev[a.id] === newIndex) return prev;
                                return { ...prev, [a.id]: newIndex };
                              });
                            });
                          }}
                          className="w-full"
                        >
                          <CarouselContent>
                            {a.images.map((img, i) => (
                              <CarouselItem key={img.id}>
                                <button
                                  onClick={() => openGallery(urls, i)}
                                  className="relative w-full aspect-[4/3] rounded-xl overflow-hidden"
                                >
                                  <Image
                                    src={img.url}
                                    alt={a.title}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 100vw, 33vw"
                                  />
                                </button>
                              </CarouselItem>
                            ))}
                          </CarouselContent>

                          {/* Dot Indicators */}
                          {a.images.length > 1 && (
                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 items-center justify-center bg-black/40 px-2.5 py-1.5 rounded-full backdrop-blur-sm">
                              {a.images.map((_, i) => (
                                <div
                                  key={i}
                                  className={`rounded-full transition-all duration-200 ${
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
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {/* Lightbox / Gallery Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          className="
            w-screen h-[100dvh]
            max-w-none p-0
            bg-black border-none shadow-none
            flex flex-col
            [&>button]:hidden
          "
        >
          <div className="relative flex-1 flex items-center justify-center overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-black/70 to-transparent z-20" />
            <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-black/70 to-transparent z-20" />

            {/* Close */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-30 text-white"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>

            {/* Main Image */}
            {images.length > 0 && (
              <div className="relative w-full h-full">
                <Image
                  src={images[index]}
                  alt="Gallery image"
                  fill
                  className="object-contain"
                  sizes="100vw"
                  priority
                />
              </div>
            )}

            {/* Navigation */}
            {images.length > 1 && (
              <>
                <button
                  onClick={prev}
                  className="
                    absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30
                    p-3 sm:p-4
                    text-white bg-black/30 hover:bg-black/50
                    rounded-full
                  "
                >
                  <ChevronLeft className="h-6 w-6 sm:h-8 sm:w-8" />
                </button>

                <button
                  onClick={next}
                  className="
                    absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30
                    p-3 sm:p-4
                    text-white bg-black/30 hover:bg-black/50
                    rounded-full
                  "
                >
                  <ChevronRight className="h-6 w-6 sm:h-8 sm:w-8" />
                </button>

                {/* Counter */}
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 text-xs sm:text-sm text-white bg-black/40 px-3 py-1 rounded-full">
                  {index + 1} / {images.length}
                </div>
              </>
            )}
          </div>

          {/* Thumbnail strip */}
          {images.length > 1 && (
            <div className="w-full px-2 sm:px-4 pb-3 z-30">
              <div className="flex gap-2 align-middle items-center overflow-x-auto scrollbar-hide">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setIndex(i)}
                    className={`
                      relative shrink-0
                      w-14 h-14 sm:w-16 sm:h-16
                      rounded-md overflow-hidden
                      border-2
                      ${
                        i === index
                          ? 'border-white'
                          : 'border-transparent opacity-60'
                      }
                    `}
                  >
                    <Image
                      src={img}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
