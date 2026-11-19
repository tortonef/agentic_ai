/**
 * Deterministic AI use-case assessment. Every number comes from the visitor's inputs and the
 * formulas below; the LLM (if connected) only writes prose around these results.
 */

export type TaskType = 'knowledge' | 'content' | 'decision' | 'analysis' | 'multistep'
export type Scale = 1 | 2 | 3 | 4 | 5

export interface CanvasInput {
  process: string
  taskType: TaskType
  volumePerMonth: number
  minutesPerTask: number
  hourlyCost: number
  /** Share of task time the AI solution is expected to save, 0–100. */
  timeSavedPct: number
  errorRatePct: number
  costPerError: number
  dataAvailability: Scale
  dataQuality: Scale
  standardisation: Scale
  systems: number
  regulatoryRisk: Scale
  customerImpact: Scale
  /** Optional build + run cost per year, for payback. */
  annualCost: number
}

export const taskTypes: { id: TaskType; label: string }[] = [
  { id: 'knowledge', label: 'Answering questions from documents or knowledge' },
  { id: 'content', label: 'Writing or transforming content' },
  { id: 'decision', label: 'Classifying, scoring or deciding' },
  { id: 'analysis', label: 'Analysing data and reporting' },
  { id: 'multistep', label: 'Multi-step work across systems' },
]

export interface Assessment {
  hoursPerYear: number
  hoursSaved: number
  fteSaved: number
  laborValue: number
  errorValue: number
  annualValue: number
  paybackMonths: number | null
  valueScore: number
  feasibilityScore: number
  riskScore: number
  quadrant: { id: 'now' | 'bet' | 'quick' | 'park'; label: string; advice: string }
  pattern: { name: string; why: string }
  oversight: string
  roadmap: { phase: string; duration: string; goal: string; exit: string }[]
  kpis: string[]
}

const clamp = (x: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, x))
const pct = (s: number) => ((s - 1) / 4) * 100
const FTE_HOURS = 1650

export function assess(i: CanvasInput): Assessment {
  const tasksPerYear = Math.max(0, i.volumePerMonth) * 12
  const hoursPerYear = (tasksPerYear * Math.max(0, i.minutesPerTask)) / 60
  const share = clamp(i.timeSavedPct) / 100
  const hoursSaved = hoursPerYear * share
  const laborValue = hoursSaved * Math.max(0, i.hourlyCost)
  // Assumption shown in the brief: errors fall in the same proportion as the time saved.
  const errorValue = tasksPerYear * (clamp(i.errorRatePct) / 100) * Math.max(0, i.costPerError) * share
  const annualValue = laborValue + errorValue
  const paybackMonths = i.annualCost > 0 && annualValue > i.annualCost ? Math.round((12 * i.annualCost) / annualValue * 10) / 10 : null

  // Value on a log scale: €5k/year scores 0, €1M/year scores 100.
  const valueScore = Math.round(annualValue <= 0 ? 0 : clamp((100 * Math.log10(annualValue / 5000)) / Math.log10(1e6 / 5000)))
  const systemsScore = i.systems <= 1 ? 5 : i.systems <= 3 ? 4 : i.systems <= 5 ? 3 : 2
  const feasibilityScore = Math.round(0.3 * pct(i.dataAvailability) + 0.3 * pct(i.dataQuality) + 0.25 * pct(i.standardisation) + 0.15 * pct(systemsScore))
  const riskScore = Math.round(0.55 * pct(i.regulatoryRisk) + 0.45 * pct(i.customerImpact))

  const highV = valueScore >= 50
  const highF = feasibilityScore >= 55
  const quadrant = highV && highF
    ? { id: 'now' as const, label: 'Prioritise now', advice: 'High value and ready to build: start a proof of concept on real data.' }
    : highV
      ? { id: 'bet' as const, label: 'Strategic bet', advice: 'Worth it, but fix data access and quality before building the AI part.' }
      : highF
        ? { id: 'quick' as const, label: 'Quick win', advice: 'Cheap to do: use off-the-shelf tools or simple automation, keep the investment small.' }
        : { id: 'park' as const, label: 'Park it', advice: 'Low value and hard to deliver today: revisit when the process or data changes.' }

  const pattern = patternFor(i.taskType, riskScore)
  const oversight =
    riskScore >= 70
      ? 'Human approves every output before it takes effect; full audit log.'
      : riskScore >= 40
        ? 'Human approves above risk or value thresholds; weekly sample review of the rest.'
        : 'Automated with spot checks, monitoring and an easy way to escalate.'

  const roadmap = [
    ...(feasibilityScore < 50
      ? [{ phase: 'Data readiness', duration: '4–8 weeks', goal: 'Get access to the data the use case needs and fix the worst quality gaps.', exit: 'Representative, documented dataset available for the PoC.' }]
      : []),
    { phase: 'Proof of concept', duration: '4–6 weeks', goal: `${pattern.name} on a sample of ${i.process || 'the process'}, measured against today's baseline.`, exit: `At least half of the target ${Math.round(i.timeSavedPct)}% time saving on the test set, with acceptable error rate.` },
    { phase: 'Pilot', duration: '2–3 months', goal: 'One team uses it in daily work, with the oversight model below.', exit: 'KPIs stable for 4 weeks, users willing to keep it, risks reviewed.' },
    { phase: 'Scale', duration: '3–6 months', goal: 'Roll out to all volume, integrate the systems, set up monitoring and ownership.', exit: `Value tracked monthly against the ${formatEur(annualValue)}/year estimate.` },
  ]

  const kpis = [
    'Handling time per task (minutes)',
    'Share of tasks completed without rework',
    ...(i.errorRatePct > 0 ? ['Error rate (%)'] : []),
    ...kpiFor(i.taskType),
    'User adoption: weekly active users',
  ]

  return { hoursPerYear, hoursSaved, fteSaved: hoursSaved / FTE_HOURS, laborValue, errorValue, annualValue, paybackMonths, valueScore, feasibilityScore, riskScore, quadrant, pattern, oversight, roadmap, kpis }
}

function patternFor(t: TaskType, risk: number): Assessment['pattern'] {
  switch (t) {
    case 'knowledge':
      return { name: 'RAG assistant with citations', why: 'Answers come from your own documents, each one traceable to a source.' }
    case 'content':
      return { name: 'GenAI drafting with human review', why: 'The model drafts, people approve; brand and policy rules are checked in code.' }
    case 'decision':
      return risk >= 60
        ? { name: 'Decision support with human-in-the-loop', why: 'The model recommends and explains; a person makes the call on risky cases.' }
        : { name: 'Classification model or LLM triage', why: 'Repetitive decisions with clear labels suit a scoring model with confidence thresholds.' }
    case 'analysis':
      return { name: 'Conversational BI on governed data', why: 'Questions become validated, read-only queries on a curated dataset, with the SQL visible.' }
    default:
      return { name: 'Agentic workflow with approval gates', why: 'An agent plans the steps, but only calls a fixed catalog of tools and asks before risky actions.' }
  }
}

function kpiFor(t: TaskType): string[] {
  return {
    knowledge: ['Answers with a correct citation (%)', 'Questions escalated to an expert (%)'],
    content: ['Drafts accepted with minor edits (%)'],
    decision: ['Agreement with expert decisions (%)', 'Cases routed to human review (%)'],
    analysis: ['Questions answered without an analyst (%)'],
    multistep: ['End-to-end cycle time', 'Actions rejected at approval (%)'],
  }[t]
}

export const formatEur = (v: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, notation: v >= 1e6 ? 'compact' : 'standard' }).format(v)

export function briefMarkdown(i: CanvasInput, a: Assessment, narrative?: string): string {
  const n = (x: number) => Math.round(x).toLocaleString('en')
  return `# AI use-case brief: ${i.process || 'Untitled process'}

${narrative ? `${narrative.trim()}\n\n` : ''}## Verdict: ${a.quadrant.label}
${a.quadrant.advice}

| Score | Value |
|---|---|
| Business value | ${a.valueScore}/100 |
| Feasibility | ${a.feasibilityScore}/100 |
| Risk | ${a.riskScore}/100 |

## Estimated value (from the inputs)
- Volume: ${n(i.volumePerMonth)} tasks/month × ${i.minutesPerTask} min = ${n(a.hoursPerYear)} hours/year
- Time saved at ${i.timeSavedPct}%: ${n(a.hoursSaved)} hours/year (${a.fteSaved.toFixed(1)} FTE at ${FTE_HOURS} h/year)
- Labour value at ${formatEur(i.hourlyCost)}/hour: ${formatEur(a.laborValue)}/year
- Avoided errors (${i.errorRatePct}% × ${formatEur(i.costPerError)}, reduced in the same proportion as time): ${formatEur(a.errorValue)}/year
- **Total: ${formatEur(a.annualValue)}/year**${a.paybackMonths ? `\n- Payback on ${formatEur(i.annualCost)}/year cost: ${a.paybackMonths} months` : ''}

These are estimates computed from the stated assumptions, not measured results.

## Recommended approach
**${a.pattern.name}.** ${a.pattern.why}

Oversight: ${a.oversight}

## Roadmap
${a.roadmap.map((r, k) => `${k + 1}. **${r.phase}** (${r.duration}): ${r.goal} *Exit:* ${r.exit}`).join('\n')}

## KPIs to track
${a.kpis.map((k) => `- ${k}`).join('\n')}
`
}

export const presets: { label: string; input: CanvasInput }[] = [
  {
    label: 'IT Service Desk L1 tickets',
    input: { process: 'IT Service Desk L1 tickets', taskType: 'knowledge', volumePerMonth: 3000, minutesPerTask: 12, hourlyCost: 35, timeSavedPct: 35, errorRatePct: 8, costPerError: 40, dataAvailability: 4, dataQuality: 3, standardisation: 4, systems: 2, regulatoryRisk: 2, customerImpact: 3, annualCost: 30000 },
  },
  {
    label: 'Supplier invoice processing',
    input: { process: 'Supplier invoice processing', taskType: 'multistep', volumePerMonth: 2500, minutesPerTask: 9, hourlyCost: 32, timeSavedPct: 60, errorRatePct: 3, costPerError: 120, dataAvailability: 4, dataQuality: 4, standardisation: 5, systems: 3, regulatoryRisk: 3, customerImpact: 2, annualCost: 45000 },
  },
  {
    label: 'Product descriptions for e-commerce',
    input: { process: 'Product descriptions for e-commerce', taskType: 'content', volumePerMonth: 400, minutesPerTask: 20, hourlyCost: 30, timeSavedPct: 55, errorRatePct: 5, costPerError: 25, dataAvailability: 5, dataQuality: 3, standardisation: 4, systems: 1, regulatoryRisk: 2, customerImpact: 3, annualCost: 8000 },
  },
  {
    label: 'Credit pre-approval decisions',
    input: { process: 'Credit pre-approval decisions', taskType: 'decision', volumePerMonth: 1200, minutesPerTask: 25, hourlyCost: 45, timeSavedPct: 40, errorRatePct: 4, costPerError: 900, dataAvailability: 3, dataQuality: 3, standardisation: 3, systems: 4, regulatoryRisk: 5, customerImpact: 5, annualCost: 120000 },
  },
]
