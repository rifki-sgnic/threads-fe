import { useAuth } from '@/features/auth/useAuth';
import { Composer } from '@/features/feed/Composer';
import { FeedList } from '@/features/feed/FeedList';
import { Button } from '@/components/ui/Button';
import { LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';

export function HomePage() {
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }

  const initials = user.username ? user.username.slice(0, 2).toUpperCase() : 'U';

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-bold text-lg shadow-sm">
              @
            </div>
            <span className="font-bold text-xl tracking-tight">Threads</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to={`/u/${user.username}`}
              className="flex items-center gap-2 rounded-full py-1 px-2.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-800 text-[11px] font-bold">
                {initials}
              </div>
              <span className="hidden sm:inline font-semibold">{user.username}</span>
            </Link>

            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-muted-foreground hover:text-foreground h-8 px-2.5"
              title="Log out"
            >
              <LogOut className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline text-xs">Log Out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main feed container */}
      <main className="mx-auto max-w-2xl px-4 py-6">
        <div className="space-y-6">
          {/* Composer on top */}
          <Composer />

          {/* Feed list with infinite scroll below */}
          <FeedList />
        </div>
      </main>
    </div>
  );
}
