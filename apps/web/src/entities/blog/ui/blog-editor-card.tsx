import type { AdminBlog } from '@/entities/blog';
import { formatDate } from '@/shared/lib/utils';
import { Badge } from '@/shared/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/shared/ui/card';
import { DeleteButton } from '@/shared/ui/delete-button';
import { EditButton } from '@/shared/ui/edit-button';
import { ImagePlaceholder } from '@/shared/ui/image-placeholder';

import { Calendar, Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';

interface BlogCardProps {
  blog: AdminBlog;
  onEdit: (blog: AdminBlog) => void;
  onDelete: (id: string) => void;
  isPending?: boolean;
}

export function BlogEditorCard({ blog, onEdit, onDelete, isPending }: BlogCardProps) {
  const mainTranslation = blog.translations?.[0];
  const coverImageUrl = blog.coverImage?.url;

  return (
    <Card className="border-muted-foreground/10 group flex h-full flex-col overflow-hidden transition-all hover:shadow-md">
      {/* Aspect Ratio Container for Image */}
      <div className="relative aspect-video w-full overflow-hidden border-b">
        {coverImageUrl ? (
          <Image
            src={coverImageUrl}
            alt={mainTranslation?.title || 'PublicBlog cover'}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <ImagePlaceholder text="No Cover" />
        )}

        <div className="absolute right-2 top-2">
          <Badge
            variant={blog.isPublished ? 'default' : 'secondary'}
            className="bg-opacity-80 font-medium backdrop-blur-md"
          >
            {blog.isPublished ? (
              <>
                <Eye className="mr-1 h-3 w-3" /> Published
              </>
            ) : (
              <>
                <EyeOff className="mr-1 h-3 w-3" /> Draft
              </>
            )}
          </Badge>
        </div>
      </div>

      <CardHeader className="space-y-1 p-4 pb-2">
        <h3 className="group-hover:text-primary line-clamp-2 min-h-[2.5rem] font-bold leading-tight transition-colors">
          {mainTranslation?.title || 'Untitled PublicBlog'}
        </h3>
        <p className="bg-muted/50 text-muted-foreground w-fit truncate rounded px-1 font-mono text-[11px]">
          /{blog.slug}
        </p>
      </CardHeader>

      <CardContent className="flex-grow p-4 pt-0">
        <p className="text-muted-foreground mb-4 line-clamp-2 text-sm">
          {mainTranslation?.description ||
            'No description provided for this blog post.'}
        </p>

        <div className="mt-auto flex flex-wrap gap-1.5">
          {blog.tags?.map((t) => (
            <Badge
              key={t.tagId}
              variant="outline"
              className="px-2 py-0 text-[10px] font-normal"
            >
              {(t.tag?.translations?.[0])?.name || t.tag?.id}
            </Badge>
          ))}
        </div>
      </CardContent>

      <CardFooter className="bg-muted/5 flex items-center justify-between border-t p-3">
        {blog.publishedDate && (
          <div className="text-muted-foreground flex items-center text-[11px]">
            <Calendar className="mr-1 h-3.5 w-3.5" />
            {formatDate(blog.publishedDate)}
          </div>
        )}

        <div className="flex gap-1">
          <EditButton
            isSubmitting={isPending}
            onClick={() => onEdit(blog)}

          />
          <DeleteButton
            isSubmitting={isPending}
            onClick={() => onDelete(blog.id)}
          />
        </div>
      </CardFooter>
    </Card>
  );
}
