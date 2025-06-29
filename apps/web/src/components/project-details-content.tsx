'use client';

import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import { Pluggable } from 'unified';

import { FloatingToc } from '@/components/floating-toc';

import { TocItem } from './floating-toc';

export interface ProjectDetailsContentProps {
  readme: string;
  tocItems: TocItem[];
}

export function ProjectDetailsContent({
  readme,
  tocItems,
}: ProjectDetailsContentProps) {
  return (
    <>
      <div className="relative flex justify-center px-4 lg:px-8 py-12">
        <article
          className="article-text prose dark:prose-invert max-w-none break-words overflow-x-auto
  [&_pre]:whitespace-pre-wrap [&_pre]:break-words 
  [&_img]:max-w-full [&_img]:h-auto"
        >
          <ReactMarkdown
            children={readme}
            remarkPlugins={[remarkGfm as Pluggable]}
            rehypePlugins={[rehypeRaw as Pluggable, rehypeSlug as Pluggable]}
          />
        </article>
      </div>

      <FloatingToc items={tocItems} />
    </>
  );
}
