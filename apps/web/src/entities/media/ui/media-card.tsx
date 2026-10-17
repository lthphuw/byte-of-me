'use client';

import * as React from 'react';
import { Card, CardContent, CopyButton, DeleteButton } from '@byte-of-me/ui';
import { FileIcon, Play } from 'lucide-react';
import Image from 'next/image';

import { cn, formatImageSize } from '@/shared/lib/utils';
import type { Media } from '@/shared/types/models';

interface MediaCardProps {
  media: Media;
  onDeleteMedia?: (id: string) => void;
  isDeleting?: boolean;
  className?: string;
  /**
   * Accessible names for the icon-only actions. Passed in rather than
   * translated here: this is an `entities/` component and must not decide
   * which namespace owns the copy (same rule as `useMediaLibrary`'s toast
   * messages).
   */
  deleteLabel?: string;
  copyLabel: string;
  copiedLabel: string;
}

export function MediaCard({
  media,
  onDeleteMedia,
  isDeleting,
  className,
  deleteLabel,
  copyLabel,
  copiedLabel,
}: MediaCardProps) {
  const isImage = media.mimeType.startsWith('image/');
  const isVideo = media.mimeType.startsWith('video/');

  return (
    <Card
      className={cn(
        'group relative aspect-square overflow-hidden border-none bg-muted/40 transition-shadow duration-300 hover:ring-2 hover:ring-primary/20',
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
          ) : isVideo ? (
            <>
              {/* Metadata only, no controls: the first frame is the thumbnail
                  (`#t=0.1` asks for it), and the card's actions stay the only buttons. */}
              <video
                src={`${media.url}#t=0.1`}
                aria-label={media.fileName}
                preload="metadata"
                muted
                playsInline
                className="h-full w-full object-cover"
              />
              <Play
                aria-hidden
                className="absolute bottom-2 left-2 size-4 fill-background text-background drop-shadow-md"
              />
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2">
              <FileIcon className="h-10 w-10 text-muted-foreground/40 transition-transform group-hover:scale-110" />
              <span className="text-[10px] font-medium uppercase tracking-tighter text-muted-foreground">
                {media.mimeType.split('/')[1] ?? media.mimeType}
              </span>
            </div>
          )}

          {/* Action Overlay. Always shown: a hover-only overlay left the buttons
              out of reach on touch and invisible to the keyboard. */}
          <div className="absolute inset-0 z-20 flex flex-col justify-between bg-foreground/60 p-2 text-background">
            {/* Top Toolbar */}
            <div className="flex justify-end gap-2">
              <CopyButton
                content={media.url}
                label={copyLabel}
                copiedLabel={copiedLabel}
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
            <div>
              <p className="truncate text-[11px] font-semibold leading-tight drop-shadow-md">
                {media.fileName}
              </p>
              <p className="mt-0.5 text-[9px] font-medium opacity-80">
                {formatImageSize(media.size)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
