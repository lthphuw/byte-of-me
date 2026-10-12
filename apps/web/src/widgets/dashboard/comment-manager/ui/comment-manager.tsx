'use client';

import { useState } from 'react';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  ConfirmDeleteDialog,
  Pagination,
} from '@byte-of-me/ui';
import { Eye, EyeOff } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import type { AdminComment } from '@/entities/comment/model/types';
import {
  useAdminComments,
  useSetCommentVisibility,
} from '@/entities/comment/query';
import { ManagerListState, ManagerPageHeader } from '@/shared/ui';
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
  const [commentToHide, setCommentToHide] = useState<AdminComment | null>(null);

  const { data, isLoading, isError, refetch, isFetching, isPlaceholderData } =
    useAdminComments(page);

  const comments = data?.data ?? [];
  const pagination = data?.meta;

  const visibility = useSetCommentVisibility();

  // The toast and the dialog close wait for the envelope; a refusal is reported
  // by the hook and leaves the dialog open.
  const setVisibility = (commentId: string, hidden: boolean) =>
    visibility.mutate(
      { commentId, hidden },
      {
        onSuccess: () => {
          toast(hidden ? t('toast.hidden') : t('toast.restored'));
          setCommentToHide(null);
        },
      }
    );

  // The id of the row being toggled, not "a toggle is running": the flag alone
  // disabled every Restore button on the page while one was in flight.
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
          onRetry={() => refetch()}
          isFetching={isFetching}
          isEmpty={comments.length === 0}
          emptyTitle={t('emptyTitle')}
          emptyDescription={t('emptyDescription')}
          skeleton={<CommentListSkeleton />}
        >
          <div className="flex flex-col gap-2">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="flex items-start gap-3 rounded-lg border bg-card p-3"
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage
                    src={comment.user.image ?? undefined}
                    alt={comment.user.name ?? t('avatarFallbackAlt')}
                  />
                  <AvatarFallback>
                    {(comment.user.name ?? '?').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1 space-y-1">
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

                <div className="flex shrink-0 items-center gap-1">
                  {comment.isDeleted ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      disabled={pendingVisibilityId === comment.id}
                      onClick={() => setVisibility(comment.id, false)}
                    >
                      <Eye className="h-4 w-4" />
                      {t('actions.restore')}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      disabled={pendingVisibilityId === comment.id}
                      onClick={() => setCommentToHide(comment)}
                    >
                      <EyeOff className="h-4 w-4" />
                      {t('actions.hide')}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ManagerListState>
      </div>

      {pagination && comments.length > 0 && (
        <div className="pt-4">
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
        </div>
      )}

      <ConfirmDeleteDialog
        isOpen={!!commentToHide}
        isLoading={visibility.isPending}
        onClose={() => setCommentToHide(null)}
        onConfirm={() =>
          commentToHide && setVisibility(commentToHide.id, true)
        }
        title={t('dialog.hideTitle')}
        description={t('dialog.hideDescription')}
        actionText={t('actions.hide')}
        cancelText={tShared('confirmDelete.cancelText')}
      />
    </div>
  );
}
