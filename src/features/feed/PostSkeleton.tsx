export function PostSkeleton() {
  return (
    <div className="border-b border-border bg-card p-4 sm:p-5 animate-pulse">
      <div className="flex gap-3 sm:gap-4">
        {/* Avatar skeleton */}
        <div className="h-10 w-10 shrink-0 rounded-full bg-muted" />

        {/* Content skeleton */}
        <div className="flex-1 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="h-4 w-28 rounded bg-muted" />
            <div className="h-3 w-10 rounded bg-muted" />
          </div>
          <div className="space-y-1.5">
            <div className="h-4 w-11/12 rounded bg-muted" />
            <div className="h-4 w-3/4 rounded bg-muted" />
          </div>
          <div className="flex gap-6 pt-2">
            <div className="h-4 w-10 rounded bg-muted" />
            <div className="h-4 w-10 rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function FeedSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="divide-y divide-border rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
      {Array.from({ length: count }).map((_, i) => (
        <PostSkeleton key={i} />
      ))}
    </div>
  );
}
