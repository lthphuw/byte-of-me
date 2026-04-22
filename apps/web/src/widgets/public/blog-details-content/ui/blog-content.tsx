import { Tag as TagIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import type { PublicBlog } from '@/entities/blog';
import { Badge } from '@/shared/ui/badge';
import { RichText } from '@/shared/ui/rich-text';

export function BlogContent({ blog }: { blog: PublicBlog }) {
  return (
    <div className="space-y-6">
      {blog.coverImage && (
        <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl border bg-muted">
          <Image
            src={blog.coverImage.url}
            alt={blog.title}
            fill
            priority
            className="object-cover"
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {blog.tags.map((tag) => (
          <Link key={tag.id} href={`/blogs?tags=${tag.slug}`}>
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              <TagIcon className="mr-1.5 h-3 w-3" /> {tag.name}
            </Badge>
          </Link>
        ))}
      </div>

      <article className="w-full overflow-hidden break-words md:max-w-none">
        <RichText content={blog.content} />
      </article>
    </div>
  );
}
