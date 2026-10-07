'use client';

import type { PublicBlog } from '@/entities/blog/model/types';
import { BlogCard } from '@/entities/blog/ui/blog-card';
import { RevealItem } from '@/shared/ui';

// Two columns from md up, so the first row is the two cards above the fold.
const FIRST_ROW_COUNT = 2;

interface BlogsGridProps {
  blogs: PublicBlog[];
  /**
   * Whether the first row may play its entrance. The owner turns it off once
   * the first result set has shown, so a filter or page change never replays it.
   */
  playEntrance: boolean;
  /** The previous results, held on screen while the next set loads. */
  isStale: boolean;
  onTagClick: (slug: string) => void;
}

export function BlogsGrid({
  blogs,
  playEntrance,
  isStale,
  onTagClick,
}: BlogsGridProps) {
  return (
    // A page or filter swap is only this fade: its items mount without an
    // entrance, and the stale set is dimmed, never desaturated.
    <div
      className={`grid grid-cols-1 gap-6 transition-opacity duration-150 md:grid-cols-2 md:gap-10 ${
        isStale ? 'pointer-events-none opacity-50' : 'opacity-100'
      }`}
    >
      {blogs.map((blog, index) => {
        const isFirstRow = index < FIRST_ROW_COUNT;

        return (
          <RevealItem
            key={blog.id}
            index={index}
            immediate={isFirstRow}
            entrance={isFirstRow && playEntrance}
          >
            <BlogCard blog={blog} onTagClick={onTagClick} />
          </RevealItem>
        );
      })}
    </div>
  );
}
