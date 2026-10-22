const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

let token: string | null = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

// Callbacks for global auth state invalidation on 401
type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

export function getToken(): string | null {
  return token;
}

export function setToken(t: string | null): void {
  token = t;
  if (typeof window !== 'undefined') {
    if (t) {
      localStorage.setItem('token', t);
    } else {
      localStorage.removeItem('token');
    }
  }
}

export class ApiError extends Error {
  status: number;
  requestId?: string;

  constructor(status: number, message: string, requestId?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.requestId = requestId;
  }
}

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  /**
   * If true, this is a public endpoint that optionally accepts a token.
   * If a 401 response occurs due to an expired/broken token, the token is cleared
   * and the request is retried once without authorization.
   */
  optionalAuth?: boolean;
}

export async function api<T>(
  path: string,
  { method = 'GET', body, query, headers: customHeaders, optionalAuth = false }: ApiOptions = {}
): Promise<T> {
  const url = new URL(path, BASE_URL);

  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) {
        url.searchParams.set(k, String(v));
      }
    }
  }

  const headers: Record<string, string> = {
    ...customHeaders,
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const requestId = res.headers.get('X-Request-ID') ?? undefined;

    if (res.status === 401) {
      const hadToken = Boolean(token);
      setToken(null);

      // If this was a public endpoint with optional auth and we had sent a token,
      // retry once anonymously as instructed by the guide.
      if (optionalAuth && hadToken) {
        return api<T>(path, {
          method,
          body,
          query,
          headers: customHeaders,
          optionalAuth: false, // prevent infinite loop
        });
      }

      // Notify global auth listeners (e.g., AuthContext) so user session is cleared
      unauthorizedListeners.forEach((listener) => {
        try {
          listener();
        } catch {
          // ignore listener errors
        }
      });
    }

    const errorMessage = data?.error || (res.statusText || 'Something went wrong');
    throw new ApiError(res.status, errorMessage, requestId);
  }

  return data as T;
}
