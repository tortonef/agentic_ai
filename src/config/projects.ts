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
    demo: null,
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
    demo: null,
  },
]
