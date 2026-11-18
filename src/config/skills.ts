import type { LucideIcon } from 'lucide-react'
import { Brain, Database, Workflow, MessageSquareCode, Code2, LineChart, Bot, Building2 } from 'lucide-react'

export interface SkillGroup {
  title: string
  icon: LucideIcon
  summary: string
  tools: string[]
}

/** Edit freely: the Skills section renders whatever is listed here. */
export const skills: SkillGroup[] = [
  {
    title: 'Large Language Models',
    icon: Brain,
    summary: 'Model selection, evaluation and safe deployment of LLM-powered applications.',
    tools: ['Commercial LLM APIs', 'Open-weight models', 'Evaluation', 'Guardrails'],
  },
  {
    title: 'Retrieval-Augmented Generation',
    icon: Database,
    summary: 'Chunking strategies, embeddings, hybrid search, re-ranking and grounded answers with citations.',
    tools: ['Vector databases', 'Hybrid search', 'Re-ranking', 'LlamaIndex / LangChain'],
  },
  {
    title: 'Agentic AI',
    icon: Bot,
    summary: 'Multi-agent orchestration, tool use, planning loops and human-in-the-loop controls.',
    tools: ['Tool calling', 'MCP', 'LangGraph', 'Orchestration patterns'],
  },
  {
    title: 'Prompt Engineering',
    icon: MessageSquareCode,
    summary: 'Systematic prompt design: few-shot, structured outputs, role framing and prompt evaluation.',
    tools: ['Few-shot', 'JSON schemas', 'Reasoning prompts', 'Prompt testing'],
  },
  {
    title: 'Python',
    icon: Code2,
    summary: 'Production-grade Python for data pipelines, APIs and AI services.',
    tools: ['FastAPI', 'Pydantic', 'pandas', 'pytest'],
  },
  {
    title: 'Data Science & ML',
    icon: LineChart,
    summary: 'From exploratory analysis to classical ML models and experiment tracking.',
    tools: ['scikit-learn', 'NumPy', 'Jupyter', 'MLOps basics'],
  },
  {
    title: 'AI Automation',
    icon: Workflow,
    summary: 'Automating business workflows end-to-end with LLMs, APIs and orchestration tools.',
    tools: ['Workflow engines', 'APIs & webhooks', 'Document processing', 'RPA integration'],
  },
  {
    title: 'Enterprise AI Solutions',
    icon: Building2,
    summary: 'Connecting AI capabilities to business processes, governance and measurable outcomes.',
    tools: ['AI strategy', 'Governance', 'Change management', 'Cloud platforms'],
  },
]
