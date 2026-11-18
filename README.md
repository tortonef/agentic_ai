# Interactive GenAI Lab: Personal Portfolio

A static, backend-free portfolio that works like an AI product: visitors explore three interactive
demos (an agentic workflow, a RAG pipeline and a prompt-engineering comparator) alongside projects,
skills and contact details.

**No API keys, no backend, no tracking.** Every demo runs in the browser as a deterministic
simulation and is labelled as such. Nothing calls an LLM.

## Stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · Framer Motion · React Flow (`@xyflow/react`) · Lucide icons

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # logic self-checks (RAG retrieval, agent engine)
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build locally
```

Requires Node 22.6+ (`npm test` runs TypeScript directly via Node's type stripping).

## Make it yours

All personal content lives in `src/config/`. Components never hard-code it.

| File | What to edit |
| --- | --- |
| `src/config/profile.ts` | Name, initials, role, hero copy, links (GitHub, LinkedIn, email), About text and facts |
| `src/config/projects.ts` | Project cards. Entries with `placeholder: true` show a badge; `repo: null` hides the button |
| `src/config/skills.ts` | Skill groups, icons and tool tags |
| `src/config/lab.ts` | Registry of lab demos |
| `public/cv.pdf` | Replace with your CV (keep the name, or change `links.cv`) |

Values in `[brackets]` are placeholders.

## Project structure

```
src/
  components/      Reusable UI: Navbar, Footer, Section, Button, Panel, badges, icons
  sections/        Page sections: Hero, Lab, Projects, About, Skills, Contact
  demos/
    agents/        Agentic AI Playground: engine.ts (deterministic run builder) + React Flow UI
    rag/           RAG Explorer: documents.ts (sample corpus) + pipeline.ts (real lexical retrieval)
    prompts/       Prompt Engineering Lab: examples.ts (prompts + outputs) + comparison UI
  config/          All editable content
  lib/             Small utilities (seeded PRNG, media-query hook, class names)
  styles/          Tailwind theme tokens and global styles
tests/             Assert-based logic checks, run with `npm test`
```

### Adding a demo

1. Create `src/demos/<name>/index.tsx` with a default-exported component.
2. Add an entry to `src/config/lab.ts` (id, title, tagline, Lucide icon, `lazy(() => import(...))`).

The tab, routing and code-splitting are handled for you. Each demo is its own chunk and only
downloads when opened (React Flow, for example, loads only with the agent demo).

## How the demos work

- **Agentic Playground**: the objective is routed by keyword intent (market research, report, automation)
  to a scripted plan. A seeded PRNG derived from the objective text varies the details, so the same
  input always gives the same run. Steps play back on a clock; node, edge and task states are derived from
  the steps revealed so far.
- **RAG Explorer**: genuinely computed. Sentence-aware chunking → TF-IDF vectors hashed into 64 dims
  (the "hashing trick", standing in for neural embeddings) → cosine top-k → hybrid re-rank
  (0.6·cosine + 0.4·keyword coverage) → relevance threshold → context prompt → extractive answer with
  citations. Off-topic questions are declined rather than answered.
- **Prompt Lab**: pre-written outputs for four techniques on three tasks, with side-by-side comparison.
  The ratings are illustrative, not benchmark results.

## Deploying to GitHub Pages

1. Push this project to a GitHub repository (branch `main`).
2. In the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Every push to `main` runs `.github/workflows/deploy.yml`, which tests, builds and publishes `dist/`.

The workflow sets `BASE_PATH=/<repo-name>/`, so assets resolve under
`https://<user>.github.io/<repo-name>/`. For a user site (`<user>.github.io`) or a custom domain,
change `BASE_PATH` to `/` in the workflow.

Navigation uses in-page `#anchors` (no client-side router), so there are no 404s on refresh or deep links.

To test the sub-path build locally:

```bash
BASE_PATH=/your-repo/ npm run build && npx vite preview --base /your-repo/
```

## Accessibility & performance

- Keyboard-navigable throughout: skip link, ARIA tabs with arrow-key support, visible focus rings, labelled controls.
- `prefers-reduced-motion` is respected by Framer Motion (`MotionConfig reducedMotion="user"`), by CSS animations and by the demo typewriters and stage animations.
- Demos are lazy-loaded; the background is pure CSS.
