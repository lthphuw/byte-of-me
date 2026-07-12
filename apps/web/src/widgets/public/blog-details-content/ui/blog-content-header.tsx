import { Suspense } from 'react';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Separator,
} from '@byte-of-me/ui';
import { Calendar, TagIcon } from 'lucide-react';
import Image from 'next/image';

import type { PublicBlog } from '@/entities/blog';
import { BlogLiveStats, BlogLiveStatsSkeleton } from '@/features/public';
import { Link } from '@/shared/i18n/navigation';
import { formatDate } from '@/shared/lib/utils';
import { BlogActionBar } from '@/widgets/public/blog-details-content/ui/blog-action-bar';

export function BlogContentHeader({ blog }: { blog: PublicBlog }) {
  const author = blog.author;

  return (
    <header className="w-full">
      {blog.coverImage && (
        <div className="relative mb-8 aspect-[2/1] w-full overflow-hidden rounded-2xl border bg-muted">
          <Image
            src={blog.coverImage.url}
            alt={blog.title}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
          />
        </div>
      )}

      {blog.tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {blog.tags.map((tag) => (
            <Link key={tag.id} href={`/blogs?tags=${tag.slug}`}>
              <Badge variant="secondary" className="gap-1 rounded-full">
                <TagIcon className="h-3 w-3" /> {tag.name}
              </Badge>
            </Link>
          ))}
        </div>
      )}

      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
        {blog.title}
      </h1>

      {blog.description && (
        <p className="mt-3 text-lg text-muted-foreground">{blog.description}</p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 pb-3 text-sm">
        {author?.name && (
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarImage src={author.avatar ?? undefined} alt={author.name} />
              <AvatarFallback>
                {author.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium text-foreground">{author.name}</span>
          </div>
        )}

        {author?.name && (
          <Separator orientation="vertical" className="hidden h-4 md:block" />
        )}

        {blog.publishedDate && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {formatDate(blog.publishedDate)}
          </div>
        )}

        <Separator orientation="vertical" className="hidden h-4 md:block" />

        <Suspense fallback={<BlogLiveStatsSkeleton />}>
          <BlogLiveStats blogId={blog.id} />
        </Suspense>
      </div>

      <BlogActionBar blogId={blog.id} blogSlug={blog.slug} title={blog.title} />
      <Separator className="mt-4" />
    </header>
  );
}
