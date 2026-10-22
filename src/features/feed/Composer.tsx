import { useState, type FormEvent } from 'react';
import { useAuth } from '@/features/auth/useAuth';
import { useCreatePost } from './feedApi';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ApiError } from '@/api/client';
import { LIMITS } from '@/api/types';

export function Composer() {
  const { user } = useAuth();
  const createPost = useCreatePost();
  const [content, setContent] = useState('');
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);

  const remaining = LIMITS.post - content.length;
  const isTrimmedValid = content.trim().length > 0;
  const isWithinLimit = remaining >= 0;
  const canSubmit = isTrimmedValid && isWithinLimit && !createPost.isPending;

  const initials = user?.username ? user.username.slice(0, 2).toUpperCase() : 'U';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setError(null);
    try {
      await createPost.mutateAsync(content.trim());
      setContent('');
    } catch (err) {
      if (err instanceof ApiError) {
        setError({
          message: err.message || 'Failed to publish post',
          requestId: err.requestId,
        });
      } else {
        setError({ message: 'A network error occurred. Please try again.' });
      }
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm transition-all">
      {error && (
        <div className="mb-4">
          <Alert variant="error" title="Could not post" requestId={error.requestId}>
            {error.message}
          </Alert>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="flex gap-3 sm:gap-4">
          {/* User initials avatar */}
          <div className="flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-800 text-sm font-bold text-foreground">
            {initials}
          </div>

          {/* Text input area */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-foreground mb-1">
              {user?.username}
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start a thread..."
              rows={3}
              className="w-full resize-none bg-transparent text-sm sm:text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
            />

            <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3">
              <span
                className={`text-xs font-mono transition-colors ${
                  remaining < 0
                    ? 'text-destructive font-bold'
                    : remaining <= 20
                    ? 'text-amber-500 font-medium'
                    : 'text-muted-foreground'
                }`}
              >
                {remaining}
              </span>

              <Button
                type="submit"
                size="sm"
                disabled={!canSubmit}
                isLoading={createPost.isPending}
                className="font-semibold px-4"
              >
                Post
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
