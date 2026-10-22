import { useState, type MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { PostWithStats } from '@/api/types';
import { formatRelativeTime } from '@/lib/formatDate';
import { useAuth } from '@/features/auth/useAuth';
import { usePostLike } from '@/features/posts/usePostLike';
import { useDeletePost } from '@/features/posts/useDeletePost';
import { Heart, MessageCircle, Trash2, ArrowRight } from 'lucide-react';

export interface PostCardProps {
  post: PostWithStats;
  isDetailView?: boolean;
  onDeleteSuccess?: () => void;
  showViewRepliesLink?: boolean;
}

export function PostCard({
  post,
  isDetailView = false,
  onDeleteSuccess,
  showViewRepliesLink = false,
}: PostCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const likeMutation = usePostLike(post);
  const deleteMutation = useDeletePost(onDeleteSuccess);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const initials = post.author.username ? post.author.username.slice(0, 2).toUpperCase() : 'U';
  const timeAgo = formatRelativeTime(post.created_at);
  const isOwner = user?.id === post.author.id;

  const handleCardClick = () => {
    if (!isDetailView) {
      navigate(`/post/${post.id}`);
    }
  };

  const handleLikeClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (likeMutation.isPending) return;
    likeMutation.mutate();
  };

  const handleDeleteClick = (e: MouseEvent) => {
    e.stopPropagation();
    setShowConfirmDelete(true);
  };

  const handleConfirmDelete = (e: MouseEvent) => {
    e.stopPropagation();
    deleteMutation.mutate({ postId: post.id, parentId: post.parent_id });
  };

  const handleCancelDelete = (e: MouseEvent) => {
    e.stopPropagation();
    setShowConfirmDelete(false);
  };

  return (
    <article
      onClick={handleCardClick}
      className={`border-b border-border bg-card p-4 sm:p-5 transition-colors select-text ${
        isDetailView ? '' : 'cursor-pointer hover:bg-neutral-50/50 dark:hover:bg-neutral-900/50'
      }`}
    >
      <div className="flex gap-3 sm:gap-4">
        {/* Author Avatar */}
        <Link
          to={`/u/${post.author.username}`}
          onClick={(e) => e.stopPropagation()}
          className="flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-800 text-sm font-bold text-foreground hover:opacity-80 transition-opacity"
        >
          {initials}
        </Link>

        {/* Post Content & Actions */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <Link
              to={`/u/${post.author.username}`}
              onClick={(e) => e.stopPropagation()}
              className="text-sm font-semibold text-foreground hover:underline truncate"
            >
              {post.author.username}
            </Link>

            <div className="flex items-center gap-2">
              <time
                dateTime={post.created_at}
                className="text-xs text-muted-foreground shrink-0"
              >
                {timeAgo}
              </time>

              {/* Delete Menu for Owner */}
              {isOwner && !showConfirmDelete && (
                <button
                  type="button"
                  onClick={handleDeleteClick}
                  className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Delete post"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Delete confirmation banner */}
          {showConfirmDelete && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="my-3 flex items-center justify-between rounded-xl bg-destructive/10 p-2.5 text-xs text-destructive animate-in fade-in"
            >
              <span>Delete this post? Replies will also be deleted.</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancelDelete}
                  className="rounded px-2 py-1 text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleteMutation.isPending}
                  className="rounded bg-destructive px-2 py-1 font-semibold text-destructive-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          )}

          {/* Post text: strictly text-rendered with whitespace-pre-wrap, never innerHTML */}
          <p
            className={`mt-2 text-foreground whitespace-pre-wrap break-words leading-relaxed ${
              isDetailView ? 'text-base sm:text-lg font-normal' : 'text-sm sm:text-base'
            }`}
          >
            {post.content}
          </p>

          {/* Social Stats & Buttons */}
          <div className="mt-3.5 flex items-center justify-between">
            <div className="flex items-center gap-6 text-muted-foreground">
              {/* Like Button */}
              <button
                type="button"
                onClick={handleLikeClick}
                disabled={likeMutation.isPending}
                className={`flex items-center gap-1.5 text-xs transition-colors hover:text-foreground active:scale-95 ${
                  post.liked_by_me ? 'text-red-500 font-semibold' : ''
                }`}
                title={post.liked_by_me ? 'Unlike' : 'Like'}
              >
                <Heart
                  className={`h-4 w-4 transition-transform ${
                    post.liked_by_me ? 'fill-current text-red-500 scale-110' : ''
                  }`}
                />
                <span>{post.like_count}</span>
              </button>

              {/* Reply Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/post/${post.id}`);
                }}
                className="flex items-center gap-1.5 text-xs transition-colors hover:text-foreground active:scale-95"
                title="Reply"
              >
                <MessageCircle className="h-4 w-4" />
                <span>{post.reply_count}</span>
              </button>
            </div>

            {/* "View replies" link if direct child reply has replies of its own */}
            {showViewRepliesLink && post.reply_count > 0 && (
              <Link
                to={`/post/${post.id}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>View {post.reply_count} {post.reply_count === 1 ? 'reply' : 'replies'}</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
