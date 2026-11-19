# Interactive GenAI Lab: Personal Portfolio

A static, backend-free portfolio that works like an AI product. The Lab has five working tools:

| Tool | Without a key (local) | With the visitor's Groq key (live) |
| --- | --- | --- |
| **Talk to your data** | CSV upload into DuckDB-WASM, column profile, data quality checks, suggested charts, SQL editor | Questions in plain language → validated read-only SQL → chart + insight |
| **Ask your documents** | PDF/TXT/MD upload, neural embeddings (all-MiniLM-L6-v2) in a Web Worker, hybrid retrieval, extractive answer | Answer generated only from retrieved chunks, with checked `[n]` citations |
| **Agent builder** | Deterministic multi-agent walkthrough | Real tool-calling loop (calculator, document search, SQL, human approval), live graph and trace |
| **AI use-case canvas** | Value, feasibility and risk scoring, quadrant, pattern, roadmap, Markdown/PDF brief | Executive summary written around the computed numbers |
| **Prompt Lab** | Side-by-side comparison of prompting techniques | — |

**No backend, no tracking, no keys in the code.** Live mode uses a Groq key the visitor pastes: it stays in
memory (or in their browser if they tick "remember") and is sent only to `api.groq.com`. Uploaded files are
processed in the browser and never leave it, except the passages a live demo puts in the prompt.
Every panel shows whether it is Local, Simulated or Live.

## Stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · Framer Motion · React Flow (`@xyflow/react`) · Lucide icons ·
DuckDB-WASM · transformers.js · pdf.js · Recharts · Groq API (OpenAI-compatible)

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # logic self-checks (retrieval, SQL guard, calculator, scoring, agent loop)
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
    data/          Talk to your data: profile.ts (profiling, quality, suggested charts), ask.ts (text-to-SQL), Chart.tsx
    rag/           Documents: parse.ts (PDF/TXT), semantic.ts (index, search, citation check), MyDocs.tsx, Explorer.tsx
    agents/        loop.ts (tool-calling loop), tools.ts (tool catalog), LiveAgent.tsx, Playground.tsx (simulation)
    canvas/        scoring.ts (deterministic assessment + brief) + canvas UI
    prompts/       Prompt Engineering Lab: examples.ts (prompts + outputs) + comparison UI
  config/          All editable content
  lib/             llm.ts (Groq client) + llm-context.tsx, duckdb.ts, sqlGuard.ts, embeddings.ts + embed.worker.ts,
                   calc.ts (safe calculator), demoData.ts (synthetic retail data), small utilities
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
- **Talk to your data**: DuckDB-WASM loads from jsDelivr on first use (~7 MB). The LLM gets the schema,
  three sample rows and the question, and must reply in JSON mode with `{sql, chart, x, y}`. The SQL passes
  `sqlGuard.ts` (one SELECT/WITH, no file/network functions, `LIMIT 1000`), runs locally, and the chart spec is
  checked against the real result columns; one repair round trip sends any error back to the model.
- **Ask your documents**: chunks are embedded with all-MiniLM-L6-v2 (~23 MB, quantized, cached by the browser)
  in a Web Worker; if the model can't load, retrieval falls back to the TF-IDF vectors above. Live answers may
  only cite the passages they were given; any other `[n]` is removed and reported.
- **Agent builder**: `runAgent` loops model → tool calls → observations, capped at 8 steps. Tools are a fixed
  catalog; unknown tools and bad arguments come back to the model as errors. `ask_human` pauses the run until
  the visitor approves or rejects.
- **Use-case canvas**: every number comes from the inputs and the formulas in `scoring.ts`; the LLM only writes
  prose around them and is told not to change them.
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
