import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchPost, fetchReplies } from './postsApi';
import { PostCard } from '@/features/feed/PostCard';
import { PostSkeleton } from '@/features/feed/PostSkeleton';
import { ReplyComposer } from './ReplyComposer';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ApiError } from '@/api/client';
import { ArrowLeft, MessageSquareOff, RefreshCw, CornerDownRight } from 'lucide-react';

export function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const postId = Number(id);

  // 1. Fetch current post
  const {
    data: post,
    isLoading: isPostLoading,
    isError: isPostError,
    error: postError,
    refetch: refetchPost,
  } = useQuery({
    queryKey: ['post', postId],
    queryFn: () => fetchPost(postId),
    enabled: !isNaN(postId),
  });

  // 2. If parent_id exists, fetch parent post (one level up)
  const parentId = post?.parent_id;
  const {
    data: parentPost,
    isLoading: isParentLoading,
  } = useQuery({
    queryKey: ['post', parentId],
    queryFn: () => fetchPost(parentId!),
    enabled: Boolean(parentId),
  });

  // 3. Fetch direct replies (oldest first, at most 50)
  const {
    data: repliesData,
    isLoading: isRepliesLoading,
    isError: isRepliesError,
    error: repliesError,
    refetch: refetchReplies,
  } = useQuery({
    queryKey: ['replies', postId],
    queryFn: () => fetchReplies(postId),
    enabled: !isNaN(postId),
  });

  const handleDeleteSuccess = () => {
    if (parentId) {
      navigate(`/post/${parentId}`);
    } else {
      navigate('/');
    }
  };

  if (isNaN(postId)) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-2xl px-4 py-12 text-center">
          <Alert variant="error" title="Invalid Post ID">
            The requested post ID is invalid.
          </Alert>
          <Button variant="outline" onClick={() => navigate('/')} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Go to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="h-9 w-9 p-0 rounded-full"
              title="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <span className="font-bold text-lg tracking-tight">Thread</span>
          </div>

          <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-bold text-sm">
              @
            </div>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        <div className="space-y-6">
          {/* Loading state */}
          {isPostLoading && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <PostSkeleton />
            </div>
          )}

          {/* 404 or Error state */}
          {isPostError && (
            <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm space-y-4">
              {postError instanceof ApiError && postError.status === 404 ? (
                <>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                    <MessageSquareOff className="h-6 w-6" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">Post not found</h2>
                  <p className="text-sm text-muted-foreground">
                    This post may have been deleted or the link is incorrect.
                  </p>
                  <Button variant="outline" onClick={() => navigate('/')} className="mt-2">
                    Back to Feed
                  </Button>
                </>
              ) : (
                <>
                  <Alert
                    variant="error"
                    title="Failed to load post"
                    requestId={postError instanceof ApiError ? postError.requestId : undefined}
                  >
                    {postError instanceof Error ? postError.message : 'An error occurred'}
                  </Alert>
                  <Button variant="outline" onClick={() => refetchPost()}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Try Again
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Post Content */}
          {post && (
            <div className="space-y-4">
              {/* Optional Parent Post Link / Preview */}
              {parentId && (
                <div className="rounded-2xl border border-border/80 bg-muted/20 p-3.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2 mb-2 font-medium text-foreground">
                    <CornerDownRight className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Replying to</span>
                    {isParentLoading ? (
                      <span className="animate-pulse">post...</span>
                    ) : parentPost ? (
                      <Link
                        to={`/u/${parentPost.author.username}`}
                        className="font-semibold text-foreground hover:underline"
                      >
                        @{parentPost.author.username}
                      </Link>
                    ) : (
                      <Link
                        to={`/post/${parentId}`}
                        className="font-semibold text-foreground hover:underline"
                      >
                        parent post #{parentId}
                      </Link>
                    )}
                  </div>

                  {parentPost && (
                    <Link
                      to={`/post/${parentPost.id}`}
                      className="block pl-5 border-l-2 border-border text-foreground/80 hover:text-foreground line-clamp-2"
                    >
                      {parentPost.content}
                    </Link>
                  )}
                </div>
              )}

              {/* Main Post Card */}
              <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                <PostCard
                  post={post}
                  isDetailView
                  onDeleteSuccess={handleDeleteSuccess}
                />
              </div>

              {/* Reply Composer */}
              <ReplyComposer parentId={post.id} />

              {/* Direct Replies Section */}
              <div className="space-y-3 pt-2">
                <h3 className="text-sm font-semibold text-foreground px-1">
                  Replies {repliesData && `(${repliesData.data.length})`}
                </h3>

                {isRepliesLoading && (
                  <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                    <PostSkeleton />
                  </div>
                )}

                {isRepliesError && (
                  <div className="rounded-2xl border border-border bg-card p-4 text-center">
                    <Alert
                      variant="error"
                      title="Failed to load replies"
                      requestId={repliesError instanceof ApiError ? repliesError.requestId : undefined}
                    >
                      {repliesError instanceof Error ? repliesError.message : 'Could not retrieve replies'}
                    </Alert>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetchReplies()}
                      className="mt-3"
                    >
                      Retry
                    </Button>
                  </div>
                )}

                {repliesData && repliesData.data.length === 0 && (
                  <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                    No replies yet. Be the first to reply!
                  </div>
                )}

                {repliesData && repliesData.data.length > 0 && (
                  <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm divide-y divide-border">
                    {repliesData.data.map((reply) => (
                      <PostCard
                        key={reply.id}
                        post={reply}
                        showViewRepliesLink
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
