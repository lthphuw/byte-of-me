'use client';

import { Button } from '@byte-of-me/ui';
import { FileDown, MessageSquare, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { blogPrintHref } from '@/features/public/blog-print';
import { Link } from '@/shared/i18n/navigation';

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
          className="gap-2"
          onClick={() => document.getElementById('comments')?.scrollIntoView()}
        >
          <MessageSquare className="h-4 w-4" />
          {t('comment')}
        </Button>
      )}

      <Button
        variant="ghost"
        size="sm"
        className="ml-auto gap-2"
        onClick={() => handleShare()}
      >
        <Share2 className="h-4 w-4" /> {t('share')}
      </Button>

      {/* A real link, not a `window.open` handler: it stays middle-clickable
          and copyable, and `?print=1` is what makes the opened tab raise its
          own print dialog.

          The label hides below `sm`. Four labelled controls plus the
          like/clap pair do not fit a 375px viewport, and Vietnamese runs
          longer than English ("Bình luận" / "Chia sẻ") — the icon plus
          `aria-label` carries it there. */}
      <Button variant="ghost" size="sm" className="gap-2" asChild>
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
