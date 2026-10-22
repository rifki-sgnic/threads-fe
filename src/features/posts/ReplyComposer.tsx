import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { useCreateReply } from './useCreateReply';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ApiError } from '@/api/client';
import { LIMITS } from '@/api/types';

interface ReplyComposerProps {
  parentId: number;
}

export function ReplyComposer({ parentId }: ReplyComposerProps) {
  const { user, isAuthenticated } = useAuth();
  const createReply = useCreateReply(parentId);
  const [content, setContent] = useState('');
  const [error, setError] = useState<{ message: string; requestId?: string } | null>(null);

  const remaining = LIMITS.post - content.length;
  const isTrimmedValid = content.trim().length > 0;
  const isWithinLimit = remaining >= 0;
  const canSubmit = isTrimmedValid && isWithinLimit && !createReply.isPending;

  const initials = user?.username ? user.username.slice(0, 2).toUpperCase() : 'U';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setError(null);
    try {
      await createReply.mutateAsync(content.trim());
      setContent('');
    } catch (err) {
      if (err instanceof ApiError) {
        setError({
          message: err.message || 'Failed to post reply',
          requestId: err.requestId,
        });
      } else {
        setError({ message: 'A network error occurred. Please try again.' });
      }
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl border border-border bg-muted/40 p-4 text-center">
        <p className="text-sm text-muted-foreground">
          <Link
            to="/login"
            className="font-medium text-foreground underline underline-offset-4 hover:text-neutral-600 dark:hover:text-neutral-300"
          >
            Log in
          </Link>{' '}
          to join the conversation and reply.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm transition-all">
      {error && (
        <div className="mb-4">
          <Alert variant="error" title="Could not reply" requestId={error.requestId}>
            {error.message}
          </Alert>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="flex gap-3 sm:gap-4">
          <div className="flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-800 text-xs font-bold text-foreground">
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Post your reply..."
              rows={2}
              className="w-full resize-none bg-transparent text-sm sm:text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
            />

            <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2.5">
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
                isLoading={createReply.isPending}
                className="font-semibold px-4"
              >
                Reply
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
