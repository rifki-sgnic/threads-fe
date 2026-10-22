# Threads Web (frontend)

## Context
Frontend for a Threads-style app. The backend is a REST API (Go) that is already built.
- API contract (source of truth): docs/openapi.yaml
- Behavior, screens, and milestones: docs/frontend-guide.md
Read both before writing code.

## Stack
React, TypeScript, Vite, React Router, TanStack Query v5, react-hook-form + zod, Tailwind.

## Commands
- npm run dev
- npm run build
- npm run lint
- npm test

## Rules
- Never invent endpoints or fields. If something is not in openapi.yaml, ask.
- Generate API types from openapi.yaml (openapi-typescript). Do not hand-write response types.
- Render user content as text only. Never use dangerouslySetInnerHTML.
- All API calls go through src/api/client.ts.
- Work one milestone at a time (guide section 13) and stop when its criteria are met.
- Before creating files, show a short plan and the key code for review.