'use client';

import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';
import { useMounted } from '@/hooks/use-mounted';

import ImageStack from './image-stack';

export interface ImagesProps {
  id: string;
  src: string;
  alt?: string;
  caption?: string;
}

export interface ProfileBannerProps {
  images: ImagesProps[];
}

export function ProfileBanner({ images }: ProfileBannerProps) {
  const mounted = useMounted();
  const containerRef = useRef<HTMLDivElement>(null);

  const [cardWidth, setCardWidth] = useState<number | null>(null);
  const defaultImage = images.at(-1);

  const [selectedImage, setSelectedImage] = useState(
    defaultImage?.id ?? ''
  );

  const caption =
    images.find((img) => img.id === selectedImage)?.caption ??
    images[0]?.caption ??
    '';

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(([entry]) => {
      const usableWidth = entry.contentRect.width;
      setCardWidth(Math.min(usableWidth, 720));
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);
  return (
    <figure
      ref={containerRef}
      className="flex w-full flex-col items-start gap-4 md:gap-6"
    >
      {/* Layout reservation */}
      <div
        className="relative w-full overflow-visible"
        style={{
          aspectRatio: '5 / 4',
          maxWidth: 720,
        }}
      >
        {mounted && cardWidth && (
          <ImageStack
            randomRotation={false}
            sensitivity={100}
            sendToBackOnClick
            cardDimensions={{
              width: cardWidth,
              height: Math.floor((cardWidth * 4) / 5),
            }}
            cardsData={images}
            setSelectedCard={setSelectedImage}
          />
        )}
      </div>

      {caption && (
        <figcaption
          className={cn(
            'text-sm italic text-muted-foreground',
            'min-h-[2.5em]',
            'line-clamp-2'
          )}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
