# CLAUDE.md — car-rental-frontend-reactjs (frontend repo)

React admin app. A fresh Vite + React + TypeScript project that uses components from the
TailAdmin React Pro template (`../tailadmin-react-typescript-pro-2.0-main/`, read-only).
Workspace rules in `../CLAUDE.md` also apply.
This repo has no docs folder. All project docs live in `../car-rental-backend-nestjs/docs/` — see the index in `../CLAUDE.md`.

## Stack
React, Vite, TypeScript, Tailwind (via TailAdmin), React Router, TanStack Query.

## Conventions
- Never copy TailAdmin wholesale. Copy a component only when a screen needs it, together with
  everything it imports (styles, icons, hooks, contexts). Keep TailAdmin's file layout for copied pieces.
- Before writing a new UI component, check whether TailAdmin already has one.
- The foundation copied in M0: Tailwind setup and theme, fonts, app shell (layout, sidebar, header). Dark mode was
  left out on purpose (D20): do not add `dark:` classes.
- API calls only through the client generated from car-rental-backend-nestjs's OpenAPI document.
  Never hand-write request or response types for API data.
- All server data through TanStack Query. No ad-hoc fetch calls in components.
  - `src/api/queryClient.ts` is the only TanStack Query configuration: the `QueryClient`, its defaults, and
    every query key (`queryKeys`, hierarchical, e.g. `["drivers", "list", params]`).
  - One file per feature, `src/api/<feature>.queries.ts`. Every `useQuery` / `useMutation` is wrapped in a
    custom hook there (e.g. `useDrivers(params)`, `useApproveApplication()`). Screens call only these hooks,
    never `useQuery` / `useMutation` directly. Inside the file, build each query with `queryOptions(...)` so
    the key and fetch function stay together.
  - Exception: the `/auth/me` session query lives in `src/context/AuthContext.tsx` (its key is `queryKeys.me`).
- Display money from integer cents with one shared formatter. Never do money math in the UI.
- Lists use server-side pagination.

## Commands
<!-- Fill in once the scaffold exists -->
- Install: `npm install`
- Dev: `npm run dev` (http://localhost:5173)
- Build: `npm run build` (runs `tsc -b` then `vite build`)
- Lint: `npm run lint`
- Format: `npm run format` (Prettier, double quotes; run before committing)
- Regenerate API client: (added with the API client step)
