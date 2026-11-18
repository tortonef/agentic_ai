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
    title: 'Interactive GenAI Lab (this website)',
    problem:
      'Static portfolios describe AI skills but rarely let visitors see how agentic workflows, retrieval and prompt design actually behave.',
    solution:
      'A static, backend-free React application with three explorable demos: a multi-agent workflow simulator, a step-by-step RAG pipeline and a prompt-technique comparator.',
    technologies: ['React', 'TypeScript', 'Vite', 'Tailwind CSS', 'Framer Motion', 'React Flow'],
    decisions: [
      'Deterministic simulations instead of live LLM calls: no API keys, no secrets in the client, identical behaviour for every visitor.',
      'Real lexical retrieval (feature-hashed TF-IDF + cosine similarity) in the RAG demo, so ranking is computed rather than scripted.',
      'Each demo is a lazy-loaded module registered in one config file, keeping the initial bundle small and new demos easy to add.',
    ],
    repo: 'https://github.com/tortonef/agentic_ai',
    demo: 'https://tortonef.github.io/agentic_ai/',
  },
  {
    title: '[Project title]',
    placeholder: true,
    problem: '[What business or technical problem did this project address?]',
    solution: '[How did you solve it? Describe the system at a high level.]',
    technologies: ['[Tech 1]', '[Tech 2]', '[Tech 3]'],
    decisions: ['[Key architectural decision and why]', '[Trade-off you made and why]'],
    repo: null,
    demo: null,
  },
  {
    title: '[Project title]',
    placeholder: true,
    problem: '[What business or technical problem did this project address?]',
    solution: '[How did you solve it? Describe the system at a high level.]',
    technologies: ['[Tech 1]', '[Tech 2]', '[Tech 3]'],
    decisions: ['[Key architectural decision and why]', '[Trade-off you made and why]'],
    repo: null,
    demo: null,
  },
]
