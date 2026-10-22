import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { api } from '@/api/client';
import type { Page, PostWithStats, Post } from '@/api/types';

export function useFeed() {
  return useInfiniteQuery({
    queryKey: ['feed'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api<Page<PostWithStats>>('/feed', {
        query: { cursor: pageParam, limit: 20 },
      }),
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) =>
      api<Post>('/posts', {
        method: 'POST',
        body: { content },
      }),
    onSuccess: (newPost) => {
      // Complete stats per guide section 10 before inserting into cache
      const completedPost: PostWithStats = {
        ...newPost,
        like_count: 0,
        reply_count: 0,
        liked_by_me: false,
      };

      queryClient.setQueryData<InfiniteData<Page<PostWithStats>>>(['feed'], (old) => {
        if (!old || old.pages.length === 0) {
          return {
            pages: [{ data: [completedPost], next_cursor: null }],
            pageParams: [undefined],
          };
        }

        const firstPage = old.pages[0];
        return {
          ...old,
          pages: [
            {
              ...firstPage,
              data: [completedPost, ...firstPage.data],
            },
            ...old.pages.slice(1),
          ],
        };
      });
    },
  });
}
