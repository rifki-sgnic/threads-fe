import type { components } from './schema';

export type User = components['schemas']['User'];
export type Me = components['schemas']['Me'];
export type Profile = components['schemas']['Profile'];
export type Post = components['schemas']['Post'];
export type PostWithStats = components['schemas']['PostWithStats'];
export type UserItem = components['schemas']['UserItem'];
export type ApiErrorResponse = components['schemas']['Error'];

export type RegisterRequest = components['schemas']['RegisterRequest'];
export type LoginRequest = components['schemas']['LoginRequest'];
export type TokenResponse = components['schemas']['TokenResponse'];
export type UpdateMeRequest = components['schemas']['UpdateMeRequest'];

export interface Page<T> {
  data: T[];
  next_cursor: string | null;
}

export const LIMITS = {
  username: [3, 30] as const,
  password: [8, 72] as const,
  post: 500,
  bio: 160,
} as const;
