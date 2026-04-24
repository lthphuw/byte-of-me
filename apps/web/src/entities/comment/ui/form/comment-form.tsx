'use client';

import * as React from 'react';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';

import { AuthModal } from '@/features/auth';
import { cn } from '@/shared/lib/utils';
import { AutoGrowingTextarea , Button , Icons } from '@/shared/ui';





export interface CommentFormProps {
  blogId: string;
  isPending?: boolean;
  onComment: (content: string, parentId?: string) => void;
  replyTo?: Maybe<{
    parentId: string;
    replyingToUser: string;
  }>;
  onCancelReply?: () => void;
}

export function CommentForm({
  blogId,
  isPending,
  onComment,
  replyTo,
  onCancelReply,
}: CommentFormProps) {
  const t = useTranslations('blogDetails');
  const { data: session } = useSession();
  const isAuthenticated = !!session;

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [content, setContent] = useState('');

  const handleSubmit = () => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }

    if (!content.trim()) return;

    onComment(content, replyTo?.parentId);
    setContent('');
    onCancelReply?.();
  };

  return (
    <>
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <div className="relative">
        <div
          className={cn(
            'flex w-full flex-col gap-3 rounded-xl border bg-muted/20 p-4 shadow-sm transition',
            !isAuthenticated && 'pointer-events-none opacity-80'
          )}
        >
          {replyTo && (
            <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-xs">
              <span>Replying to @{replyTo.replyingToUser}</span>
              <button
                onClick={onCancelReply}
                className="text-muted-foreground hover:text-foreground"
              >
                {t('cancel')}
              </button>
            </div>
          )}

          <AutoGrowingTextarea
            value={content}
            onChange={(val) => setContent(val)}
            placeholder={
              replyTo
                ? `${t('replyTo')} @${replyTo.replyingToUser}`
                : t('writingComment')
            }
          />

          <div className="flex w-full justify-end">
            <Button
              className="w-full md:w-auto"
              onClick={handleSubmit}
              disabled={isPending || !content.trim()}
            >
              {isPending ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  {t('posting')}
                </>
              ) : replyTo ? (
                t('reply')
              ) : (
                t('postComment')
              )}
            </Button>
          </div>
        </div>

        {!isAuthenticated && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/70 backdrop-blur-[2px]">
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="text-sm text-muted-foreground">
                {t('mustSignInToComment')}
              </p>

              <Button onClick={() => setIsAuthModalOpen(true)}>
                {t('signInToComment')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
