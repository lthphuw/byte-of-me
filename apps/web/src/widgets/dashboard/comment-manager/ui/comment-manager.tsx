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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

import { getPaginatedAdminComments } from '@/entities/comment/api/get-paginated-admin-comments';
import { setCommentVisibility } from '@/entities/comment/api/set-comment-visibility';
import { commentKeys } from '@/entities/comment/model/query-keys';
import type { AdminComment } from '@/entities/comment/model/types';
import { formatDate } from '@/shared/lib/utils';
import { ManagerListState, ManagerPageHeader } from '@/shared/ui';

const PAGE_SIZE = 12;

function commentSource(comment: AdminComment): string {
  if (comment.blog) {
    return `Blog: ${comment.blog.translations[0]?.title ?? comment.blog.slug}`;
  }
  if (comment.project) {
    return `Project: ${comment.project.translations[0]?.title ?? 'Untitled'}`;
  }
  return 'Unknown source';
}

export function CommentManager() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [commentToHide, setCommentToHide] = useState<AdminComment | null>(
    null
  );

  const {
    data: response,
    isLoading,
    isError,
    refetch,
    isFetching,
    isPlaceholderData,
  } = useQuery({
    queryKey: commentKeys.adminList(page),
    queryFn: () => getPaginatedAdminComments(page, PAGE_SIZE),
    placeholderData: (prev) => prev,
  });

  const comments = response?.success ? response.data.data : [];
  const pagination = response?.success ? response.data.meta : undefined;

  const visibilityMutation = useMutation({
    mutationFn: ({ id, hidden }: { id: string; hidden: boolean }) =>
      setCommentVisibility(id, hidden),
    onSuccess: (_, { hidden }) => {
      queryClient.invalidateQueries({ queryKey: commentKeys.adminAll() });
      toast(hidden ? 'Comment hidden' : 'Comment restored');
      setCommentToHide(null);
    },
    onError: () => toast.error('Error updating comment'),
  });

  return (
    <div className="space-y-6">
      <ManagerPageHeader
        title="Comments"
        description="Moderate comments left on your blogs and projects"
      />

      <div className="relative min-h-[300px]">
        <ManagerListState
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          isFetching={isFetching}
          isEmpty={comments.length === 0}
          emptyTitle="No comments yet"
          emptyDescription="Comments on your blogs and projects will show up here."
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
                    alt={comment.user.name ?? 'User'}
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
                      {formatDate(comment.createdAt)}
                    </span>
                    {comment.isDeleted && (
                      <Badge variant="destructive" className="text-[10px]">
                        Hidden
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
                      disabled={visibilityMutation.isPending}
                      onClick={() =>
                        visibilityMutation.mutate({
                          id: comment.id,
                          hidden: false,
                        })
                      }
                    >
                      <Eye className="h-4 w-4" />
                      Restore
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={() => setCommentToHide(comment)}
                    >
                      <EyeOff className="h-4 w-4" />
                      Hide
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
          />
        </div>
      )}

      <ConfirmDeleteDialog
        isOpen={!!commentToHide}
        isLoading={visibilityMutation.isPending}
        onClose={() => setCommentToHide(null)}
        onConfirm={() =>
          commentToHide &&
          visibilityMutation.mutate({ id: commentToHide.id, hidden: true })
        }
        title="Hide Comment"
        description="This comment will no longer be visible to visitors. You can restore it later."
      />
    </div>
  );
}
