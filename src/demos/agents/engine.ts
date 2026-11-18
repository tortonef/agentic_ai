import { hash, seeded } from '../../lib/random.ts'

export type NodeId = 'objective' | 'planner' | 'workerA' | 'workerB' | 'writer' | 'reviewer' | 'output'
export type StepKind = 'thought' | 'plan' | 'tool' | 'observation' | 'handoff' | 'done'

export interface Step {
  node: NodeId
  kind: StepKind
  text: string
  tool?: string
  /** Simulated duration before the next step, in ms. */
  ms: number
}

export interface AgentSpec {
  name: string
  role: string
  tools: string[]
}

export interface Run {
  scenario: ScenarioKind
  objective: string
  agents: Record<NodeId, AgentSpec>
  tasks: { title: string; node: NodeId }[]
  steps: Step[]
  result: { title: string; summary: string; sections: { heading: string; items: string[] }[] }
}

export type ScenarioKind = 'market' | 'report' | 'automation'

export const examples: { kind: ScenarioKind; label: string; objective: string }[] = [
  { kind: 'market', label: 'Market research', objective: 'Research the European market for electric cargo bikes' },
  { kind: 'report', label: 'Report generation', objective: 'Generate a quarterly customer-support performance report' },
  { kind: 'automation', label: 'Task automation', objective: 'Automate onboarding for new enterprise clients' },
]

/** Keyword routing, the same idea as an intent classifier in front of an agent system. */
export function classify(objective: string): ScenarioKind {
  const o = objective.toLowerCase()
  if (/(automat|workflow|onboard|invoice|ticket|email|process|schedul|trigger|integrat)/.test(o)) return 'automation'
  if (/(report|summar|quarter|kpi|dashboard|metric|performance|review)/.test(o)) return 'report'
  return 'market'
}

/** "Research the European market for X" → "the European market for X" */
export function topicOf(objective: string): string {
  const cleaned = objective.trim().replace(/[.?!]+$/, '')
  const stripped = cleaned.replace(/^(please\s+)?(research|analy[sz]e|investigate|explore|study|generate|create|write|prepare|build|produce|draft|automate|set up|design)\s+/i, '')
  const topic = stripped || cleaned
  return topic.length > 70 ? topic.slice(0, 67).trimEnd() + '…' : topic
}

const common = {
  objective: { name: 'Objective', role: 'User goal', tools: [] },
  planner: { name: 'Planner', role: 'Decomposes the goal and routes tasks', tools: ['task_graph'] },
  writer: { name: 'Writer', role: 'Synthesises findings into a deliverable', tools: ['doc_compose'] },
  reviewer: { name: 'Reviewer', role: 'Checks grounding, gaps and format', tools: ['rubric_check'] },
  output: { name: 'Result', role: 'Final deliverable', tools: [] },
} satisfies Partial<Record<NodeId, AgentSpec>>

const workers: Record<ScenarioKind, { workerA: AgentSpec; workerB: AgentSpec }> = {
  market: {
    workerA: { name: 'Researcher', role: 'Gathers market signals', tools: ['web_search', 'fetch_page'] },
    workerB: { name: 'Analyst', role: 'Quantifies and compares', tools: ['python_exec', 'spreadsheet'] },
  },
  report: {
    workerA: { name: 'Data Agent', role: 'Queries operational data', tools: ['sql_query', 'python_exec'] },
    workerB: { name: 'Retriever', role: 'Finds context in documents', tools: ['vector_search'] },
  },
  automation: {
    workerA: { name: 'Integrator', role: 'Maps systems and APIs', tools: ['crm_api', 'calendar_api'] },
    workerB: { name: 'Automator', role: 'Builds the workflow', tools: ['workflow_builder', 'email_draft'] },
  },
}

export function buildRun(objectiveRaw: string): Run {
  const objective = objectiveRaw.trim()
  const scenario = classify(objective)
  const topic = topicOf(objective)
  const rnd = seeded(hash(objective.toLowerCase()))
  const int = (min: number, max: number) => Math.floor(min + rnd() * (max - min + 1))
  const ms = () => int(550, 1100)
  const agents = { ...common, ...workers[scenario] } as Record<NodeId, AgentSpec>
  const s = scenarioScript[scenario](topic, int)

  const steps: Step[] = [
    { node: 'planner', kind: 'thought', text: `Parsing objective: "${objective}". Intent classified as ${scenario}.`, ms: ms() },
    { node: 'planner', kind: 'tool', tool: 'task_graph', text: `task_graph.create(goal="${topic}", max_tasks=4)`, ms: ms() },
    { node: 'planner', kind: 'plan', text: `Plan ready: ${s.tasks.length} tasks, 2 can run in parallel.`, ms: ms() },
    { node: 'planner', kind: 'handoff', text: `Dispatching to ${agents.workerA.name} and ${agents.workerB.name} in parallel.`, ms: ms() },
    { node: 'planner', kind: 'done', text: 'Planning complete.', ms: 300 },
    // Interleave both workers to show parallel execution.
    ...interleave(s.workerA.map((x) => ({ ...x, node: 'workerA' as NodeId, ms: ms() })), s.workerB.map((x) => ({ ...x, node: 'workerB' as NodeId, ms: ms() }))),
    { node: 'workerA', kind: 'done', text: 'Findings handed to Writer.', ms: 300 },
    { node: 'workerB', kind: 'done', text: 'Results handed to Writer.', ms: 300 },
    { node: 'writer', kind: 'thought', text: 'Merging both workstreams; resolving overlaps and ordering by impact.', ms: ms() },
    { node: 'writer', kind: 'tool', tool: 'doc_compose', text: `doc_compose(template="${s.template}", sections=${s.result.sections.length})`, ms: ms() },
    { node: 'writer', kind: 'done', text: 'Draft v1 ready for review.', ms: 300 },
    { node: 'reviewer', kind: 'tool', tool: 'rubric_check', text: 'rubric_check(criteria=["grounded","complete","actionable"])', ms: ms() },
    { node: 'reviewer', kind: 'observation', text: `Score ${int(86, 94)}/100. One claim lacked a source; Writer attached citation. Approved.`, ms: ms() },
    { node: 'reviewer', kind: 'done', text: 'Approved for delivery.', ms: 300 },
    { node: 'output', kind: 'done', text: `Delivered: ${s.result.title}`, ms: 0 },
  ]

  return { scenario, objective, agents, tasks: s.tasks, steps, result: s.result }
}

function interleave<T>(a: T[], b: T[]): T[] {
  const out: T[] = []
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i]) out.push(a[i])
    if (b[i]) out.push(b[i])
  }
  return out
}

type Partial_ = Omit<Step, 'node' | 'ms'>
type Script = {
  template: string
  tasks: Run['tasks']
  workerA: Partial_[]
  workerB: Partial_[]
  result: Run['result']
}

// Outputs are illustrative structure only: numbers come from the seeded PRNG, not real data.
const scenarioScript: Record<ScenarioKind, (topic: string, int: (a: number, b: number) => number) => Script> = {
  market: (topic, int) => {
    const sources = int(9, 16)
    const segments = int(3, 5)
    return {
      template: 'market_brief',
      tasks: [
        { title: `Collect market signals on ${topic}`, node: 'workerA' },
        { title: 'Size segments and compare competitors', node: 'workerB' },
        { title: 'Draft market brief', node: 'writer' },
        { title: 'Verify claims and sources', node: 'reviewer' },
      ],
      workerA: [
        { kind: 'tool', tool: 'web_search', text: `web_search("${topic} trends", k=10)` },
        { kind: 'observation', text: `${sources} relevant sources found; ${int(2, 4)} discarded as low quality.` },
        { kind: 'tool', tool: 'fetch_page', text: `fetch_page(top_sources[:5]) → extracting key claims` },
        { kind: 'observation', text: `Extracted ${int(18, 30)} claims across pricing, regulation and demand.` },
      ],
      workerB: [
        { kind: 'thought', text: 'Need a segment breakdown and competitor matrix.' },
        { kind: 'tool', tool: 'python_exec', text: `python_exec("cluster_segments(claims, k=${segments})")` },
        { kind: 'observation', text: `${segments} segments identified; one shows a clearly stronger growth signal.` },
        { kind: 'tool', tool: 'spreadsheet', text: 'spreadsheet.build(competitor_matrix, cols=["price","reach","differentiation"])' },
      ],
      result: {
        title: `Market brief: ${topic}`,
        summary: `A structured brief synthesised from ${sources} sources across ${segments} customer segments.`,
        sections: [
          { heading: 'Key signals', items: ['Demand drivers and adoption barriers, ranked by source agreement', 'Regulatory factors that shape entry timing', 'Pricing bands observed across competitors'] },
          { heading: 'Segments', items: [`${segments} segments with relative attractiveness scores`, 'Highest-signal segment flagged for deeper validation'] },
          { heading: 'Recommended next steps', items: ['Validate the top segment with 5–8 customer interviews', 'Run a pricing test against the median competitor band'] },
        ],
      },
    }
  },
  report: (topic, int) => {
    const rows = int(12, 48) * 1000
    return {
      template: 'exec_report',
      tasks: [
        { title: 'Query KPIs for the reporting period', node: 'workerA' },
        { title: 'Retrieve context from team notes and policies', node: 'workerB' },
        { title: 'Compose executive report', node: 'writer' },
        { title: 'Check numbers and narrative consistency', node: 'reviewer' },
      ],
      workerA: [
        { kind: 'tool', tool: 'sql_query', text: 'sql_query("SELECT week, tickets, csat, first_response FROM kpis WHERE quarter = :q")' },
        { kind: 'observation', text: `${rows.toLocaleString('en-US')} rows aggregated into 13 weekly buckets.` },
        { kind: 'tool', tool: 'python_exec', text: 'python_exec("detect_anomalies(weekly, z=2.0)")' },
        { kind: 'observation', text: `${int(1, 3)} anomalous weeks detected and annotated.` },
      ],
      workerB: [
        { kind: 'tool', tool: 'vector_search', text: `vector_search("${topic}", top_k=6)` },
        { kind: 'observation', text: `6 chunks retrieved from ${int(3, 5)} documents (meeting notes, SLA policy).` },
        { kind: 'thought', text: 'Linking anomalies to documented events for causal context.' },
      ],
      result: {
        title: `Report: ${topic}`,
        summary: 'An executive report combining quantitative KPIs with retrieved qualitative context.',
        sections: [
          { heading: 'Headline metrics', items: ['Volume, satisfaction and response-time trends vs. previous period', 'Anomalous weeks annotated with likely causes'] },
          { heading: 'What drove the change', items: ['Events from team notes linked to metric shifts', 'Policy changes that affected SLAs'] },
          { heading: 'Actions', items: ['Two operational improvements with owners and target dates', 'Metrics to watch next period'] },
        ],
      },
    }
  },
  automation: (topic, int) => {
    const steps = int(6, 9)
    return {
      template: 'automation_runbook',
      tasks: [
        { title: 'Map systems, triggers and data fields', node: 'workerA' },
        { title: 'Build workflow and message templates', node: 'workerB' },
        { title: 'Write runbook and hand-off notes', node: 'writer' },
        { title: 'Dry-run and approve', node: 'reviewer' },
      ],
      workerA: [
        { kind: 'tool', tool: 'crm_api', text: 'crm_api.describe(objects=["Account","Contact","Deal"])' },
        { kind: 'observation', text: `Trigger found: Deal.stage → "Closed Won". ${int(8, 14)} fields mapped.` },
        { kind: 'tool', tool: 'calendar_api', text: 'calendar_api.find_slots(team="onboarding", duration=45)' },
      ],
      workerB: [
        { kind: 'tool', tool: 'workflow_builder', text: `workflow_builder.create(name="${topic}", steps=${steps})` },
        { kind: 'observation', text: `${steps}-step workflow created with 1 human approval gate.` },
        { kind: 'tool', tool: 'email_draft', text: 'email_draft(template="welcome", personalise=["company","owner"])' },
      ],
      result: {
        title: `Automation: ${topic}`,
        summary: `A ${steps}-step workflow triggered from the CRM, with a human approval gate before anything is sent.`,
        sections: [
          { heading: 'Workflow', items: ['Trigger on closed deal → create workspace → schedule kickoff', 'Draft welcome email → human approval → send', 'Create checklist and notify account owner'] },
          { heading: 'Safeguards', items: ['Approval gate before external communication', 'Idempotent steps so reruns never duplicate records'] },
          { heading: 'Rollout', items: ['Dry-run on 3 historical deals', 'Monitor failures and time-to-kickoff for 2 weeks'] },
        ],
      },
    }
  },
}
