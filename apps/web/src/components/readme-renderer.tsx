'use client';

import { Link } from '@/i18n/navigation';
import rangeParser from 'parse-numeric-range';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import { Pluggable } from 'unified';

import { Routes } from '@/config/global';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useTranslations } from '@/hooks/use-translations';
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
  const t = useTranslations('project');
  return (
    <>
      <div className="relative max-w-full flex flex-col gap-4 md:gap-6 justify-center px-4 lg:px-8 py-12 overflow-x-hidden">
        <Link
          href={Routes.Projects}
          className="flex items-center gap-3 px-0 justify-start"
        >
          <Icons.arrowLeft />
          <span>{t('Back to projects')}</span>
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
                    code({ children, className, node, ref, ...rest }) {
                      const match = /language-(\w+)/.exec(className || '');
                      const hasMeta = node?.data?.meta;

                      const applyHighlights = (lineNumber: number) => {
                        if (hasMeta && node.data) {
                          const RE = /{([\d,-]+)}/;
                          const metadata =
                            node.data.meta?.replace(/\s/g, '') || '';
                          const strlineNumbers = RE?.test(metadata)
                            ? RE?.exec(metadata)?.[1]
                            : '0';

                          const highlightLines = rangeParser(
                            strlineNumbers || ''
                          );
                          return highlightLines.includes(lineNumber)
                            ? { 'data-highlight': true }
                            : {};
                        }
                        return {};
                      };

                      return match ? (
                        <SyntaxHighlighter
                          {...rest}
                          ref={ref as any}
                          style={oneDark}
                          showLineNumbers
                          PreTag="div"
                          language={match[1]}
                          lineProps={applyHighlights as any}
                          useInlineStyles={true}
                          customStyle={{ maxWidth: '100%', overflowX: 'auto' }}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
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
