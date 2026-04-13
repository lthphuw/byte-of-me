import type { AdminBlog } from '@/entities/blog';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/shared/ui/card';
import { ImagePlaceholder } from '@/shared/ui/image-placeholder';

import { format } from 'date-fns';
import { Calendar, Eye, EyeOff, Pencil, Trash2 } from 'lucide-react';
import Image from 'next/image';

interface BlogCardProps {
  blog: AdminBlog;
  onEdit: (blog: AdminBlog) => void;
  onDelete: (id: string) => void;
}

export function BlogEditorCard({ blog, onEdit, onDelete }: BlogCardProps) {
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

        {/* Render Tags if they exist */}
        <div className="mt-auto flex flex-wrap gap-1.5">
          {blog.tags?.map((t: any) => (
            <Badge
              key={t.tagId}
              variant="outline"
              className="px-2 py-0 text-[10px] font-normal"
            >
              {(t.tag?.translations?.[0] as any)?.name || t.tag?.id}
            </Badge>
          ))}
        </div>
      </CardContent>

      <CardFooter className="bg-muted/5 flex items-center justify-between border-t p-3">
        {blog.publishedDate && (
          <div className="text-muted-foreground flex items-center text-[11px]">
            <Calendar className="mr-1 h-3.5 w-3.5" />
            {format(new Date(blog.publishedDate), 'MMM dd, yyyy')}
          </div>
        )}

        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="hover:bg-primary/10 hover:text-primary h-8 w-8"
            onClick={() => onEdit(blog)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="hover:bg-destructive/10 hover:text-destructive h-8 w-8"
            onClick={() => onDelete(blog.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
