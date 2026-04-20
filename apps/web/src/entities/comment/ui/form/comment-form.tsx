'use client';

import * as React from 'react';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';

import { AuthModal } from '@/features/auth';
import { Button } from '@/shared/ui/button';
import { Icons } from '@/shared/ui/icons';
import { Textarea } from '@/shared/ui/textarea';

export interface CommentFormProps {
  blogId: string;
  isPending?: boolean;
  onComment: (content: string) => void;
}

export function CommentForm({ blogId, isPending, onComment }: CommentFormProps) {
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

    onComment(content);
    setContent('');
  };

  return (
    <>
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <div className="flex w-full flex-col gap-3 rounded-xl border bg-muted/20 p-4 shadow-sm">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onClick={() => !isAuthenticated && setIsAuthModalOpen(true)}
          placeholder={
            isAuthenticated ? t('writingComment') : t('mustSignInToComment')
          }
          className="min-h-[100px] w-full resize-y bg-background"
        />

        <div className="flex w-full justify-end">
          <Button
            className="w-full md:w-auto"
            onClick={handleSubmit}
            disabled={isPending || !content.trim()}
          >
            {isPending
              ? <>
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                {t('posting')}
              </>
              : isAuthenticated
              ? t('postComment')
              : t('signInToComment')}
          </Button>
        </div>
      </div>
    </>
  );
}
