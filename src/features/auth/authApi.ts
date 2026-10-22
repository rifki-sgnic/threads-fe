import { api } from '@/api/client';
import type { User, Me, TokenResponse, RegisterRequest, LoginRequest } from '@/api/types';

export async function registerUser(payload: RegisterRequest): Promise<User> {
  return api<User>('/auth/register', {
    method: 'POST',
    body: payload,
  });
}

export async function loginUser(payload: LoginRequest): Promise<TokenResponse> {
  return api<TokenResponse>('/auth/login', {
    method: 'POST',
    body: payload,
  });
}

export async function fetchMe(): Promise<Me> {
  return api<Me>('/me', {
    method: 'GET',
  });
}
