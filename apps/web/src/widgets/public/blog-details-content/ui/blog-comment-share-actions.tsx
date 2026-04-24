'use client';

import { MessageSquare, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/shared/ui';

export function BlogCommentShareActions({
  title,
  noCommentAppear,
}: {
  title: string;
  noCommentAppear?: boolean;
}) {
  const t = useTranslations('blogDetails');
  const handleShare = () =>
    navigator.share({ title, url: window.location.href });

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
