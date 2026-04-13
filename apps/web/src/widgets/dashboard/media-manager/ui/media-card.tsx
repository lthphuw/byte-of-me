import * as React from 'react';
import { cn, formatImageSize } from '@/shared/lib/utils';
import type { Media } from '@/shared/types/models';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { CopyButton } from '@/shared/ui/copy-button';
import { Icons } from '@/shared/ui/icons';

import { FileIcon, Trash2 } from 'lucide-react';
import Image from 'next/image';

export interface MediaCardProps {
  media: Media;
  onDeleteMedia?: (id: string) => void;
  isDeleting?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function MediaCard({
  media,
  onDeleteMedia,
  isDeleting,
  className,
  style,
}: MediaCardProps) {
  const isImage = media.mimeType.startsWith('image/');

  return (
    <Card
      key={media.id}
      className={cn(
        'group relative overflow-hidden border-none bg-secondary/30 transition-all hover:bg-secondary/50',
        className
      )}
      style={style}
    >
      <CardContent className="p-0">
        <div className="relative aspect-square overflow-hidden">
          {isImage ? (
            <Image
              src={media.url}
              alt={media.fileName}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, 20vw"
            />
          ) : (
            <div className="bg-muted/50 flex h-full items-center justify-center">
              <FileIcon className="text-muted-foreground/50 h-10 w-10" />
            </div>
          )}

          {/* Action Overlay */}
          <div
            className={cn(
              'absolute inset-0 z-10 flex items-start justify-end p-2',
              'bg-black/0 transition-colors duration-200 group-hover:bg-black/20'
            )}
          >
            <div className="flex gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              {/* Copy Button */}
              <CopyButton
                content={media.url}
                className="h-8 w-8 border-none shadow-sm"
              />

              {/* Delete Button */}
              {onDeleteMedia && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shadow-sm"
                  disabled={isDeleting}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDeleteMedia(media.id);
                  }}
                >
                  {isDeleting && (
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Metadata Footer (Minimalist Overlay) */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 pt-8 opacity-0 transition-opacity group-hover:opacity-100">
            <p className="truncate text-[11px] font-medium text-white">
              {media.fileName}
            </p>
            <p className="text-[10px] text-white/70">
              {formatImageSize(media.size)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
