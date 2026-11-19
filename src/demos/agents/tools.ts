import { Calculator, Database, FileSearch, UserCheck, type LucideIcon } from 'lucide-react'
import { calculate } from '../../lib/calc'
import { guardSql } from '../../lib/sqlGuard'
import { documents } from '../rag/documents'
import { runPipeline } from '../rag/pipeline'
import type { AgentTool } from './loop'

export type ToolId = 'calculator' | 'search_documents' | 'query_data' | 'ask_human'

export interface ToolInfo {
  id: ToolId
  label: string
  blurb: string
  icon: LucideIcon
}

export const toolCatalog: ToolInfo[] = [
  { id: 'query_data', label: 'Query sales data', blurb: 'Read-only SQL on 2,400 retail orders (DuckDB in your browser).', icon: Database },
  { id: 'search_documents', label: 'Search company docs', blurb: 'Retrieval over 5 sample policies: remote work, travel, AI usage, FAQ, postmortem.', icon: FileSearch },
  { id: 'calculator', label: 'Calculator', blurb: 'Exact arithmetic, so the model never guesses numbers.', icon: Calculator },
  { id: 'ask_human', label: 'Ask a human', blurb: 'Pauses the run until you approve or reject a proposed action.', icon: UserCheck },
]

const SCHEMA = `Table retail_sales: order_id VARCHAR, order_date DATE (2025-01-01 to 2026-07-01), store VARCHAR, region VARCHAR (North, Center, South, Online), channel VARCHAR (Store, Click & Collect, Online), category VARCHAR (Outerwear, Knitwear, Shirts, Trousers, Shoes, Accessories), units BIGINT, unit_price BIGINT (EUR), discount_pct BIGINT, revenue DOUBLE (EUR, after discount), returned BOOLEAN.`

export type Approver = (question: string, action: string) => Promise<{ approved: boolean; comment: string }>

export function buildTools(enabled: ToolId[], approve: Approver): AgentTool[] {
  const all: Record<ToolId, AgentTool> = {
    calculator: {
      id: 'calculator',
      def: {
        type: 'function',
        function: {
          name: 'calculator',
          description: 'Evaluate an arithmetic expression exactly. Supports + - * / % ^, parentheses and round(x, digits), sqrt, abs, min, max.',
          parameters: { type: 'object', properties: { expression: { type: 'string', description: 'e.g. (1520 - 1310) / 1310 * 100' } }, required: ['expression'] },
        },
      },
      run: async ({ expression }) => {
        const v = calculate(String(expression ?? ''))
        return `${expression} = ${Number.isInteger(v) ? v : Number(v.toPrecision(10))}`
      },
    },
    search_documents: {
      id: 'search_documents',
      def: {
        type: 'function',
        function: {
          name: 'search_documents',
          description: 'Search the company knowledge base (remote work policy, travel & expense policy, responsible AI guidelines, product FAQ, checkout outage postmortem). Returns the most relevant passages with their source.',
          parameters: { type: 'object', properties: { query: { type: 'string', description: 'What to look for, in keywords' } }, required: ['query'] },
        },
      },
      run: async ({ query: q }) => {
        const r = runPipeline(documents, String(q ?? ''), { chunkWords: 45, overlap: true, topK: 3 })
        const hits = r.reranked.filter((c) => c.score >= 0.12)
        return hits.length ? hits.map((c, i) => `[${i + 1}] ${c.docTitle}: ${c.text}`).join('\n\n') : 'No relevant passage found.'
      },
    },
    query_data: {
      id: 'query_data',
      def: {
        type: 'function',
        function: {
          name: 'query_data',
          description: `Run one read-only DuckDB SELECT and get the rows as JSON (max 50 shown). ${SCHEMA}`,
          parameters: { type: 'object', properties: { sql: { type: 'string', description: 'A single SELECT statement on retail_sales' } }, required: ['sql'] },
        },
      },
      run: async ({ sql }) => {
        const g = guardSql(String(sql ?? ''))
        if (!g.ok) throw new Error(g.reason)
        // Loaded on first use so the agent tab doesn't ship the SQL engine up front.
        const { ensureDemoTable, query } = await import('../../lib/duckdb')
        await ensureDemoTable()
        const r = await query(g.sql)
        return `${r.rows.length} rows${r.rows.length > 50 ? ' (first 50 shown)' : ''}: ${JSON.stringify(r.rows.slice(0, 50))}`
      },
    },
    ask_human: {
      id: 'ask_human',
      def: {
        type: 'function',
        function: {
          name: 'ask_human',
          description: 'Ask the human operator to approve or reject a proposed action before you commit to it. Waits for their decision.',
          parameters: {
            type: 'object',
            properties: {
              question: { type: 'string', description: 'What you need them to decide' },
              proposed_action: { type: 'string', description: 'The exact action you would take if approved, with key numbers' },
            },
            required: ['question', 'proposed_action'],
          },
        },
      },
      run: async ({ question, proposed_action }) => {
        const r = await approve(String(question ?? ''), String(proposed_action ?? ''))
        return `${r.approved ? 'APPROVED' : 'REJECTED'} by the human.${r.comment ? ` Comment: ${r.comment}` : ''}`
      },
    },
  }
  return enabled.map((id) => all[id])
}

export const liveExamples = [
  {
    label: 'Regional revenue drop',
    objective: 'Using the sales data, find which region had the biggest revenue drop from Q4 2025 to Q1 2026 and compute the percentage change.',
    tools: ['query_data', 'calculator'] as ToolId[],
  },
  {
    label: 'Policy check',
    objective: 'A colleague wants to work from Spain for 25 days this year and claims 60 euros per day for meals on a domestic trip. Check both against company policy and say what needs approval.',
    tools: ['search_documents', 'calculator'] as ToolId[],
  },
  {
    label: 'Returns campaign',
    objective: 'Find the product category with the highest online return rate, propose a fix with an estimated revenue impact, and get approval before finalising the plan.',
    tools: ['query_data', 'calculator', 'ask_human'] as ToolId[],
  },
]
