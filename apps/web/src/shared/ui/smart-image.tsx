'use client';

import type { ImageProps } from 'next/image';
import Image from 'next/image';
import { useState } from 'react';

import { cn } from '@/shared/lib/utils';

interface SmartImageProps extends ImageProps {
  containerClassName?: string;
}

export function SmartImage({
  src,
  alt,
  className,
  containerClassName,
  ...props
}: SmartImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  return (
    <div
      className={cn('relative overflow-hidden bg-muted', containerClassName)}
    >
      {(isLoading || isError) && (
        <Image
          src="/images/placeholders/placeholder.jpg"
          alt="Loading..."
          fill
          className="z-0 object-cover"
          priority
        />
      )}

      {!isError && (
        <Image
          {...props}
          src={src}
          alt={alt}
          className={cn(
            'relative z-10 object-cover duration-500',
            isLoading ? 'opacity-0' : 'opacity-100',
            className
          )}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setIsError(true);
          }}
        />
      )}
    </div>
  );
}
