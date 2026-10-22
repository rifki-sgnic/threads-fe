import type { QueryClient, InfiniteData } from '@tanstack/react-query';
import type { PostWithStats, Page } from '@/api/types';

/**
 * Updates a post matching postId across all cached query structures (single post, feed, user posts, replies).
 */
export function updatePostInAllCaches(
  queryClient: QueryClient,
  postId: number,
  updater: (post: PostWithStats) => PostWithStats
): void {
  // 1. Single post query: ['post', postId]
  queryClient.setQueryData<PostWithStats>(['post', postId], (old) => (old ? updater(old) : old));

  // 2. Feed queries: ['feed']
  queryClient.setQueriesData<InfiniteData<Page<PostWithStats>>>(
    { queryKey: ['feed'] },
    (old) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          data: page.data.map((post) => (post.id === postId ? updater(post) : post)),
        })),
      };
    }
  );

  // 3. User posts queries: ['user-posts']
  queryClient.setQueriesData<InfiniteData<Page<PostWithStats>>>(
    { queryKey: ['user-posts'] },
    (old) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          data: page.data.map((post) => (post.id === postId ? updater(post) : post)),
        })),
      };
    }
  );

  // 4. Replies queries: ['replies', id]
  queryClient.setQueriesData<{ data: PostWithStats[] }>(
    { queryKey: ['replies'] },
    (old) => {
      if (!old) return old;
      return {
        ...old,
        data: old.data.map((post) => (post.id === postId ? updater(post) : post)),
      };
    }
  );
}

/**
 * Removes a deleted post from all caches and decrements parent reply_count if applicable.
 */
export function removePostFromAllCaches(
  queryClient: QueryClient,
  postId: number,
  parentId?: number | null
): void {
  // 1. Invalidate or remove single post query
  queryClient.removeQueries({ queryKey: ['post', postId] });
  queryClient.removeQueries({ queryKey: ['replies', postId] });

  // 2. Remove from feed
  queryClient.setQueriesData<InfiniteData<Page<PostWithStats>>>(
    { queryKey: ['feed'] },
    (old) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          data: page.data.filter((post) => post.id !== postId),
        })),
      };
    }
  );

  // 3. Remove from user posts
  queryClient.setQueriesData<InfiniteData<Page<PostWithStats>>>(
    { queryKey: ['user-posts'] },
    (old) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          data: page.data.filter((post) => post.id !== postId),
        })),
      };
    }
  );

  // 4. Remove from replies lists
  queryClient.setQueriesData<{ data: PostWithStats[] }>(
    { queryKey: ['replies'] },
    (old) => {
      if (!old) return old;
      return {
        ...old,
        data: old.data.filter((post) => post.id !== postId),
      };
    }
  );

  // 5. If this was a reply, decrement parent's reply_count in all caches
  if (parentId) {
    updatePostInAllCaches(queryClient, parentId, (parent) => ({
      ...parent,
      reply_count: Math.max(0, parent.reply_count - 1),
    }));
  }
}
