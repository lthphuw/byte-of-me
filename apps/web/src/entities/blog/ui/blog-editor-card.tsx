'use client';

import { Badge } from '@byte-of-me/ui';
import { Calendar, Eye, EyeOff, ImageOff } from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';

import type { AdminBlogListItem } from '@/entities/blog';
import { formatDate } from '@/shared/lib/utils';
import { RecordListItem, RecordRowActions } from '@/shared/ui';

interface BlogEditorCardProps {
  blog: AdminBlogListItem;
  onEdit: () => void;
  onDelete: () => void;
  isPending?: boolean;
}

/** One post in the manager's grid: a cover thumbnail, its meta, and the row actions. */
export function BlogEditorCard({
  blog,
  onEdit,
  onDelete,
  isPending,
}: BlogEditorCardProps) {
  const t = useTranslations('dashboard.blog');
  const locale = useLocale();
  const mainTranslation = blog.translations?.[0];
  const coverImageUrl = blog.coverImage?.url;
  const title = mainTranslation?.title || t('card.untitled');

  return (
    <RecordListItem
      className="items-start"
      leading={
        <div className="relative size-14 overflow-hidden rounded-md border bg-muted">
          {coverImageUrl ? (
            <Image
              src={coverImageUrl}
              alt=""
              fill
              sizes="56px"
              className="object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <ImageOff className="size-5" aria-hidden />
              <span className="sr-only">{t('card.noCover')}</span>
            </div>
          )}
        </div>
      }
      actions={
        <RecordRowActions
          name={title}
          onEdit={onEdit}
          onDelete={onDelete}
          disabled={isPending}
        />
      }
    >
      <div className="min-w-0 space-y-2">
        <p className="truncate font-semibold">{title}</p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="max-w-full truncate font-mono">/{blog.slug}</span>
          <Badge
            variant={blog.isPublished ? 'default' : 'secondary'}
            className="font-medium"
          >
            {blog.isPublished ? (
              <Eye className="mr-1 size-3" aria-hidden />
            ) : (
              <EyeOff className="mr-1 size-3" aria-hidden />
            )}
            {blog.isPublished ? t('meta.publishedLabel') : t('card.draft')}
          </Badge>
          {blog.publishedDate && (
            <span className="flex items-center gap-1">
              <Calendar className="size-3.5" aria-hidden />
              {formatDate(blog.publishedDate, locale)}
            </span>
          )}
        </div>

        <p className="line-clamp-2 text-sm text-muted-foreground">
          {mainTranslation?.description || t('card.noDescription')}
        </p>

        {blog.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {blog.tags.map((link) => (
              <Badge
                key={link.tagId}
                variant="outline"
                className="px-2 py-0 text-[10px] font-normal"
              >
                {link.tag?.translations?.[0]?.name || link.tag?.id}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </RecordListItem>
  );
}
