import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Network, DatabaseZap, SlidersHorizontal, BarChart3, Lightbulb } from 'lucide-react'

export interface LabDemo {
  id: string
  title: string
  tagline: string
  icon: LucideIcon
  /** true = uses the visitor's Groq key when one is connected. */
  live: boolean
  /** What runs without a key: real local computation, or a deterministic simulation. */
  offline: 'local' | 'simulated'
  component: LazyExoticComponent<ComponentType>
}

/**
 * Demo registry. To add a demo: create src/demos/<name>/index.tsx with a default export
 * and append an entry here. Each demo is code-split and only loaded when opened.
 */
export const labDemos: LabDemo[] = [
  {
    id: 'data',
    title: 'Talk to your data',
    tagline: 'Upload a CSV: profiling, quality checks, charts and questions in plain language.',
    icon: BarChart3,
    live: true,
    offline: 'local',
    component: lazy(() => import('../demos/data')),
  },
  {
    id: 'rag',
    title: 'Ask your documents',
    tagline: 'Upload PDFs or notes and get answers that cite their sources.',
    icon: DatabaseZap,
    live: true,
    offline: 'local',
    component: lazy(() => import('../demos/rag')),
  },
  {
    id: 'agents',
    title: 'Agent builder',
    tagline: 'Give an agent a goal and tools, then watch it plan, act and ask for approval.',
    icon: Network,
    live: true,
    offline: 'simulated',
    component: lazy(() => import('../demos/agents')),
  },
  {
    id: 'canvas',
    title: 'AI use-case canvas',
    tagline: 'Size a business process for AI: value, feasibility, risk and a roadmap.',
    icon: Lightbulb,
    live: true,
    offline: 'local',
    component: lazy(() => import('../demos/canvas')),
  },
  {
    id: 'prompts',
    title: 'Prompt Engineering Lab',
    tagline: 'Compare how prompting techniques change the same model output.',
    icon: SlidersHorizontal,
    live: false,
    offline: 'simulated',
    component: lazy(() => import('../demos/prompts')),
  },
]
