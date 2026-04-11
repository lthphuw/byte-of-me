import Link from 'next/link';
import { Button } from '@/shared/ui/button';
import { ArrowLeft, FileQuestion, Search } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export async function BlogNotFound() {
  const t = await getTranslations('blogDetails');

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center space-y-4">
      {/* Visual Icon Group */}
      <div className="relative mb-6 ">
        <div className="absolute -inset-4 bg-primary/5 rounded-full blur-xl" />
        <div className="relative flex items-center justify-center w-20 h-20 bg-background border-2 border-dashed border-muted-foreground/30 rounded-2xl">
          <FileQuestion className="w-10 h-10 text-muted-foreground/40" />
          <Search className="absolute -bottom-1 -right-1 w-6 h-6 text-primary bg-background rounded-full p-1 border shadow-sm" />
        </div>
      </div>

      {/* Text Content */}
      <h2 className="text-2xl font-bold tracking-tight mb-2">
        {t('blogNotFoundTitle') || 'Article not found'}
      </h2>
      <p className="text-muted-foreground max-w-[350px] mb-8">
        {t('blogNotFoundDescription') ||
          "The blog post you're looking for might have been moved, deleted, or never existed."}
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
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
