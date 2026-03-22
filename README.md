# Drag-and-Drop Puzzle Generator

AI-powered educational web app that transforms programming tasks into interactive drag-and-drop code puzzles.

## Tech Stack

- React + TypeScript
- Zustand
- dnd-kit
- Monaco Editor
- Zod
- Vercel Serverless Functions

## Scripts

- `npm run dev` — start Vite only (no `/api/*` — use `vercel dev` for full stack)
- `npm run build` — type-check and production build
- `npm run lint` — lint the codebase
- `npm run preview` — preview production build locally
- `npx vercel dev` — local Vite + `/api` (same as production)

### `vercel dev` and `index.html` parse errors

Do **not** add a catch-all SPA rewrite like `"/(.*)" → "/index.html"` in `vercel.json` while using Vite + `vercel dev`. That rewrite is applied to **every** request, including `/src/main.tsx` and `/@vite/client`, so Vite receives HTML instead of JS and throws *Failed to parse source for import analysis* on `index.html`.

This app only uses the `/` route, so production still works without that rewrite. If you add deep links later, use [vite-plugin-vercel](https://github.com/magne4000/vite-plugin-vercel/) or narrow rewrites so `/src/*`, `/@vite/*`, etc. are excluded.

### Generation timeouts

`/api/generate` asks the model for **code and line explanations in one step**, which can take **30–90+ seconds** on a slow connection or busy API. The client waits up to **2 minutes** before aborting.

- **`vercel.json`** sets `maxDuration: 60` for `api/generate.ts` so production functions can run long enough (your Vercel plan must allow it; free/hobby limits may be lower—check the dashboard if deploys still cut off early).
- If you still see failures: confirm the key is valid, try **Auto** language instead of forcing C++, and shorten the task prompt.

## System Design Diagrams

All architecture and flow diagrams are documented here:

- [docs/system-design.md](docs/system-design.md)
- [docs/challenges-and-decisions.md](docs/challenges-and-decisions.md)

The underlying SVG sources are stored in:

- `github-photos/`
