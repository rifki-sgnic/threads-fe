import React, { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { setToken, getToken, onUnauthorized } from '@/api/client';
import { loginUser, registerUser, fetchMe } from './authApi';
import { AuthContext, type AuthContextValue } from './context';
import type { Me, LoginRequest, RegisterRequest } from '@/api/types';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const queryClient = useQueryClient();

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  // Handle global 401s from client.ts
  useEffect(() => {
    const unsubscribe = onUnauthorized(() => {
      setUser(null);
      queryClient.clear();
    });
    return unsubscribe;
  }, [queryClient]);

  // Session restore on mount
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      const storedToken = getToken();
      if (!storedToken) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const me = await fetchMe();
        if (isMounted) {
          setUser(me);
        }
      } catch {
        // If restoring session fails (e.g. 401 or invalid token), wipe token and user
        if (isMounted) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(
    async (payload: LoginRequest) => {
      const { token } = await loginUser(payload);
      setToken(token);
      const me = await fetchMe();
      setUser(me);
    },
    []
  );

  const register = useCallback(
    async (payload: RegisterRequest) => {
      // 1. Register account
      await registerUser(payload);
      // 2. Automatically log in with credentials per guide
      const { token } = await loginUser({
        email: payload.email,
        password: payload.password,
      });
      setToken(token);
      // 3. Fetch user profile
      const me = await fetchMe();
      setUser(me);
    },
    []
  );

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: Boolean(user),
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
