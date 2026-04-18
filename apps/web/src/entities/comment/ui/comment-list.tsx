import { CommentItem } from './comment-item';

import type { PublicComment } from '@/entities/comment/model';

export function CommentList({ comments }: { comments: PublicComment[] }) {
  return (
    <div className="divide-y divide-muted">
      {comments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} />
      ))}
    </div>
  );
}
