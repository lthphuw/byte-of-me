import { RichText } from '@byte-of-me/ui';

import type { PublicBlog } from '@/entities/blog';

// `id` is the anchor target the table of contents scans for h2/h3 headings.
export function BlogContent({ blog }: { blog: PublicBlog }) {
  return (
    <div
      id="blog-article-content"
      className="w-full overflow-hidden break-words md:max-w-none"
    >
      <RichText content={blog.content} />
    </div>
  );
}
