'use client';

import React, { useRef, useState } from 'react';
import rangeParser from 'parse-numeric-range';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import { Pluggable } from 'unified';

import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { FloatingToc, TocItem } from '@/components/floating-toc';

import { Button } from './ui/button';

export type BlogContentProps = BaseComponentProps & {
  content: string;
  tocItems: TocItem[];
};

export function BlogContent({
  content,
  tocItems,
  className,
  style,
}: BlogContentProps) {
  const isMobile = useMediaQuery('only screen and (max-width : 768px)');
  const containerRef = useRef<HTMLDivElement>(null);
  const [isTocOpen, setIsTocOpen] = useState(false);

  return (
    <React.Fragment>
      <div
        ref={containerRef}
        className={cn(
          'relative mt-8 sm:mt-12 max-w-4xl mx-auto flex flex-col gap-6 md:gap-8 px-4 sm:px-6 lg:px-0 py-8 sm:py-12',
          className
        )}
        style={style}
      >
        {tocItems.length > 0 && isMobile && (
          <Button
            variant="outline"
            className="mb-6 self-start"
            onClick={() => setIsTocOpen(true)}
          >
            Table of Contents
          </Button>
        )}

        <article
          className="prose prose-sm md:prose-lg dark:prose-invert max-w-full break-words text-left
          [&_pre]:whitespace-pre-wrap [&_pre]:break-words
          [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:shadow-md
          prose-headings:font-bold prose-headings:mt-6 md:prose-headings:mt-8 prose-headings:mb-3 md:prose-headings:mb-4
          prose-p:leading-relaxed prose-p:my-3 md:prose-p:my-4
          prose-ul:my-3 md:prose-ul:my-4 prose-ol:my-3 md:prose-ol:my-4 prose-li:my-1 md:prose-li:my-2
          prose-table:overflow-x-auto prose-table:my-4 md:prose-table:my-6
          prose-a:text-blue-600 prose-a:underline hover:prose-a:text-blue-800
          sm:overflow-x-auto"
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw as Pluggable, rehypeSlug]}
            components={{
              code({ children, className, node, ref, ...rest }) {
                const match = /language-(\w+)/.exec(className || '');
                const hasMeta = node?.data?.meta;

                const applyHighlights = (lineNumber: number) => {
                  if (hasMeta && node.data) {
                    const RE = /{([\d,-]+)}/;
                    const metadata = node.data.meta?.replace(/\s/g, '') || '';
                    const strlineNumbers = RE?.test(metadata)
                      ? RE?.exec(metadata)?.[1]
                      : '0';

                    const highlightLines = rangeParser(strlineNumbers || '');
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
                    showLineNumbers={!isMobile}
                    PreTag="div"
                    language={match[1]}
                    lineProps={applyHighlights as any}
                    useInlineStyles={true}
                    customStyle={{
                      maxWidth: '100%',
                      overflowX: 'auto',
                      borderRadius: '0.5rem',
                      padding: '1rem',
                      marginTop: '1rem',
                      marginBottom: '1rem',
                    }}
                    wrapLongLines={isMobile}
                    wrapLines={!isMobile}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code
                    {...rest}
                    className={cn(
                      className,
                      'bg-muted px-1.5 py-0.5 rounded-md'
                    )}
                  >
                    {children}
                  </code>
                );
              },
              blockquote: ({ children, ...props }) => (
                <blockquote
                  {...props}
                  className="border-l-4 border-primary pl-4 my-6 italic text-muted-foreground"
                >
                  {children}
                </blockquote>
              ),
              table: ({ children, ...props }) => (
                <div className="overflow-x-auto my-6">
                  <table
                    {...props}
                    className="min-w-full divide-y divide-border"
                  >
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children, ...props }) => (
                <thead {...props} className="bg-muted">
                  {children}
                </thead>
              ),
              th: ({ children, ...props }) => (
                <th
                  {...props}
                  className="px-4 py-2 text-left font-semibold text-foreground"
                >
                  {children}
                </th>
              ),
              td: ({ children, ...props }) => (
                <td
                  {...props}
                  className="px-4 py-2 text-foreground border-t border-border"
                >
                  {children}
                </td>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </article>
      </div>

      {/* Mobile TOC Drawer */}
      {isMobile && tocItems.length > 0 && (
        <Sheet open={isTocOpen} onOpenChange={setIsTocOpen}>
          <SheetContent side="right" className="w-3/4 sm:w-1/2">
            <FloatingToc
              items={tocItems}
              onItemClick={() => setIsTocOpen(false)}
            />
          </SheetContent>
        </Sheet>
      )}

      {!isMobile && tocItems.length > 0 && <FloatingToc items={tocItems} />}
    </React.Fragment>
  );
}
