'use client';

import { Button } from '@byte-of-me/ui';
import { FileDown, MessageSquare, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { blogPrintHref } from '@/features/public/blog-print';
import { Link } from '@/shared/i18n/navigation';
import { cn } from '@/shared/lib/utils';

/**
 * All three actions drop their label below `sm` and keep only the icon.
 *
 * They used to disagree — comment and share stayed labelled while PDF went
 * icon-only, because four labelled controls plus the like/clap pair overflow a
 * 375px viewport and Vietnamese runs longer than English ("Bình luận" /
 * "Chia sẻ"). One unlabelled button in a row of labelled ones reads as a
 * rendering fault, not as a decision, so the whole group now drops together.
 *
 * The icon-only form is square and a notch taller than the `sm` height it
 * replaces: without a label there is far less to hit, and 32px is under the
 * comfortable tap target. `variant="ghost"` has no background, so the extra
 * height is hit area only and the row still lines up with like/clap.
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
  const handleShare = async () => {
    const url = window.location.href;

    // Web Share API is unavailable on most desktop browsers.
    if (navigator.share) {
      await navigator.share({ title, url });
      return;
    }

    await navigator.clipboard.writeText(url);
    toast(t('linkCopied'));
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
