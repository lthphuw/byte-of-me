'use client';

import { Button } from '@byte-of-me/ui';
import { MessageSquare, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

export function BlogCommentShareActions({
  title,
  noCommentAppear,
}: {
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
    <div className={'flex items-center gap-2'}>
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
    </div>
  );
}
