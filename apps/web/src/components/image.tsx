'use client';

import { useState } from 'react';
import NextImage, { ImageProps as NextImageProps } from 'next/image';

import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';





export interface ImageProps extends NextImageProps {
  showPlaceholder?: boolean;
}

export default function Image({
                                className,
                                showPlaceholder = true,
                                ...props
                              }: ImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <NextImage
        {...props}
        className={cn(
          'transition-opacity duration-300',
          loaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        onLoadingComplete={() => setLoaded(true)}
      />

      {showPlaceholder && !loaded && (
        <Skeleton className="absolute inset-0 w-full h-full z-0 bg-muted-foreground/10" />
      )}
    </div>
  );
}
