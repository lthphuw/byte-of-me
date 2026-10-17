'use client';

import { Button, useClipboard } from '@byte-of-me/ui';
import { FileDown, MessageSquare, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { blogPrintHref } from '@/features/public/blog-print';
import { Link } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/utils';

/**
 * All three actions drop their label below `sm`: four labelled controls plus like/clap overflow
 * 375px (Vietnamese runs longer), and one unlabelled button in a labelled row reads as a fault.
 * Icon-only is square and 36px, as 32px is under a comfortable tap target (ghost: hit area only).
 */
const ACTION_BUTTON = 'h-9 w-9 gap-2 p-0 sm:h-8 sm:w-auto sm:px-3';

export function BlogCommentShareActions({
  slug,
  title,
  noCommentAppear,
}: {
  slug: string;
  title: string;
  noCommentAppear?: boolean;
}) {
  const t = useTranslations('blogDetails');
  const { copy } = useClipboard();
  const handleShare = async () => {
    const url = window.location.href;

    // Web Share API is unavailable on most desktop browsers.
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        // The reader closed the sheet: nothing to report, nothing to copy.
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }

    toast(t((await copy(url)) ? 'linkCopied' : 'linkCopyFailed'));
  };

  return (
    <div className={'flex flex-wrap items-center gap-2'}>
      {!noCommentAppear && (
        <Button
          variant="ghost"
          size="sm"
          className={ACTION_BUTTON}
          aria-label={t('comment')}
          title={t('comment')}
          onClick={() => document.getElementById('comments')?.scrollIntoView()}
        >
          <MessageSquare className="h-4 w-4" />
          <span className="hidden sm:inline">{t('comment')}</span>
        </Button>
      )}

      <Button
        variant="ghost"
        size="sm"
        className={cn('ml-auto', ACTION_BUTTON)}
        aria-label={t('share')}
        title={t('share')}
        onClick={() => handleShare()}
      >
        <Share2 className="h-4 w-4" />
        <span className="hidden sm:inline">{t('share')}</span>
      </Button>

      {/* A real link, not a `window.open` handler: it stays middle-clickable
          and copyable, and `?print=1` is what makes the opened tab raise its
          own print dialog. */}
      <Button variant="ghost" size="sm" className={ACTION_BUTTON} asChild>
        <Link
          href={blogPrintHref(slug)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('downloadPdf')}
          title={t('downloadPdf')}
        >
          <FileDown className="h-4 w-4" />
          <span className="hidden sm:inline">{t('pdf')}</span>
        </Link>
      </Button>
    </div>
  );
}
