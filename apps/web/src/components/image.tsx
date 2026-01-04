'use client';

import NextImage, { ImageProps as NextImageProps } from 'next/image';

import { IMAGE_PLACEHOLDER } from '@/config/image-placeholder';
import { cn } from '@/lib/utils';

export type ImageProps = NextImageProps;

export function Image({
  className,
  ...props
}: ImageProps) {

  return (
    <div className="relative w-full h-full overflow-hidden">
      <NextImage
        placeholder="blur"
        blurDataURL={IMAGE_PLACEHOLDER}
        className={cn(
          className
        )}
        {...props}
      />

    </div>
  );
}
