import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deletePostApi } from './postsApi';
import { removePostFromAllCaches } from './cacheUtils';

export function useDeletePost(onSuccess?: () => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId }: { postId: number; parentId?: number | null }) =>
      deletePostApi(postId),
    onSuccess: (_data, variables) => {
      removePostFromAllCaches(queryClient, variables.postId, variables.parentId);
      onSuccess?.();
    },
  });
}
