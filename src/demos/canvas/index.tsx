import { useId, useMemo, useState, type ReactNode } from 'react'
import { Check, Copy, FileText, Gauge, Loader2, Printer, Route, ShieldCheck, Sparkles, Target } from 'lucide-react'
import { useLlm } from '../../lib/llm-context'
import { Button, Panel } from '../../components/ui'
import { cn } from '../../lib/cn'
import { assess, briefMarkdown, formatEur, presets, taskTypes, type CanvasInput, type Scale, type TaskType } from './scoring'

export default function UseCaseCanvas() {
  const { llm } = useLlm()
  const [input, setInput] = useState<CanvasInput>(presets[0].input)
  const [narrative, setNarrative] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const a = useMemo(() => assess(input), [input])
  const brief = briefMarkdown(input, a, narrative ?? undefined)

  const set = <K extends keyof CanvasInput>(k: K, v: CanvasInput[K]) => {
    setInput((s) => ({ ...s, [k]: v }))
    setNarrative(null)
  }

  const write = async () => {
    if (!llm) return
    setBusy(true)
    setError(null)
    try {
      const reply = await llm.chat({
        temperature: 0.4,
        maxTokens: 2048,
        messages: [
          {
            role: 'system',
            content:
              'You are an AI transformation consultant writing for a business executive. Write an executive summary of at most 120 words, then "Key risks:" with exactly three bullets, each with a mitigation. Use only the numbers given; never change, round differently or add figures. Plain text with "- " bullets, no headings.',
          },
          { role: 'user', content: `Use case: ${input.process}\nAssessment (computed, do not alter):\n${JSON.stringify({ ...a, roadmap: a.roadmap.map((r) => r.phase), inputs: input })}` },
        ],
      })
      setNarrative(reply.content?.trim() ?? null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(brief)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      setError('Copy failed: your browser blocked clipboard access.')
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button key={p.label} type="button" onClick={() => { setInput(p.input); setNarrative(null) }} className={cn('chip hover:border-iris/40 hover:text-white', input.process === p.input.process && 'border-iris/40 text-white')}>
              {p.label}
            </button>
          ))}
        </div>
        <Panel title="The process">
          <div className="space-y-3 p-4">
            <Field label="Process name">
              {(id) => <input id={id} className="field" value={input.process} maxLength={80} onChange={(e) => set('process', e.target.value)} />}
            </Field>
            <Field label="What the AI would do">
              {(id) => (
                <select id={id} className="field" value={input.taskType} onChange={(e) => set('taskType', e.target.value as TaskType)}>
                  {taskTypes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              )}
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Num label="Tasks per month" value={input.volumePerMonth} onChange={(v) => set('volumePerMonth', v)} />
              <Num label="Minutes per task" value={input.minutesPerTask} onChange={(v) => set('minutesPerTask', v)} />
              <Num label="Hourly cost (€)" value={input.hourlyCost} onChange={(v) => set('hourlyCost', v)} />
              <Num label="Error rate (%)" value={input.errorRatePct} max={100} onChange={(v) => set('errorRatePct', v)} />
              <Num label="Cost per error (€)" value={input.costPerError} onChange={(v) => set('costPerError', v)} />
              <Num label="Systems involved" value={input.systems} max={20} onChange={(v) => set('systems', v)} />
            </div>
            <Field label={`Time the AI could save: ${input.timeSavedPct}%`}>
              {(id) => <input id={id} type="range" min={5} max={90} step={5} value={input.timeSavedPct} onChange={(e) => set('timeSavedPct', Number(e.target.value))} className="w-full accent-[#8b5cf6]" />}
            </Field>
            <Num label="Build + run cost per year (€, optional)" value={input.annualCost} onChange={(v) => set('annualCost', v)} />
          </div>
        </Panel>
        <Panel title="Readiness and risk (1 = low, 5 = high)">
          <div className="space-y-3 p-4">
            <Rating label="Data availability" value={input.dataAvailability} onChange={(v) => set('dataAvailability', v)} />
            <Rating label="Data quality" value={input.dataQuality} onChange={(v) => set('dataQuality', v)} />
            <Rating label="Process standardisation" value={input.standardisation} onChange={(v) => set('standardisation', v)} />
            <Rating label="Regulatory risk" value={input.regulatoryRisk} onChange={(v) => set('regulatoryRisk', v)} />
            <Rating label="Impact on customers if wrong" value={input.customerImpact} onChange={(v) => set('customerImpact', v)} />
          </div>
        </Panel>
      </div>

      <div className="min-w-0 space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Estimated value per year" value={formatEur(a.annualValue)} sub={`${Math.round(a.hoursSaved).toLocaleString('en')} hours · ${a.fteSaved.toFixed(1)} FTE`} />
          <Stat label="Payback" value={a.paybackMonths ? `${a.paybackMonths} months` : input.annualCost > 0 ? 'Not within a year' : '—'} sub={input.annualCost > 0 ? `on ${formatEur(input.annualCost)}/year cost` : 'add a cost to compute it'} />
          <Stat label="Verdict" value={a.quadrant.label} sub={a.quadrant.advice} accent />
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_260px]">
          <Panel title="Scores" icon={<Gauge size={12} aria-hidden />}>
            <div className="space-y-4 p-4">
              <Bar label="Business value" value={a.valueScore} color="from-iris to-volt" />
              <Bar label="Feasibility" value={a.feasibilityScore} color="from-volt to-mint" />
              <Bar label="Risk" value={a.riskScore} color="from-amber to-rose-400" />
              <p className="text-[11px] leading-relaxed text-slate-500">Value uses a log scale (€5k/year = 0, €1M/year = 100). Feasibility weighs data availability and quality, standardisation and the number of systems. Risk weighs regulation and customer impact.</p>
            </div>
          </Panel>
          <Panel title="Value × feasibility" icon={<Target size={12} aria-hidden />}>
            <Quadrant value={a.valueScore} feasibility={a.feasibilityScore} active={a.quadrant.id} />
          </Panel>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Panel title="Recommended approach" icon={<Sparkles size={12} aria-hidden />}>
            <div className="space-y-3 p-4 text-sm">
              <p className="font-display text-lg font-semibold text-slate-100">{a.pattern.name}</p>
              <p className="text-slate-400">{a.pattern.why}</p>
              <p className="flex gap-2 text-slate-300"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-mint" aria-hidden /> {a.oversight}</p>
              <div>
                <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-500">KPIs to track</p>
                <ul className="flex flex-wrap gap-1.5">{a.kpis.map((k) => <li key={k} className="chip">{k}</li>)}</ul>
              </div>
            </div>
          </Panel>
          <Panel title="Roadmap" icon={<Route size={12} aria-hidden />}>
            <ol className="space-y-3 p-4">
              {a.roadmap.map((r, i) => (
                <li key={r.phase} className="flex gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-iris/40 font-mono text-[11px] text-iris-soft">{i + 1}</span>
                  <div className="text-sm">
                    <p className="font-medium text-slate-200">{r.phase} <span className="font-normal text-slate-500">· {r.duration}</span></p>
                    <p className="text-[13px] text-slate-400">{r.goal}</p>
                    <p className="text-[12px] text-slate-500">Exit: {r.exit}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <Panel
          title="One-page brief"
          icon={<FileText size={12} aria-hidden />}
          actions={
            <div className="flex gap-1">
              {llm && (
                <Button variant="subtle" className="px-2.5 py-1 text-xs" onClick={write} disabled={busy}>
                  {busy ? <Loader2 size={13} className="animate-spin" aria-hidden /> : <Sparkles size={13} aria-hidden />} {narrative ? 'Rewrite' : 'Write'} executive summary
                </Button>
              )}
              <Button variant="subtle" className="px-2.5 py-1 text-xs" onClick={copy}>{copied ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />} {copied ? 'Copied' : 'Copy Markdown'}</Button>
              <Button variant="subtle" className="px-2.5 py-1 text-xs" onClick={() => window.print()}><Printer size={13} aria-hidden /> Print / PDF</Button>
            </div>
          }
        >
          <div className="p-4">
            {!llm && <p className="mb-3 text-xs text-slate-500">Connect Groq above to add an executive summary and key risks written by the LLM. It sees the computed numbers and is told not to change them.</p>}
            {error && <p role="alert" className="mb-3 text-sm text-rose-300">{error}</p>}
            <pre className="print-brief scroll-thin max-h-[420px] overflow-auto whitespace-pre-wrap rounded-xl bg-ink-950/70 p-4 font-mono text-[12px] leading-relaxed text-slate-300">{brief}</pre>
          </div>
        </Panel>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: (id: string) => ReactNode }) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs text-slate-400">{label}</label>
      {children(id)}
    </div>
  )
}

function Num({ label, value, onChange, max = 1e7 }: { label: string; value: number; onChange: (v: number) => void; max?: number }) {
  return (
    <Field label={label}>
      {(id) => (
        <input id={id} type="number" inputMode="decimal" min={0} max={max} className="field py-2" value={Number.isFinite(value) ? value : 0} onChange={(e) => onChange(Math.min(max, Math.max(0, Number(e.target.value) || 0)))} />
      )}
    </Field>
  )
}

function Rating({ label, value, onChange }: { label: string; value: Scale; onChange: (v: Scale) => void }) {
  return (
    <fieldset className="flex items-center justify-between gap-3">
      <legend className="sr-only">{label}</legend>
      <span className="text-[13px] text-slate-300" aria-hidden>{label}</span>
      <span className="flex gap-1">
        {([1, 2, 3, 4, 5] as Scale[]).map((n) => (
          <label key={n} className={cn('grid h-7 w-7 cursor-pointer place-items-center rounded-lg border font-mono text-xs transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-iris-soft', value === n ? 'border-iris/60 bg-iris/20 text-white' : 'border-white/10 text-slate-500 hover:text-slate-200')}>
            <input type="radio" name={label} value={n} checked={value === n} onChange={() => onChange(n)} className="sr-only" aria-label={`${label}: ${n}`} />
            {n}
          </label>
        ))}
      </span>
    </fieldset>
  )
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className={cn('surface p-4', accent && 'border-iris/30 bg-iris/[0.05]')}>
      <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
      <p className={cn('mt-1 font-display text-2xl font-bold', accent ? 'text-white' : 'text-gradient')}>{value}</p>
      <p className="mt-1 text-[12px] leading-snug text-slate-400">{sub}</p>
    </div>
  )
}

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[13px]"><span className="text-slate-300">{label}</span><span className="font-mono text-slate-400">{value}/100</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-white/5" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
        <div className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-500', color)} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function Quadrant({ value, feasibility, active }: { value: number; feasibility: number; active: string }) {
  const cells = [
    { id: 'bet', label: 'Strategic bet', x: 0, y: 0 },
    { id: 'now', label: 'Prioritise now', x: 1, y: 0 },
    { id: 'park', label: 'Park it', x: 0, y: 1 },
    { id: 'quick', label: 'Quick win', x: 1, y: 1 },
  ]
  return (
    <div className="p-4">
      <svg viewBox="0 0 220 220" className="w-full" role="img" aria-label={`Value ${value}, feasibility ${feasibility}`}>
        {cells.map((c) => (
          <g key={c.id}>
            <rect x={10 + c.x * 100} y={c.y * 100} width={98} height={98} rx={10} fill={active === c.id ? 'rgb(139 92 246 / 0.18)' : 'rgb(255 255 255 / 0.03)'} stroke={active === c.id ? 'rgb(167 139 250 / 0.6)' : 'rgb(255 255 255 / 0.06)'} />
            <text x={59 + c.x * 100} y={18 + c.y * 100} textAnchor="middle" fontSize="9" fill={active === c.id ? '#e2e8f0' : '#64748b'} fontFamily="JetBrains Mono, monospace">{c.label}</text>
          </g>
        ))}
        <circle cx={10 + feasibility * 1.98} cy={198 - value * 1.98} r={7} fill="#a78bfa" stroke="#fff" strokeWidth={2} />
        <text x={110} y={214} textAnchor="middle" fontSize="9" fill="#64748b">feasibility →</text>
        <text x={4} y={100} fontSize="9" fill="#64748b" transform="rotate(-90 4 100)" textAnchor="middle">value →</text>
      </svg>
    </div>
  )
}
