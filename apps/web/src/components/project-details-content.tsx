'use client';

import { Link } from '@/i18n/navigation';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useTranslations } from 'next-intl';
import rangeParser from 'parse-numeric-range';
import { useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import { Pluggable } from 'unified';

import { FloatingToc, TocItem } from '@/components/floating-toc';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useWindowScroll } from '@/hooks/use-window-scroll';
import { cn } from '@/lib/utils';

import { Icons } from './icons';
import { Button } from './ui/button';

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
  const [position] = useWindowScroll();
  const compactBack = useMemo(() => position.y > 30, [position]);
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });
  const x = useTransform(scrollYProgress, [0, 0.15], [32, 0]);

  return (
    <>
      <motion.div
        style={{ x }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={cn(
          'fixed top-24 left-8 md:left-[80px] md:top-36 z-10',
          compactBack && 'left-2 top-32 md:left-[80px]',
          isMobile && compactBack && 'hidden'
        )}
      >
        {
          <Link href="/projects">
            <Button
              variant={isMobile ? 'link' : 'ghost'}
              className={cn('flex gap-2 items-center px-4 py-2 rounded-full')}
            >
              <Icons.arrowLeft size={32 * (isMobile ? 0.75 : 1)} />

              <motion.span
                className={cn(
                  'text-base whitespace-nowrap',
                  compactBack && 'hidden'
                )}
              >
                {t('Back to projects')}
              </motion.span>
            </Button>
          </Link>
        }
      </motion.div>

      <div
        ref={containerRef}
        className="relative mt-12 max-w-full flex flex-col gap-4 md:gap-6 justify-center px-4 lg:px-8 py-12 overflow-x-hidden"
      >
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
