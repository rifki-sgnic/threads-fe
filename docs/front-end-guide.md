# Threads Frontend Guide

Version 1.1, October 19, 2026. The always-current API contract is at `GET /docs/openapi.yaml` (Swagger UI at `/docs`). Stack: React, Vite, TypeScript, Tailwind CSS, shadcn/ui.

## 1. Overview

The backend is a Threads-style JSON REST API. Users can register and log in, create posts and replies, like posts, follow other users, and read a home feed. This guide covers everything needed to build a frontend on top of it: the chosen stack, backend prerequisites, API conventions, the auth flow, pagination, data types, a screen-to-endpoint map, recommended UI behavior, current limitations, and the build order.

Backend features that exist today:

- Auth: register and log in (JWT)
- Posts: create, view, delete (owner only), nested replies, like and unlike
- Social: follow and unfollow, follower and following lists, profiles with stats, bio editing
- Feed: home feed of followed users plus your own posts, with cursor pagination

Decisions already made:

- Single-page app: React + Vite + TypeScript
- Styling: Tailwind CSS with shadcn/ui components
- Quality gates: lint and typecheck only. There are no automated tests for now; verification is the manual checklist in section 14.

## 2. Backend prerequisites (do these first)

Two things are needed in the backend before the frontend can work. If both are already in place, skip this section.

1. **CORS.** Browsers block requests from the frontend origin (for example `http://localhost:5173`) to the API at `http://localhost:8080` unless the API sends CORS headers. Add CORS middleware in Gin: take the allowed origins from an env var `CORS_ORIGINS`, allow the methods `GET POST PATCH DELETE OPTIONS`, allow the `Authorization` and `Content-Type` headers, and expose `X-Request-ID` so the frontend can read it. The token travels in a header (not a cookie), so `AllowCredentials` is not needed. During development an alternative is to proxy through the dev server (Vite `server.proxy`) so the browser only talks to one origin.
2. **`GET /me`.** Login returns only a token, without a username, but almost every screen needs to know who is logged in (hiding the follow button on your own profile, showing the delete menu on your own posts, and so on). Contract: login required, 200 returns a `Me` object, 401 if the token is invalid.

Strongly recommended, not blocking but affecting UX:

- User search or discovery. Today the only way to find a user is to already know their username, so a new account's feed will be empty.
- Rate limiting on the login endpoint (security, not functionality).

## 3. API conventions

- Development base URL: `http://localhost:8080`. Keep it in a frontend env var (`VITE_API_URL`).
- All requests and responses are JSON (`Content-Type: application/json`), except `204 No Content`, which has no body.
- Errors are always an object with a single `error` string field and a matching HTTP status. Messages for domain errors (for example post not found) are safe to show. Messages for 400 body validation are raw technical validator text: validate on the client and show your own messages.
- IDs are integers. Timestamps are ISO 8601 strings: parse them with `new Date()` and display them relatively (for example with `Intl.RelativeTimeFormat`).
- `null` has meaning: `parent_id` null means a top-level post, and `next_cursor` null means the last page.
- Every response carries an `X-Request-ID` header. Show it on 5xx errors so the backend log entry is easy to find.
- Post content is plain text and may span several lines. Render it as text (React escapes it), never through `innerHTML`, and use `white-space: pre-wrap` so line breaks show.

Status codes you will meet: 200, 201 (register and create post), 204 (delete, like, follow), 400 (invalid input or cursor), 401 (token missing or invalid), 403 (not the owner), 404, 409 (username or email taken), 500, and 503 (`/ready` only).

## 4. Authentication

Flow:

1. `POST /auth/register` returns the user data, **without a token**. After success, continue to login (or call login automatically with the same credentials).
2. `POST /auth/login` returns `{ token }`.
3. Store the token and send it with every request: `Authorization: Bearer <token>`.
4. When the app opens, if a token is stored, call `GET /me` to restore the session. On 401, delete the token and show the login screen.
5. Logout just deletes the token on the client. There is no logout endpoint.

Token notes:

- It is a JWT valid for 24 hours by default. There is **no refresh token**, so users must log in again after it expires. Handle 401 globally: delete the token and redirect to login.
- `localStorage` is the simplest option but is exposed to XSS. Mitigate by never rendering user HTML and by setting a Content-Security-Policy when deploying.

Two kinds of endpoints:

- **Login required**: `/feed`, `GET /me`, `PATCH /me`, `POST /posts`, `DELETE /posts/:id`, like and unlike, follow and unfollow.
- **Public with optional auth**: post detail, replies, profile, a user's posts, followers, following. Send the token when you have one so `liked_by_me` and `is_following` are filled in. **Careful**: if the token you send is expired or broken, the server answers 401 instead of treating you as anonymous. For public endpoints, on a 401 delete the token and repeat the request once without it, so public pages do not break for users whose session has ended.

Registration input rules:

- `username`: 3 to 30 characters, letters and digits only (no underscore, dot, or space). Usernames are case-sensitive, so `Rifki` and `rifki` are different users.
- `email`: a valid email address.
- `password`: 8 to 72 characters.

## 5. Pagination (cursor)

All large lists (feed, a user's posts, followers, following) use the same pattern.

- Request: `?limit=20&cursor=<next_cursor>`. `limit` defaults to 20 and is capped at 50 (larger values become 50). The first page has no `cursor`.
- Response: `{ data: [...], next_cursor: string | null }`.
- While `next_cursor` is not null there are more pages. Send its value unchanged as the next `cursor`.
- The cursor is opaque: do not parse it, do not build it yourself, and do not reuse it across endpoints. A malformed cursor returns 400.
- Cursors are stable against new data: if new posts arrive while the user scrolls, later pages do not repeat or skip items.
- Exception: `GET /posts/:id/replies` has no cursor. It returns at most 50 direct replies, oldest first.

This pairs directly with infinite scroll (see the example in section 8).

## 6. Endpoint reference

Notation: **\[login\]** requires a token, **\[optional\]** accepts a token but does not need one.

Auth

- `POST /auth/register` body `{ username, email, password }`. 201 `User`. Errors: 400 validation, 409 username or email already taken.
- `POST /auth/login` body `{ email, password }`. 200 `{ token }`. Errors: 401 wrong credentials (the same message for a wrong email and a wrong password).

Your account

- `GET /me` **\[login\]** (prerequisite, see section 2). 200 `Me`.
- `PATCH /me` **\[login\]** body `{ bio }`. The `bio` field is required, at most 160 characters, and an empty string clears the bio. 200 `Me`.

Feed

- `GET /feed?limit&cursor` **\[login\]**. 200 `Page<PostWithStats>`. Top-level posts (not replies) from users you follow plus your own, newest first.

Posts

- `POST /posts` **\[login\]** body `{ content, parent_id? }`. `content` is 1 to 500 characters (surrounding whitespace is trimmed, and whitespace-only content is rejected with 400). Set `parent_id` to create a reply. 201 `Post` (without stats). Errors: 404 if `parent_id` does not exist.
- `GET /posts/:id` **\[optional\]**. 200 `PostWithStats`. 404 if it does not exist.
- `GET /posts/:id/replies` **\[optional\]**. 200 `{ data: PostWithStats[] }`.
- `DELETE /posts/:id` **\[login\]**. 204. Errors: 403 not the owner, 404. All replies and likes of the post are deleted with it.
- `POST /posts/:id/like` **\[login\]**. 204. Idempotent: liking twice still returns 204 and is recorded once. 404 if the post does not exist.
- `DELETE /posts/:id/like` **\[login\]**. 204. Idempotent.

Users

- `GET /users/:username` **\[optional\]**. 200 `Profile`. 404 if it does not exist.
- `GET /users/:username/posts?limit&cursor` **\[optional\]**. 200 `Page<PostWithStats>`, top-level posts only.
- `GET /users/:username/followers?limit&cursor` **\[optional\]**. 200 `Page<UserItem>`, most recent follower first.
- `GET /users/:username/following?limit&cursor` **\[optional\]**. 200 `Page<UserItem>`, most recently followed first.
- `POST /users/:username/follow` **\[login\]**. 204, idempotent. 400 when trying to follow yourself, 404 if the user does not exist.
- `DELETE /users/:username/follow` **\[login\]**. 204, idempotent.

TypeScript types can be generated from the spec:

```bash
npx openapi-typescript http://localhost:8080/docs/openapi.yaml -o src/api/schema.d.ts
```

## 7. Data types (TypeScript)

These hand-written types match the spec. They are useful before the generator is set up, and later `src/api/types.ts` can re-export friendlier names from the generated `schema.d.ts`.

```ts
export type ID = number;

export interface Author { id: ID; username: string }

export interface Post {
  id: ID;
  content: string;
  parent_id: ID | null; // null = top-level post, set = reply
  author: Author;
  created_at: string; // ISO 8601
}

export interface PostWithStats extends Post {
  like_count: number;
  reply_count: number;
  liked_by_me: boolean; // always false for anonymous viewers
}

export interface Page<T> {
  data: T[];
  next_cursor: string | null; // null = last page
}

// register response
export interface User {
  id: ID; username: string; email: string; bio: string;
  created_at: string; updated_at: string;
}

// your own data (GET and PATCH /me)
export interface Me { id: ID; username: string; email: string; bio: string }

export interface Profile {
  id: ID; username: string; bio: string;
  follower_count: number; following_count: number; post_count: number;
  is_following: boolean; // false for anonymous viewers and your own profile
  created_at: string;
}

export interface UserItem {
  id: ID; username: string; bio: string;
  is_following: boolean; // relative to the viewer
}

// same limits as the backend, used for form validation
export const LIMITS = {
  username: [3, 30],
  password: [8, 72],
  post: 500,
  bio: 160,
} as const;
```

## 8. API client and infinite scroll examples

A thin `fetch` wrapper that handles the token, errors, and 204:

```ts
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

let token: string | null = localStorage.getItem('token');

export function setToken(t: string | null) {
  token = t;
  if (t) localStorage.setItem('token', t);
  else localStorage.removeItem('token');
}

export class ApiError extends Error {
  status: number;
  requestId?: string;

  constructor(status: number, message: string, requestId?: string) {
    super(message);
    this.status = status;
    this.requestId = requestId;
  }
}

type Opts = {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | undefined>;
};

export async function api<T>(path: string, { method = 'GET', body, query }: Opts = {}): Promise<T> {
  const url = new URL(path, BASE_URL);
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }

  const res = await fetch(url, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token) setToken(null); // token expired or broken
    throw new ApiError(
      res.status,
      data?.error ?? 'Something went wrong',
      res.headers.get('X-Request-ID') ?? undefined,
    );
  }
  return data as T;
}
```

Infinite scroll with TanStack Query v5 (the cursor pattern maps directly onto `useInfiniteQuery`):

```ts
export function useFeed() {
  return useInfiniteQuery({
    queryKey: ['feed'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api<Page<PostWithStats>>('/feed', { query: { cursor: pageParam, limit: 20 } }),
    getNextPageParam: (last) => last.next_cursor ?? undefined,
  });
}
```

Build similar hooks for a user's posts, followers, and following, with a `queryKey` that includes the username, for example `['user-posts', username]`.

## 9. Screen-to-endpoint map

Recommended routes use `/u/:username` for profiles (usernames contain only letters and digits, so they are safe in a URL).

**Login and Register** (`/login`, `/register`)

- Register, then log in automatically, then call `GET /me`.
- Validate on the client following section 4. Show 409 as username or email already taken, and 401 as wrong email or password.

**Home** (`/`, login required)

- Composer on top (`POST /posts`) and the feed below (`GET /feed` with infinite scroll).
- Each post card: initials avatar, username (link to the profile), relative time, content, like button with count, reply button with count, and a delete menu when `author.id === me.id`.
- Clicking a card opens the post detail.
- An empty feed on a new account: show a prompt to find and follow people (see the limitations in section 11).
- Feed pagination loads the next page when the list bottom comes into view.

**Post detail** (`/post/:id`)

- `GET /posts/:id` and `GET /posts/:id/replies`.
- If `parent_id` is not null, show a link to the parent post (one level up, fetched with `GET /posts/:parent_id`).
- The reply composer uses `POST /posts` with this post's id as `parent_id`. After success, add the reply to the list and increase `reply_count`.
- A reply can be replied to, so threads are trees. The replies endpoint returns direct children only. For a reply whose `reply_count` is above 0, show a View replies link that opens that reply's own detail page.
- Deleting from this page: after the 204, go back and clear the related caches.

**Profile** (`/u/:username`)

- Header from `GET /users/:username`: username, bio, `follower_count`, `following_count`, `post_count`.
- A Follow or Unfollow button driven by `is_following`. Hide it on your own profile (compare `username` with `me.username`).
- The post list from `GET /users/:username/posts` with infinite scroll.
- The follower and following numbers open the list screens.
- On your own profile, an Edit profile button opens a bio form (`PATCH /me`).

**Followers and Following** (`/u/:username/followers`, `/u/:username/following`)

- Infinite scroll. Each row has a follow button based on `is_following`. Hide the button on your own row.

**Other screens**

- A not-found screen for 404 (post or user does not exist).
- An error boundary for 5xx that shows the `X-Request-ID`.

## 10. Recommended UI behavior

**Optimistic updates for like and follow.** The endpoints are idempotent, so optimistic updates are safe and requests can be repeated:

- Like: flip `liked_by_me` and change `like_count` by 1 immediately, send the request, and restore the old state on failure. A post can appear in several caches at once (feed, profile, detail, replies), so write one helper that updates the post with a given id in every relevant query cache (for example with `queryClient.setQueriesData`).
- Follow: change `is_following` on the profile and on list rows, and adjust the target's `follower_count` by 1.
- Prevent double clicks while a request is in flight.

**After creating a post.** The `POST /posts` response is a `Post` without stats. Before inserting it into a feed or replies cache, complete it with `like_count: 0`, `reply_count: 0`, and `liked_by_me: false`. Put it at the top of the feed (or at the bottom of the replies list, which is ordered oldest first).

**After deleting a post.** Remove it from every cache that holds it. If it was a reply, decrease its parent's `reply_count`. Remember that the server also deletes the post's replies.

**Client-side form validation.** Use the limits in `LIMITS` through zod schemas with react-hook-form. Show the remaining characters in the composer (maximum 500) and disable the send button when the content is empty or whitespace-only.

**Error mapping:**

- 401 on a login-required endpoint: clear the session and redirect to login (remember the target page to return to after login).
- 403: show a no-permission message.
- 404: show a not-found page.
- 409 on register: username or email already taken.
- 400 on a cursor: reset the list and reload from the first page.
- 5xx and network failures: a Retry button, plus the `X-Request-ID`.

**UI states.** Prepare loading skeletons, empty states (empty feed, no posts yet, no replies yet), and an end-of-list marker when `next_cursor` is null.

## 11. Current backend limitations

Things the backend cannot do, which the UI design must accept or postpone:

- There is no refresh token. The session ends when the token expires.
- There is no user search, explore page, or who-to-follow suggestion.
- Posts cannot be edited, only deleted.
- There are no images, media, or avatars. Use an initials avatar built from the username.
- There is no repost, quote, or notification.
- There is no list of who liked a post (only the count).
- Replies do not appear in the feed or on profiles, so there is no Replies tab on a profile.
- Replies of one post are capped at 50 and have no cursor.
- There is no change password, account deletion, or email verification.
- Usernames are case-sensitive (see section 4).
- There is no rate limiting yet.

## 12. Tech stack and structure

The stack is decided. The API authenticates with a bearer token in a header, so a plain single-page app is the simplest fit. Server-side rendering would add complexity (cookie-based auth, a second server) that this project does not need.

- **React + TypeScript + Vite**: the SPA foundation
- **React Router**: routing and login guards
- **TanStack Query v5**: data fetching, cache, and infinite scroll
- **react-hook-form + zod**: forms, with zod schemas that mirror `LIMITS`
- **Tailwind CSS + shadcn/ui**: styling and accessible components. shadcn/ui components are copied into the repo, so they can be restyled freely.
- **openapi-typescript**: API types generated from the spec
- **ESLint + `tsc --noEmit`**: the only automated quality gates for now

Suggested shadcn/ui components: Button, Input, Textarea, Form, Dialog (edit profile), DropdownMenu (post menu), Avatar (initials fallback), Skeleton, Sonner (error toasts).

Theming: keep colors, radius, and shadows as CSS variables (shadcn/ui already works this way), so a light and dark toggle and a custom visual style can be applied without touching component code.

Suggested folder structure:

```
src/
  api/          client.ts, schema.d.ts, hooks per resource
  features/
    auth/       login, register, session
    feed/       composer, feed list
    posts/      post card, detail, replies, like
    profile/    profile header, follow, edit bio, user lists
  components/   shared UI (shadcn/ui lives in components/ui)
  routes/       route definitions and the login guard
```

Quality gates. Add them as npm scripts and run all three before every commit:

```bash
npm run lint        # eslint .
npm run typecheck   # tsc --noEmit
npm run build       # vite build, catches what the first two miss
```

## 13. Build order

- **M0: Setup.** Add CORS and `GET /me` to the backend. Scaffold the project with Vite (React + TypeScript template), add Tailwind CSS, initialize shadcn/ui, set `VITE_API_URL`, add the `lint` and `typecheck` scripts, and generate API types from the spec. Done when `npm run lint`, `npm run typecheck`, and `npm run build` all pass on the empty app.
- **M1: Foundation and auth.** API client, global 401 handling, register and login screens, session restore through `GET /me`, route guards.
- **M2: Feed.** Composer, feed list with infinite scroll, post card, skeletons and empty states.
- **M3: Posts.** Detail page, replies, create reply, like with an optimistic update, delete post.
- **M4: Profile and social.** Profile page, follow and unfollow, a user's posts, follower and following lists, edit bio.
- **M5: Polish.** Error boundary, 404 page, friendly error messages, responsive layout, basic accessibility (keyboard focus, labels, contrast).
- **M6: Final verification.** Run all three quality gates and walk through the full checklist in section 14 against the running backend.

A milestone is done only when the quality gates pass and the matching part of the checklist has been verified by hand.

## 14. QA checklist

There are no automated tests, so this list is the test plan. Run it against the real backend (`docker compose up`).

- Register, log in, refresh the page: the session persists. Delete the token manually or wait for it to expire: you are sent to login.
- Public pages (post detail, profile) still open when the token has expired.
- Feed: newest first, no duplicates between pages, the last page stops loading, and a new account shows the empty state.
- Create a post: it appears at the top of the feed with zero stats. Empty content or 501 characters cannot be sent.
- Reply: it appears in the detail view, the parent's `reply_count` goes up, and a reply to a reply can be opened.
- Like: two fast clicks do not corrupt the count, a network failure restores the previous state, and the count is consistent between feed and detail.
- Delete: the option appears only on your own posts, and replies and caches are cleaned up.
- Follow: the button does not appear on your own profile or row, `follower_count` changes, and list buttons match the profile.
- Edit bio: the 160 limit holds, and clearing the bio works.
- Content containing HTML characters (for example a script tag) is shown as plain text.
- 404 and 5xx show a clear screen, and 5xx includes the `X-Request-ID`.
