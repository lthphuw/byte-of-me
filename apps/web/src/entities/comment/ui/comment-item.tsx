import type { PublicComment } from '@/entities/comment/model';
import { formatDate } from '@/shared/lib/utils';

export function CommentItem({ comment }: { comment: PublicComment }) {
  return (
    <div className="group flex gap-4 border-b border-muted py-6 last:border-0">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
        {comment.user.email.slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tracking-tight">
            {comment.user.email}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDate(comment.createdAt)}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-foreground/90">
          {comment.content}
        </p>
      </div>
    </div>
  );
}
