import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Network, DatabaseZap, SlidersHorizontal } from 'lucide-react'

export interface LabDemo {
  id: string
  title: string
  tagline: string
  icon: LucideIcon
  component: LazyExoticComponent<ComponentType>
}

/**
 * Demo registry. To add a demo: create src/demos/<name>/index.tsx with a default export
 * and append an entry here. Each demo is code-split and only loaded when opened.
 */
export const labDemos: LabDemo[] = [
  {
    id: 'agents',
    title: 'Agentic AI Playground',
    tagline: 'Watch a multi-agent team plan, call tools and deliver a result.',
    icon: Network,
    component: lazy(() => import('../demos/agents')),
  },
  {
    id: 'rag',
    title: 'RAG Explorer',
    tagline: 'Follow a question through chunking, embedding, retrieval and grounding.',
    icon: DatabaseZap,
    component: lazy(() => import('../demos/rag')),
  },
  {
    id: 'prompts',
    title: 'Prompt Engineering Lab',
    tagline: 'Compare how prompting techniques change the same model output.',
    icon: SlidersHorizontal,
    component: lazy(() => import('../demos/prompts')),
  },
]
