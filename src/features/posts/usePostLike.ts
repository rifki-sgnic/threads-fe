import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { likePostApi, unlikePostApi } from './postsApi';
import { updatePostInAllCaches } from './cacheUtils';
import type { PostWithStats } from '@/api/types';

export function usePostLike(post: PostWithStats) {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async () => {
      if (!isAuthenticated) {
        navigate('/login');
        return;
      }
      if (post.liked_by_me) {
        await unlikePostApi(post.id);
      } else {
        await likePostApi(post.id);
      }
    },
    onMutate: async () => {
      if (!isAuthenticated) return;

      const nextLiked = !post.liked_by_me;
      const nextCount = Math.max(0, post.like_count + (nextLiked ? 1 : -1));

      // Optimistically update all caches
      updatePostInAllCaches(queryClient, post.id, (p) => ({
        ...p,
        liked_by_me: nextLiked,
        like_count: nextCount,
      }));
    },
    onError: () => {
      // Revert cache on failure
      updatePostInAllCaches(queryClient, post.id, () => post);
    },
  });
}
