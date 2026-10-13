'use client';

import { useState } from 'react';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Pagination,
} from '@byte-of-me/ui';
import { Eye, EyeOff } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';

import type { AdminComment } from '@/entities/comment/model/types';
import {
  useAdminComments,
  useSetCommentVisibility,
} from '@/entities/comment/query';
import {
  ManagerListState,
  ManagerPageHeader,
  RecordListItem,
} from '@/shared/ui';
import { CommentListSkeleton } from '@/widgets/dashboard/comment-manager/ui/comment-list-skeleton';

export function CommentManager() {
  const t = useTranslations('dashboard.comment');
  const tShared = useTranslations('dashboard.shared');
  const format = useFormatter();

  function commentSource(comment: AdminComment): string {
    if (comment.blog) {
      return t('source.blog', {
        title: comment.blog.translations[0]?.title ?? comment.blog.slug,
      });
    }
    if (comment.project) {
      return t('source.project', {
        title:
          comment.project.translations[0]?.title ?? t('source.untitledProject'),
      });
    }
    return t('source.unknown');
  }

  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch, isFetching, isPlaceholderData } =
    useAdminComments(page);

  const comments = data?.data ?? [];
  const pagination = data?.meta;

  const visibility = useSetCommentVisibility();

  // The id of the row being toggled, not "a toggle is running": a shared flag
  // would disable every button on the page while one was in flight.
  const pendingVisibilityId = visibility.isPending
    ? visibility.variables?.commentId
    : undefined;

  return (
    <div className="space-y-6">
      <ManagerPageHeader title={t('title')} description={t('description')} />

      <div className="relative min-h-[300px]">
        <ManagerListState
          isLoading={isLoading}
          isError={isError}
          onRetry={() => void refetch()}
          isFetching={isFetching}
          isEmpty={comments.length === 0}
          emptyTitle={t('emptyTitle')}
          emptyDescription={t('emptyDescription')}
          pagination={
            pagination && pagination.totalPages > 1 ? (
              <Pagination
                pagination={pagination}
                setPage={setPage}
                isPlaceholderData={isPlaceholderData}
                pageLabel={tShared('pagination.pageLabel', {
                  page: pagination.currentPage,
                  totalPages: pagination.totalPages,
                })}
                previousLabel={tShared('pagination.previous')}
                nextLabel={tShared('pagination.next')}
              />
            ) : undefined
          }
          skeleton={<CommentListSkeleton />}
        >
          <div className="space-y-3">
            {comments.map((comment) => (
              <RecordListItem
                key={comment.id}
                className="items-start"
                leading={
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={comment.user.image ?? undefined}
                      alt={comment.user.name ?? t('avatarFallbackAlt')}
                    />
                    <AvatarFallback>
                      {(comment.user.name ?? '?').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                }
                actions={
                  comment.isDeleted ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-11 gap-2 can-hover:min-h-9"
                      disabled={pendingVisibilityId === comment.id}
                      onClick={() =>
                        visibility.mutate({ commentId: comment.id, hidden: false })
                      }
                    >
                      <Eye className="h-4 w-4" />
                      {t('actions.restore')}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-11 gap-2 can-hover:min-h-9"
                      disabled={pendingVisibilityId === comment.id}
                      onClick={() =>
                        visibility.mutate({ commentId: comment.id, hidden: true })
                      }
                    >
                      <EyeOff className="h-4 w-4" />
                      {t('actions.hide')}
                    </Button>
                  )
                }
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">
                      {comment.user.name ?? comment.user.email}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format.dateTime(new Date(comment.createdAt), {
                        dateStyle: 'medium',
                      })}
                    </span>
                    {comment.isDeleted && (
                      <Badge variant="destructive" className="text-[10px]">
                        {t('status.hidden')}
                      </Badge>
                    )}
                  </div>
                  <p className="break-words text-sm text-muted-foreground">
                    {comment.content}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {commentSource(comment)}
                  </p>
                </div>
              </RecordListItem>
            ))}
          </div>
        </ManagerListState>
      </div>
    </div>
  );
}
