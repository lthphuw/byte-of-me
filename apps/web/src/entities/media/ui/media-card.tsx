'use client';

import * as React from 'react';
import { Card, CardContent , CopyButton , DeleteButton } from '@byte-of-me/ui';
import { FileIcon } from 'lucide-react';
import Image from 'next/image';

import { cn, formatImageSize } from '@/shared/lib/utils';
import type { Media } from '@/shared/types/models';

export interface MediaCardProps {
  media: Media;
  onDeleteMedia?: (id: string) => void;
  isDeleting?: boolean;
  className?: string;
  /**
   * Accessible name for the icon-only delete action. Passed in rather than
   * translated here: this is an `entities/` component and must not decide
   * which `dashboard.*` namespace owns the copy (same rule as
   * `useMediaLibrary`'s toast messages).
   */
  deleteLabel?: string;
}

export function MediaCard({
  media,
  onDeleteMedia,
  isDeleting,
  className,
  deleteLabel,
}: MediaCardProps) {
  const isImage = media.mimeType.startsWith('image/');

  return (
    <Card
      className={cn(
        'group relative aspect-square overflow-hidden border-none bg-muted/40 transition-all duration-300 hover:ring-2 hover:ring-primary/20',
        className
      )}
    >
      <CardContent className="h-full p-0">
        {/* Media Container */}
        <div className="relative h-full w-full overflow-hidden bg-muted">
          {isImage ? (
            <Image
              src={media.url}
              alt={media.fileName}
              fill
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 15vw"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2">
              <FileIcon className="h-10 w-10 text-muted-foreground/40 transition-transform group-hover:scale-110" />
              <span className="text-[10px] font-medium uppercase tracking-tighter text-muted-foreground">
                {media.mimeType.split('/')[1] || 'File'}
              </span>
            </div>
          )}

          {/* Action Overlay. Hover-revealed only from `sm`: on touch there is
              no hover, so an `opacity-0` overlay stayed invisible yet
              hit-testable and a tap could fire an unseen Delete.
              `focus-within` covers the keyboard path. */}
          <div className="absolute inset-0 z-20 flex flex-col justify-between bg-black/40 p-2 transition-opacity duration-200 sm:opacity-0 sm:focus-within:opacity-100 sm:group-hover:opacity-100">
            {/* Top Toolbar */}
            <div className="flex justify-end gap-1.5">
              <CopyButton
                content={media.url}
              />

              {onDeleteMedia && (
                <DeleteButton
                  isSubmitting={isDeleting}
                  label={deleteLabel}
                  onClick={() => {
                    onDeleteMedia(media.id);
                  }}
                />
              )}
            </div>

            {/* Bottom Info Section */}
            <div className="transition-transform duration-300 sm:translate-y-2 sm:group-hover:translate-y-0">
              <p className="truncate text-[11px] font-semibold leading-tight text-white drop-shadow-md">
                {media.fileName}
              </p>
              <p className="mt-0.5 text-[9px] font-medium text-white/80">
                {formatImageSize(media.size)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
