import { z } from 'zod';
import { LIMITS } from '@/api/types';

export const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z
    .string()
    .min(LIMITS.password[0], `Password must be at least ${LIMITS.password[0]} characters`)
    .max(LIMITS.password[1], `Password must be at most ${LIMITS.password[1]} characters`),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(LIMITS.username[0], `Username must be at least ${LIMITS.username[0]} characters`)
    .max(LIMITS.username[1], `Username must be at most ${LIMITS.username[1]} characters`)
    .regex(/^[a-zA-Z0-9]+$/, 'Username can only contain letters and numbers (no spaces or symbols)'),
  email: z.string().trim().email('Please enter a valid email address'),
  password: z
    .string()
    .min(LIMITS.password[0], `Password must be at least ${LIMITS.password[0]} characters`)
    .max(LIMITS.password[1], `Password must be at most ${LIMITS.password[1]} characters`),
});

export type RegisterFormData = z.infer<typeof registerSchema>;
