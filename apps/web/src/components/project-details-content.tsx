'use client';

import { Link } from '@/i18n/navigation';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { a11yDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import { Pluggable } from 'unified';

import { useMediaQuery } from '@/hooks/use-media-query';
import { FloatingToc, TocItem } from '@/components/floating-toc';

import { Icons } from './icons';

export interface ProjectDetailsContentProps {
  readme: string;
  tocItems: TocItem[];
}
export function ProjectDetailsContent({
  readme,
  tocItems,
}: ProjectDetailsContentProps) {
  const isMobile = useMediaQuery('only screen and (max-width : 768px)');

  return (
    <>
      <div className="relative max-w-[100%] flex flex-col gap-4  md:gap-6 justify-center px-4 lg:px-8 py-12 max-w-full overflow-x-hidden">
        <Link
          href={'/projects'}
          className="flex items-center gap-3 px-0 justify-start"
        >
          <Icons.arrowLeft />
          <span>Back to projects</span>
        </Link>
        <article
          className="article-text prose dark:prose-invert max-w-full break-words overflow-x-hidden
  [&_pre]:whitespace-pre-wrap [&_pre]:break-words 
  [&_img]:max-w-full [&_img]:h-auto
  sm:max-w-[100vw] sm:overflow-x-auto"
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw as Pluggable, rehypeSlug]}
            components={
              !isMobile
                ? {
                    code(props) {
                      const { children, className, node, ref, ...rest } = props;
                      const match = /language-(\w+)/.exec(className || '');
                      return match ? (
                        <SyntaxHighlighter
                          {...rest}
                          PreTag="div"
                          children={String(children).replace(/\n$/, '')}
                          language={match[1]}
                          style={a11yDark}
                          customStyle={{ maxWidth: '100%', overflowX: 'auto' }}
                        />
                      ) : (
                        <code {...rest} className={className}>
                          {children}
                        </code>
                      );
                    },
                  }
                : {}
            }
          >
            {readme}
          </ReactMarkdown>
        </article>
      </div>

      <FloatingToc items={tocItems} />
    </>
  );
}
