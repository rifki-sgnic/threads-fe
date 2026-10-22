import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute, GuestRoute } from './guards';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { HomePage } from '@/pages/HomePage';
import { PostDetailPage } from '@/features/posts/PostDetailPage';

export const router = createBrowserRouter([
  // Protected routes
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <HomePage />,
      },
    ],
  },
  // Public route with optional auth
  {
    path: '/post/:id',
    element: <PostDetailPage />,
  },
  // Guest-only routes
  {
    element: <GuestRoute />,
    children: [
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        path: '/register',
        element: <RegisterPage />,
      },
    ],
  },
  // Fallback
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
