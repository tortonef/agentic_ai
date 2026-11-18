import type { LucideIcon } from 'lucide-react'
import { Brain, Database, Workflow, MessageSquareCode, Code2, LineChart, Bot, Building2 } from 'lucide-react'

export interface SkillGroup {
  title: string
  icon: LucideIcon
  summary: string
  tools: string[]
}

/** Edit freely: the Skills section renders whatever is listed here. Sourced from the CV and public repos. */
export const skills: SkillGroup[] = [
  {
    title: 'Large Language Models',
    icon: Brain,
    summary: 'LLM application patterns, from hosted models on free tiers to small open models running fully locally.',
    tools: ['Claude (certified developer)', 'Groq', 'Ollama', 'Azure AI'],
  },
  {
    title: 'Retrieval-Augmented Generation',
    icon: Database,
    summary: 'Hybrid retrieval, grounding enforced in code, citations to sources, and evaluation on real questions.',
    tools: ['pgvector', 'Hybrid search', 'Local embeddings', 'Grounding checks'],
  },
  {
    title: 'Agentic AI',
    icon: Bot,
    summary: 'AI agents and workflow orchestration with human-in-the-loop approval and actions limited to a fixed catalog.',
    tools: ['MCP', 'Tool calling', 'Workflow orchestration', 'Human-in-the-loop'],
  },
  {
    title: 'Prompt & Context Engineering',
    icon: MessageSquareCode,
    summary: 'Prompts and context designed for reliable, structured and auditable outputs.',
    tools: ['Structured JSON output', 'Context engineering', 'Grounded prompts', 'Evaluation sets'],
  },
  {
    title: 'Python & Data Platforms',
    icon: Code2,
    summary: 'Hands-on data integration and engineering, from enterprise data warehouses to Python services.',
    tools: ['Python', 'SQL', 'Microsoft Fabric', 'Power BI', 'Snowflake', 'Oracle ODI / DWH', 'Java / Groovy'],
  },
  {
    title: 'Data Science & ML',
    icon: LineChart,
    summary: 'Machine learning from research to industry: transfer learning and model compression at CERN, anomaly detection in retail.',
    tools: ['Deep learning', 'Transfer learning', 'Anomaly detection', 'Keras / PyTorch'],
  },
  {
    title: 'AI Automation',
    icon: Workflow,
    summary: 'Automating service operations: knowledge retrieval, incident and problem analysis, standardized procedures.',
    tools: ['ServiceNow', 'Slack alerts', 'Docker', 'Grafana'],
  },
  {
    title: 'Enterprise AI & Delivery',
    icon: Building2,
    summary: 'Use-case discovery, roadmaps and value measurement, delivered through solid service governance.',
    tools: ['AI strategy & roadmaps', 'Responsible AI', 'KPI & value realization', 'Service delivery', 'ITIL 4', 'Scrum'],
  },
]
