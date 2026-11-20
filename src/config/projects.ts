export interface Project {
  title: string
  /** true = template entry; the card shows a "placeholder" badge until you replace it. */
  placeholder?: boolean
  problem: string
  solution: string
  technologies: string[]
  decisions: string[]
  /** null hides the button instead of rendering a dead link. */
  repo: string | null
  demo: string | null
  /** Button text for `demo`; defaults to "Live demo". */
  demoLabel?: string
}

export const projects: Project[] = [
  {
    title: 'Jarvis: AI assistant for the IT Service Desk',
    problem:
      'Service Desk agents spend time searching the knowledge base and past tickets for fixes to problems that have already been solved, and known L1 issues still wait in the queue for a human.',
    solution:
      'Jarvis reads every new ServiceNow incident, retrieves the answer from the KB and resolved tickets, and posts a cited resolution suggestion as a work note. It triages, runs approved fixes on on-prem AD and Linux servers through the MID Server, and turns undocumented fixes into KB pull requests. It runs on free tiers.',
    technologies: ['Python', 'ServiceNow', 'Groq (GPT-OSS 120B)', 'PostgreSQL + pgvector', 'Docker', 'Grafana', 'Slack'],
    decisions: [
      'The model writes text but never chooses an action: procedures are proposed by rules on diagnostic results, run only from a fixed L0/L1/L2 catalog and re-checked afterwards.',
      'Approval scales with risk: L1 fixes need one agent click, L2 fixes need an approved Change.',
      'Hybrid search (pgvector + full text) over a knowledge base kept as Markdown in Git, reviewed by pull request and published to ServiceNow.',
    ],
    repo: 'https://github.com/tortonef/jarvis-servicenow',
    demo: 'https://tortonef.github.io/jarvis-servicenow/',
    demoLabel: 'Slides'
  },
  {
    title: 'AI Stylist: grounded RAG for fashion retail',
    problem:
      'Shoppers arrive with an occasion, not a SKU, and generic chatbots invent products, prices and availability. Brands need conversational selling that only talks about what they actually sell and respects the budget.',
    solution:
      'A conversational stylist that builds complete outfits from a real catalog within the total budget, with every product cited by SKU. Embeddings and a small open LLM run 100% locally; without the LLM the app falls back to retrieval-only mode. On 16 evaluation questions, 95% of products shown met every constraint and no invented product reached the shopper.',
    technologies: ['Python', 'Streamlit', 'all-MiniLM-L6-v2', 'NumPy', 'Ollama (qwen3.5:4b)'],
    decisions: [
      'Hard constraints (budget, gender, category, season, occasion) are parsed with testable rules, not guessed by the model.',
      'Grounding is enforced in code: any SKU the model cites that was not retrieved is removed, and prices never enter the prompt.',
      'The outfit is chosen by exhaustive search over the top candidates per slot under the total budget, not by the LLM.',
    ],
    repo: 'https://github.com/tortonef/ai-stylist-rag',
    demo: 'https://tortonef.github.io/ai-stylist-rag/',
    demoLabel: 'Slides'
  },
  {
    title: 'MCP agent for data quality: database to ServiceNow',
    problem:
      'Data quality issues sit unnoticed in operational databases until a report breaks, and opening a ticket for each one is manual work that tends to create duplicates.',
    solution:
      'An agent (Claude) uses two MCP servers, the SQLite one and a custom server for the ServiceNow Table API, to run completeness, duplicate, validity and referential-integrity checks and open one incident per anomaly. There is no orchestration code: the rules live in a CLAUDE.md file and the MCP servers are only the agent\'s hands and eyes.',
    technologies: ['Claude', 'MCP', 'Python', 'SQLite', 'ServiceNow Table API'],
    decisions: [
      'A custom MCP server exposes only two tools, search_incidents and create_incident, so the agent cannot do anything else on ServiceNow.',
      'Each anomaly carries a correlation_id that is searched before creating a ticket: running the same prompt twice opens no duplicates.',
      'Data quality rules are written in plain language in CLAUDE.md, so they can be changed without touching code.',
    ],
    repo: 'https://github.com/tortonef/mcp-data-quality-demo',
    demo: null,
  },
  {
    title: 'Chat Dashboard: build analytics by talking',
    problem:
      'Business users wait for an analyst to add or change a chart, and letting an LLM write code directly into a dashboard is unsafe.',
    solution:
      'A dashboard you customize in plain language: each request becomes a SQL query and a widget that is added, edited or removed. Global filters apply to every widget, and SQL and database pages let users inspect the data and run their own read-only queries.',
    technologies: ['TypeScript', 'Next.js', 'SQLite', 'Recharts', 'Groq (GPT-OSS 120B)'],
    decisions: [
      'A widget is a small JSON spec, not generated code: the model returns add/update/remove actions that the server validates, runs and checks, with one retry on error.',
      'LLM-written SQL is untrusted: a read-only connection, a single SELECT/WITH per request and a 1,000-row cap.',
      'Global filters shadow each table with a same-name CTE and flow down foreign keys, so they work on arbitrary SQL without rewriting its WHERE clause.',
    ],
    repo: 'https://github.com/tortonef/chat-dashboard',
    demo: null,
  },
  {
    title: 'Atelier Watch: anomaly detection for fashion retail',
    problem:
      'Store outages, misconfigured promotions, price typos and return surges hide in daily sales data, and dirty source data makes them hard to trust or spot in time.',
    solution:
      'An end-to-end platform: a custom ETL on DuckDB with a 20-rule quality gate, two complementary detectors, an LLM that writes the Slack alert and answers questions about the run, and a FastAPI dashboard. On the seeded dataset the detectors recover 100% of the injected anomalies at 75% precision.',
    technologies: ['Python', 'DuckDB', 'scikit-learn', 'FastAPI', 'ECharts', 'Groq / Ollama', 'Slack'],
    decisions: [
      'Data quality rules are declarative SQL predicates: rows failing an error rule are quarantined with their payload, warnings pass through.',
      'Robust z-score (median and MAD of the same weekday) for store and category KPIs, Isolation Forest for individual sales: each catches what the other misses.',
      'An alert rule decides whether to notify before the LLM is called, and a template fallback keeps the demo working offline.',
    ],
    repo: 'https://github.com/tortonef/atelier-watch',
    demo: null,
  },
  {
    title: 'Fashion Catalog Enrichment: photo to catalog attributes',
    problem:
      'Fashion catalogs are full of missing and inconsistent attributes, which weakens search, filters and recommendations, and tagging every SKU by hand is slow and varies from person to person.',
    solution:
      'Drop in product photos and get category, colors, pattern, occasions and more as structured data, each with a confidence score. Uncertain items are flagged for human review before export. It runs on a laptop CPU with no API keys, and on the sample set gets the category right 81% of the time at about 0.1 s per image, with no training.',
    technologies: ['Python', 'FashionCLIP', 'PyTorch (CPU)', 'Streamlit', 'JSON Schema'],
    decisions: [
      'Zero-shot classification against a taxonomy file: adding a value means editing YAML, not retraining.',
      'Output is limited to taxonomy values and every export is validated against the product schema; invalid edits block the export.',
      'Attributes a single photo rarely shows reliably (fit, season, materials) are labelled experimental and never flag an item.',
    ],
    repo: 'https://github.com/tortonef/fashion-catalog-enrichment',
    demo: 'https://tortonef.github.io/fashion-catalog-enrichment/',
    demoLabel: 'Slides'
  },
  {
    title: 'Neural Network Templater',
    problem:
      'Starting a deep learning project means many architecture and hyperparameter choices, and boilerplate that is easy to get wrong.',
    solution:
      'A static web wizard: describe the problem, the dataset and the constraints, and get a complete, ready-to-train Python script in Keras or PyTorch, with the reason behind every choice. An optional AI assistant fills in the questionnaire from a plain-language description.',
    technologies: ['JavaScript', 'TensorFlow / Keras', 'PyTorch', 'Groq'],
    decisions: [
      'Architecture and hyperparameters come from deterministic rules, and the page explains each choice.',
      'The AI never writes code: it only suggests answers, validated against the same schema as the questionnaire.',
      'Automated checks generate all 18 problem × architecture × framework combinations and check the syntax of every script.',
    ],
    repo: 'https://github.com/tortonef/neural-network-templater',
    demo: 'https://tortonef.github.io/neural-network-templater/',
  },
]
