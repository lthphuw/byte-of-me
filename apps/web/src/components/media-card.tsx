import Image from 'next/image';
import { Media } from '@/models/media';
import { FileIcon, Trash2 } from 'lucide-react';

import { cn, formatImageSize } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CopyButton } from '@/components/copy-button';





export interface MediaCardProps {
  media: Media;
  onDeleteMedia?: (id: string) => Promise<any>;
  className?: string;
  style?: React.CSSProperties;
}

export function MediaCard({
  media,
  onDeleteMedia,
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
            <div className="flex h-full items-center justify-center bg-muted/50">
              <FileIcon className="h-10 w-10 text-muted-foreground/50" />
            </div>
          )}

          {/* Action Overlay */}
          <div className={cn(
            "absolute inset-0 z-10 flex items-start justify-end p-2",
            "bg-black/0 transition-colors duration-200 group-hover:bg-black/20"
          )}>
            <div className="flex gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              {/* Copy Button */}
              <CopyButton
                content={media.url}
                className="h-8 w-8 text-neutral-900 border-none shadow-sm"
              />

              {/* Delete Button */}
              {onDeleteMedia && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shadow-sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDeleteMedia(media.id);
                  }}
                >
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
