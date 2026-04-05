// components/blog/blog-card.tsx

import Image from 'next/image';
import { format } from 'date-fns';
import { Calendar, Eye, EyeOff, Pencil, Trash2 } from 'lucide-react';

import { BlogDetails } from '@/lib/actions/dashboard/blog/get-paginated-blogs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { ImagePlaceholder } from '@/components/ui/image-placeholder';

interface BlogCardProps {
  blog: BlogDetails;
  onEdit: (blog: BlogDetails) => void;
  onDelete: (id: string) => void;
}

export function BlogEditorCard({ blog, onEdit, onDelete }: BlogCardProps) {
  const mainTranslation = blog.translations?.[0];
  const coverImageUrl = blog.coverImage?.url;

  return (
    <Card className="overflow-hidden flex flex-col h-full hover:shadow-md transition-all group border-muted-foreground/10">
      {/* Aspect Ratio Container for Image */}
      <div className="relative aspect-video w-full overflow-hidden border-b">
        {coverImageUrl ? (
          <Image
            src={coverImageUrl}
            alt={mainTranslation?.title || 'Blog cover'}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <ImagePlaceholder text="No Cover" />
        )}

        <div className="absolute top-2 right-2">
          <Badge
            variant={blog.isPublished ? 'default' : 'secondary'}
            className="backdrop-blur-md bg-opacity-80 font-medium"
          >
            {blog.isPublished ? (
              <>
                <Eye className="w-3 h-3 mr-1" /> Published
              </>
            ) : (
              <>
                <EyeOff className="w-3 h-3 mr-1" /> Draft
              </>
            )}
          </Badge>
        </div>
      </div>

      <CardHeader className="p-4 pb-2 space-y-1">
        <h3 className="font-bold leading-tight line-clamp-2 min-h-[2.5rem] group-hover:text-primary transition-colors">
          {mainTranslation?.title || 'Untitled Blog'}
        </h3>
        <p className="text-[11px] text-muted-foreground font-mono truncate bg-muted/50 w-fit px-1 rounded">
          /{blog.slug}
        </p>
      </CardHeader>

      <CardContent className="p-4 pt-0 flex-grow">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {mainTranslation?.description ||
            'No description provided for this blog post.'}
        </p>

        {/* Render Tags if they exist */}
        <div className="flex flex-wrap gap-1.5 mt-auto">
          {blog.tags?.map((t: any) => (
            <Badge
              key={t.tagId}
              variant="outline"
              className="text-[10px] py-0 px-2 font-normal"
            >
              {(t.tag?.translations?.[0] as any)?.name || t.tag?.id}
            </Badge>
          ))}
        </div>
      </CardContent>

      <CardFooter className="p-3 border-t bg-muted/5 flex items-center justify-between">
        {blog.publishedDate && (
          <div className="flex items-center text-muted-foreground text-[11px]">
            <Calendar className="w-3.5 h-3.5 mr-1" />
            {format(new Date(blog.publishedDate), 'MMM dd, yyyy')}
          </div>
        )}

        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
            onClick={() => onEdit(blog)}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(blog.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
