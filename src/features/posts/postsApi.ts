import { api } from '@/api/client';
import type { Post, PostWithStats } from '@/api/types';

export async function fetchPost(id: number): Promise<PostWithStats> {
  return api<PostWithStats>(`/posts/${id}`, {
    method: 'GET',
    optionalAuth: true,
  });
}

export async function fetchReplies(id: number): Promise<{ data: PostWithStats[] }> {
  return api<{ data: PostWithStats[] }>(`/posts/${id}/replies`, {
    method: 'GET',
    optionalAuth: true,
  });
}

export async function likePostApi(id: number): Promise<void> {
  return api<void>(`/posts/${id}/like`, {
    method: 'POST',
  });
}

export async function unlikePostApi(id: number): Promise<void> {
  return api<void>(`/posts/${id}/like`, {
    method: 'DELETE',
  });
}

export async function deletePostApi(id: number): Promise<void> {
  return api<void>(`/posts/${id}`, {
    method: 'DELETE',
  });
}

export async function createReplyApi(content: string, parentId: number): Promise<Post> {
  return api<Post>('/posts', {
    method: 'POST',
    body: {
      content,
      parent_id: parentId,
    },
  });
}
