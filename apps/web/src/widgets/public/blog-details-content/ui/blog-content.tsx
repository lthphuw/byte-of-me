import { MermaidBlocks } from '@byte-of-me/ui/mermaid-blocks';
import { RichText } from '@byte-of-me/ui/rich-text';

import type { PublicBlog } from '@/entities/blog';

// `id` is the anchor target the table of contents scans for h2/h3 headings.
export function BlogContent({ blog }: { blog: PublicBlog }) {
  return (
    <div
      id="blog-article-content"
      className="w-full overflow-hidden break-words md:max-w-none"
    >
      {/* RichText stays server-rendered; MermaidBlocks only swaps
          `language-mermaid` code blocks for drawn SVGs after hydration. */}
      <MermaidBlocks>
        <RichText content={blog.content} />
      </MermaidBlocks>
    </div>
  );
}
