'use client';

import { format } from 'date-fns';
import {
  ArrowRight,
  Calendar,
  Clock,
  Layers,
  Tag as TagIcon,
} from 'lucide-react';
import Link from 'next/link';

import type { PublicBlog } from '@/entities/blog/model/types';
import { Badge } from '@/shared/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/shared/ui/card';

interface BlogCardProps {
  blog: PublicBlog;
  onTagClick?: (slug: string) => void;
}

export function BlogCard({ blog, onTagClick }: BlogCardProps) {
  return (
    <Card className="hover:border-primary/50 group flex flex-col overflow-hidden border-2 transition-all hover:shadow-xl">
      {/* Cover Image Area */}
      <Link
        href={`/blogs/${blog.slug}`}
        className="bg-muted relative aspect-video overflow-hidden"
      >
        {blog.coverImage ? (
          <img
            src={blog.coverImage.url}
            alt={blog.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Layers className="text-muted-foreground/20 h-12 w-12" />
          </div>
        )}

        {/* PublicProject Badge Overlay */}
        {blog.project && (
          <div className="absolute left-3 top-3">
            <Badge
              variant="secondary"
              className="bg-background/90 shadow-sm backdrop-blur-sm"
            >
              Project: {blog.project.title}
            </Badge>
          </div>
        )}
      </Link>

      <CardHeader className="space-y-2 p-4">
        {/* Metadata */}
        <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-wider">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {blog.publishedDate
              ? format(new Date(blog.publishedDate), 'MMM dd, yyyy')
              : 'Draft'}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {blog.readingTime || 5} min read
          </div>
        </div>

        {/* Title & Description */}
        <Link
          href={`/blogs/${blog.slug}`}
          className="group-hover:text-primary block transition-colors"
        >
          <h3 className="line-clamp-2 text-xl font-bold leading-tight">
            {blog.title}
          </h3>
        </Link>
        <p className="text-muted-foreground line-clamp-3 text-sm">
          {blog.description}
        </p>
      </CardHeader>

      <CardContent className="mt-auto px-4 pb-4">
        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {blog.tags.map((tag) => (
            <button
              key={tag.id}
              onClick={(e) => {
                e.preventDefault();
                onTagClick?.(tag.slug);
              }}
              className="bg-primary/5 text-primary hover:bg-primary/10 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors"
            >
              <TagIcon className="h-2 w-2" />
              {tag.name}
            </button>
          ))}
        </div>
      </CardContent>

      <CardFooter className="bg-muted/30 border-t p-4">
        <Link
          href={`/blogs/${blog.slug}`}
          className="text-primary inline-flex items-center gap-2 text-sm font-semibold transition-all hover:gap-3"
        >
          Read article
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardFooter>
    </Card>
  );
}
