import { Image } from '@/components/image';

export interface ImagesProps {
  id: string;
  src: string;
  alt?: string;
  caption?: string;
}

interface EditorialImageSectionProps {
  images: ImagesProps[];
}

export function EditorialImageSection({
                                        images,
                                      }: EditorialImageSectionProps) {
  const displayedImages = images.slice(0, 3);

  if (displayedImages.length === 0) return null;

  return (
    <section className="w-full overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 px-4 md:px-8 lg:px-12 py-12 md:py-20">
        <div className="md:col-span-8 relative aspect-[5/4] md:aspect-[4/3] overflow-hidden">
          <Image
            src={displayedImages[0].src}
            alt={displayedImages[0].alt || ''}
            className="w-full h-full object-cover transition-all duration-1000 ease-out"
            fill
          />

          {displayedImages[0].caption && (
            <figcaption className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-6 md:p-10">
              <p className="text-lg md:text-xl font-medium text-foreground leading-relaxed">
                {displayedImages[0].caption}
              </p>
            </figcaption>
          )}
        </div>

        {/* Cột phải - 2 ảnh nhỏ xếp dọc, chiếm 4/12 columns */}
        <div className="md:col-span-4 grid grid-rows-2 gap-6 md:gap-10">
          {displayedImages[1] && (
            <div className="relative aspect-[4/5] overflow-hidden">
              <Image
                src={displayedImages[1].src}
                alt={displayedImages[1].alt || ''}
                className="w-full h-full object-cover transition-all duration-1000 ease-out"
                fill
              />
              {displayedImages[1].caption && (
                <figcaption className="mt-4">
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                    {displayedImages[1].caption}
                  </p>
                </figcaption>
              )}
            </div>
          )}

          {displayedImages[2] && (
            <div className="relative aspect-[5/6] overflow-hidden">
              <Image
                src={displayedImages[2].src}
                alt={displayedImages[2].alt || ''}
                className="w-full h-full object-cover transition-all duration-1000 ease-out"
                fill
              />
              {displayedImages[2].caption && (
                <figcaption className="mt-4">
                  <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                    {displayedImages[2].caption}
                  </p>
                </figcaption>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
