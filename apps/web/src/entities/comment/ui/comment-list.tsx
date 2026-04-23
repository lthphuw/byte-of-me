'use client';

import { useState } from 'react';

import { CommentItem } from './comment-item';

import { CommentForm } from '@/entities';
import type { PublicComment } from '@/entities/comment/model';


type Props = {
  blogId: string;
  comments: PublicComment[];
  onComment: (content: string, parentId?: string) => void;
};

export function CommentList({ blogId, comments, onComment }: Props) {
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {comments.map((root) => {
        const replies = root.children || [];

        return (
          <div key={root.id} className="space-y-3">
            <CommentItem
              comment={root}
              onReply={(c) => setActiveReplyId(c.id)}
            />

            {/* ROOT REPLY */}
            {activeReplyId === root.id && (
              <div className="ml-11">
                <CommentForm
                  blogId={blogId}
                  onComment={(content) => {
                    onComment(content, root.id);
                    setActiveReplyId(null);
                  }}
                  replyTo={{
                    parentId: root.id,
                    replyingToUser: root.user.name ?? root.user.email,
                  }}
                  onCancelReply={() => setActiveReplyId(null)}
                />
              </div>
            )}

            {/* REPLIES */}
            {replies.length > 0 && (
              <div className="ml-3 space-y-3 border-l pl-6">
                {replies.map((reply) => (
                  <div key={reply.id} className="space-y-2">
                    <CommentItem
                      comment={reply}
                      isReply
                      onReply={(c) => setActiveReplyId(c.id)}
                    />

                    {activeReplyId === reply.id && (
                      <div className="ml-11">
                        <CommentForm
                          blogId={blogId}
                          onComment={(content) => {
                            onComment(content, root.id);
                            setActiveReplyId(null);
                          }}
                          replyTo={{
                            parentId: root.id,
                            replyingToUser: root.user.name ?? root.user.email,
                          }}
                          onCancelReply={() => setActiveReplyId(null)}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
