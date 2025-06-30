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

  const [cardWidth, setCardWidth] = useState(0);

  const defaultImage = images.at(-1);
  const [selectedImage, setSelectedImage] = useState(defaultImage?.id ?? '');
  const [caption, setCaption] = useState(defaultImage?.caption ?? '');

  // Update width based on container resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      const usableWidth = entry.contentRect.width;
      setCardWidth(Math.min(usableWidth, 720));
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Update caption based on selected image
  useEffect(() => {
    const found = images.find((img) => img.id === selectedImage);
    setCaption(found?.caption ?? images[0]?.caption ?? '');
  }, [selectedImage, images]);

  return (
    <figure
      ref={containerRef}
      className="flex w-full flex-col items-start gap-4 md:gap-6 overflow-visible"
    >
      <div className={cn('relative w-full', !mounted && 'hidden')}>
        <ImageStack
          randomRotation={false}
          sensitivity={200}
          sendToBackOnClick
          cardDimensions={{
            width: cardWidth,
            height: Math.floor((cardWidth * 2) / 3),
          }}
          cardsData={images}
          setSelectedCard={setSelectedImage}
        />
      </div>

      {caption && (
        <figcaption className="article-text text-sm italic">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
