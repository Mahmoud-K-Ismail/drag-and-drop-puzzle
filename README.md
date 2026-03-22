# AI Code Puzzle

**Drag-and-drop code puzzle generator** — describe a programming task, get shuffled lines of code back, then rebuild the solution by dragging blocks into the right **order** (vertical) and **indentation** (horizontal). Each line includes a short AI-written explanation behind the **`?`** button.

### Live app

**[https://drag-and-drop-puzzle-chi.vercel.app/](https://drag-and-drop-puzzle-chi.vercel.app/)**

---

## How to use the app

### 1. OpenAI API key

Paste your **OpenAI API key** in the sidebar (starts with `sk-…`). The key is stored in your **browser’s LocalStorage** so you don’t have to re-enter it on the next visit. It is **never** hardcoded in the app or sent to our servers except as part of the generate request to OpenAI (via the Vercel API route).

### 2. Describe the task & generate

Type what you want (e.g. *“Write a function that uses a while loop to generate a fibonacci sequence”*) and click **Generate Puzzle**.

- **Output language** — Pick **JavaScript**, **TypeScript**, **Python**, **Java**, **C++**, or **Auto-detect** (model picks from your prompt).
- **Play mode** — **Two-lane puzzle** (code bank + solution slots) or **Order list** (one shuffled list, reorder and use **− / +** for indent).

### 3. Quick examples

The **Quick examples** dropdown has **3** ready-made prompts. If your prompt box already has text, choosing an example asks for **confirmation** before replacing it.

For those three prompts with a **specific** language (not **Auto**), the app uses **bundled reference puzzles** (fast, no API call, no key required). For **Auto** or any **custom** prompt, generation goes through **OpenAI** and you need a valid key.

### 4. Solving the puzzle

- **Two-lane:** Drag lines from **Code Bank** into **Solution Area** slots. While dragging over the solution, use the **indent ticks** at the top and horizontal position — indent **snaps** to discrete levels on drop; slots give **vertical** placement feedback.
- **Order list:** Drag to reorder; adjust indent with **−** and **+** beside each row.

### 5. Per-line help

Hover a block and click **`?`** to see a **pre-generated** explanation for that line (produced together with the code when using the API, or shipped with bundled examples).

### 6. Toolbar

| Control | What it does |
|--------|----------------|
| **Undo / Redo** | Reverts moves and indent changes (history is limited). |
| **Hint** | Picks a **random** misplaced line and shows **arrows** toward the fix. **10 second** cooldown before the next hint. |
| **Check solution** | If the board isn’t full, you’ll see a **message** to finish placing lines — **no** red borders until everything is placed. When full, **wrong** lines get a **red outline**; when everything is correct, a **success** dialog appears. |

**Keyboard:** **Ctrl/Cmd+Z** undo, **Ctrl/Cmd+Y** or **Ctrl/Cmd+Shift+Z** redo (when the puzzle view is focused).

### 7. Duplicate lines

If several lines are **identical**, only their **indent levels** must match the multiset of expected indents — swapping two duplicate lines does not break the solution.

---

## Syntax highlighting (Monaco)

Each block is highlighted with **Monaco Editor’s tokenizer** via the **colorize** API (efficient for many small snippets). This is not a full multi-line Monaco editor inside every card.

---

## Tech stack

- **React 19** + **TypeScript**
- **Vite**
- **Zustand** — UI and puzzle state  
- **@dnd-kit** — drag-and-drop  
- **@monaco-editor/react** — syntax highlighting for line snippets  
- **Zod** — API request/response validation  
- **Vercel** — hosting + **serverless** `api/generate.ts` (OpenAI call stays server-side; only your key from the client is passed per request)

---

## Local development

```bash
npm install
```

| Command | Use when |
|--------|-----------|
| `npm run dev` | Frontend only (**no** `/api/generate` — generate will fail unless you proxy elsewhere). |
| `npx vercel dev` | **Full stack** locally — same as production (Vite + API). |
| `npm run build` | Typecheck + production bundle. |
| `npm run lint` | ESLint. |
| `npm run preview` | Serve the built `dist/` locally. |

### `vercel dev` and SPA rewrites

Do **not** add a catch-all rewrite like `"/(.*)" → "/index.html"` in `vercel.json` while using **Vite + `vercel dev`**. That rewrite can apply to `/@vite/client` and `/src/...`, break the dev server, and cause *Failed to parse source for import analysis* on `index.html`.

This app uses a single `/` route, so production works without a global SPA rewrite. For deep links later, use something like [vite-plugin-vercel](https://github.com/magne4000/vite-plugin-vercel/) or **narrow** rewrites that exclude `/src/*`, `/@vite/*`, etc.

### Generation timeouts

`/api/generate` returns **code + per-line explanations in one call**, which can take **30–90+ seconds**. The client aborts after **2 minutes**.

- `vercel.json` sets **`maxDuration: 60`** for `api/generate.ts` — your Vercel plan must allow it (free/hobby limits may be lower).
- If generation fails: check the key, try **Auto** language, or shorten the prompt.

---

## Project layout (overview)

| Area | Role |
|------|------|
| `src/app/` | App shell, routes, global styles |
| `src/pages/` | Page-level composition (e.g. playground) |
| `src/widgets/` | Large UI units (`setup-panel`, `puzzle-board`, `ordering-board`) |
| `src/features/` | Domain state (`puzzle` store, validation) |
| `src/shared/` | API clients, config, utilities |
| `api/` | Vercel function — OpenAI generation |

---

## Documentation

- **[docs/system-design.md](docs/system-design.md)** — architecture and flows  
- **[docs/challenges-and-decisions.md](docs/challenges-and-decisions.md)** — UX/engineering tradeoffs (indent snapping, validation, dual layouts, etc.)

SVG sources for diagrams: **`github-photos/`**

---

## Deployment (Vercel)

**Production:** [drag-and-drop-puzzle-chi.vercel.app](https://drag-and-drop-puzzle-chi.vercel.app/)

Connect the repo to Vercel; use the defaults with **`vercel.json`** (`buildCommand`, `outputDirectory`, `api/generate` duration). Set **no OpenAI key in Vercel env for end users** — users paste their own key in the app.

Optional: set `OPENAI_MODEL` in Vercel project env if you override the default in `api/generate.ts`.

---

## Repository & AI-assisted development

Git history uses structured commit messages. Where required by coursework, **AI tool usage** is noted in commit bodies (**AI usage:** …).

---

## License / course use

Built for an educational **technical task** (drag-and-drop code puzzle). Adapt and cite per your institution’s rules.
