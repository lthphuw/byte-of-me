import { ArrowLeft, FileQuestion, Search } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { Button } from '@/shared/ui';

export async function BlogNotFound() {
  const t = await getTranslations('blogDetails');

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4 px-4 text-center">
      {/* Visual Icon Group */}
      <div className="relative mb-6 ">
        <div className="absolute -inset-4 rounded-full bg-primary/5 blur-xl" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-dashed border-muted-foreground/30 bg-background">
          <FileQuestion className="h-10 w-10 text-muted-foreground/40" />
          <Search className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full border bg-background p-1 text-primary shadow-sm" />
        </div>
      </div>

      {/* Text Content */}
      <h2 className="mb-2 text-2xl font-bold tracking-tight">
        {t('blogNotFoundTitle') || 'Article not found'}
      </h2>
      <p className="mb-8 max-w-[350px] text-muted-foreground">
        {t('blogNotFoundDescription') ||
          "The blog post you're looking for might have been moved, deleted, or never existed."}
      </p>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild variant="default">
          <Link href="/blogs">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('backToBlogs') || 'Back to all blogs'}
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">{t('goHome') || 'Go to homepage'}</Link>
        </Button>
      </div>
    </div>
  );
}
