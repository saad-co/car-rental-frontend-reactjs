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
- The foundation copied in M0: Tailwind setup and theme, fonts, dark mode, app shell (layout, sidebar, header).
- API calls only through the client generated from car-rental-backend-nestjs's OpenAPI document.
  Never hand-write request or response types for API data.
- All server data through TanStack Query. No ad-hoc fetch calls in components.
- Display money from integer cents with one shared formatter. Never do money math in the UI.
- Lists use server-side pagination.

## Commands
<!-- Fill in once the scaffold exists -->
- Install:
- Dev:
- Build:
- Regenerate API client:
