import { useEffect, useRef } from 'react';
import { useFeed } from './feedApi';
import { PostCard } from './PostCard';
import { FeedSkeletonList, PostSkeleton } from './PostSkeleton';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ApiError } from '@/api/client';
import { Sparkles, RefreshCw, CheckCircle2 } from 'lucide-react';
import type { PostWithStats } from '@/api/types';

export function FeedList() {
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useFeed();

  const sentinelRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver for infinite scrolling
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '250px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Initial loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <FeedSkeletonList count={4} />
      </div>
    );
  }

  // Error state
  if (isError) {
    const apiError = error instanceof ApiError ? error : null;
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm space-y-4">
        <Alert
          variant="error"
          title="Could not load your feed"
          requestId={apiError?.requestId}
        >
          {apiError?.message || 'Something went wrong while retrieving posts.'}
        </Alert>
        <Button
          variant="outline"
          onClick={() => refetch()}
          className="mx-auto"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  // Flatten and deduplicate posts by ID
  const allPosts = data?.pages.flatMap((page) => page.data) ?? [];
  const uniquePostsMap = new Map<number, PostWithStats>();
  allPosts.forEach((post) => {
    if (!uniquePostsMap.has(post.id)) {
      uniquePostsMap.set(post.id, post);
    }
  });
  const posts = Array.from(uniquePostsMap.values());

  // Empty state for new accounts
  if (posts.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 sm:p-12 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-4">
          <Sparkles className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-foreground">Your feed is empty</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
          Start a thread above or follow creators to see what people are talking about.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      {/* Infinite scroll sentinel & next page indicators */}
      <div ref={sentinelRef} className="py-3">
        {isFetchingNextPage && (
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <PostSkeleton />
          </div>
        )}

        {!hasNextPage && posts.length > 0 && (
          <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>You're all caught up</span>
          </div>
        )}
      </div>
    </div>
  );
}
