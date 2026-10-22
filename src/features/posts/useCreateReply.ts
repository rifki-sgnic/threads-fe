import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createReplyApi } from './postsApi';
import { updatePostInAllCaches } from './cacheUtils';
import type { PostWithStats } from '@/api/types';

export function useCreateReply(parentId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) => createReplyApi(content, parentId),
    onSuccess: (newReply) => {
      const completedReply: PostWithStats = {
        ...newReply,
        like_count: 0,
        reply_count: 0,
        liked_by_me: false,
      };

      // 1. Add reply to bottom of replies list (oldest first per guide)
      queryClient.setQueryData<{ data: PostWithStats[] }>(['replies', parentId], (old) => ({
        data: old ? [...old.data, completedReply] : [completedReply],
      }));

      // 2. Increment parent post reply_count across all relevant caches
      updatePostInAllCaches(queryClient, parentId, (parent) => ({
        ...parent,
        reply_count: parent.reply_count + 1,
      }));
    },
  });
}
