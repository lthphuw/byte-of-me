import { TagIcon } from 'lucide-react';

import type { PublicBlog } from '@/entities/blog';
import { Link } from '@/shared/i18n/navigation';
import { Badge , RichText } from '@/shared/ui';





export function BlogContent({ blog }: { blog: PublicBlog }) {
  return (
    <div className="space-y-12">
      {/*{blog.coverImage && (*/}
      {/*  <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl border bg-muted">*/}
      {/*    <Image*/}
      {/*      src={blog.coverImage.url}*/}
      {/*      alt={blog.title}*/}
      {/*      fill*/}
      {/*      priority*/}
      {/*      className="object-cover"*/}
      {/*    />*/}
      {/*  </div>*/}
      {/*)}*/}
      {/*<div className="flex flex-wrap gap-2">*/}
      {/*  {blog.tags.map((tag) => (*/}
      {/*    <Link key={tag.id} href={`/blogs?tags=${tag.slug}`}>*/}
      {/*      <Badge variant="secondary" className="rounded-full px-4 py-2">*/}
      {/*        <TagIcon className="mr-1.5 h-3 w-3" /> {tag.name}*/}
      {/*      </Badge>*/}
      {/*    </Link>*/}
      {/*  ))}*/}
      {/*</div>*/}

      <article className="w-full overflow-hidden break-words md:max-w-none">
        <RichText content={blog.content} />
      </article>

      <div className="flex flex-wrap gap-2">
        {blog.tags.map((tag) => (
          <Link key={tag.id} href={`/blogs?tags=${tag.slug}`}>
            <Badge variant="secondary" className="rounded-full px-4 py-2">
              <TagIcon className="mr-1.5 h-3 w-3" /> {tag.name}
            </Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}
