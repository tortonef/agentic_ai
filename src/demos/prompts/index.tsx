import { useEffect, useState, type ReactNode } from 'react'
import { useReducedMotion } from 'framer-motion'
import { Columns2, Lightbulb, RotateCcw, Square } from 'lucide-react'
import { scenarios, techniques, type TechniqueId, type PromptScenario } from './examples'
import { Button } from '../../components/ui'
import { cn } from '../../lib/cn'

const tokens = (s: string) => Math.ceil(s.length / 4) // rough rule of thumb: ~4 chars per token

export default function PromptLab() {
  const [scenarioId, setScenarioId] = useState(scenarios[0].id)
  const [compare, setCompare] = useState(true)
  const [left, setLeft] = useState<TechniqueId>('zero')
  const [right, setRight] = useState<TechniqueId>('structured')
  const scenario = scenarios.find((s) => s.id === scenarioId)!

  return (
    <div className="space-y-4">
      <div className="surface flex flex-col gap-4 p-4 md:flex-row md:items-start">
        <div className="min-w-0 flex-1">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">Task</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Task">
            {scenarios.map((s) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={s.id === scenarioId}
                onClick={() => setScenarioId(s.id)}
                className={cn('chip transition-colors', s.id === scenarioId ? 'border-iris/50 bg-iris/15 text-white' : 'hover:border-white/20 hover:text-white')}
              >
                {s.title}
              </button>
            ))}
          </div>
          <p className="mb-1.5 mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">Input · {'{{input}}'}</p>
          <p className="rounded-xl border border-white/[0.06] bg-ink-950/60 p-3 text-sm leading-relaxed text-slate-300">{scenario.input}</p>
        </div>
        <Button onClick={() => setCompare((c) => !c)} aria-pressed={compare} className="shrink-0 self-start">
          {compare ? <Square size={15} aria-hidden /> : <Columns2 size={15} aria-hidden />}
          {compare ? 'Single view' : 'Compare side by side'}
        </Button>
      </div>

      <div className={cn('grid gap-4', compare && 'lg:grid-cols-2')}>
        <Column scenario={scenario} technique={left} onChange={setLeft} side="A" />
        {compare && <Column scenario={scenario} technique={right} onChange={setRight} side="B" />}
      </div>
    </div>
  )
}

function Column({ scenario, technique, onChange, side }: { scenario: PromptScenario; technique: TechniqueId; onChange: (t: TechniqueId) => void; side: string }) {
  const v = scenario.variants[technique]
  const [runId, setRunId] = useState(0)
  const shown = useTypewriter(v.output, `${scenario.id}-${technique}-${runId}`)
  const meta = techniques.find((t) => t.id === technique)!

  return (
    <div className="surface flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-white/[0.06] p-2">
        <span className="ml-1 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-white/5 font-mono text-[11px] text-slate-400">{side}</span>
        <div className="scroll-thin flex gap-1 overflow-x-auto" role="radiogroup" aria-label={`Technique for column ${side}`}>
          {techniques.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={t.id === technique}
              onClick={() => onChange(t.id)}
              className={cn('shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors', t.id === technique ? 'bg-gradient-to-r from-iris/30 to-volt/30 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200')}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <p className="text-[13px] text-slate-400">{meta.idea}</p>

        <Block label="Prompt" right={`~${tokens(v.prompt.replace('{{input}}', scenario.input))} tokens`}>
          <pre className="scroll-thin max-h-56 overflow-auto whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-slate-400">{highlight(v.prompt)}</pre>
        </Block>

        <Block
          label="Output"
          right={
            <button type="button" onClick={() => setRunId((r) => r + 1)} className="inline-flex items-center gap-1 rounded px-1.5 text-slate-400 hover:text-white" aria-label="Replay output">
              <RotateCcw size={11} aria-hidden /> replay
            </button>
          }
        >
          <pre className={cn('min-h-[120px] whitespace-pre-wrap font-mono text-[12.5px] leading-relaxed text-slate-200', shown.length < v.output.length && 'caret')} aria-live="polite">
            {shown}
          </pre>
        </Block>

        <div className="mt-auto space-y-3">
          <dl className="grid grid-cols-3 gap-3">
            {([
              ['Consistency', v.ratings.consistency],
              ['Machine-readable', v.ratings.machineReadable],
              ['Specificity', v.ratings.specificity],
            ] as const).map(([label, n]) => (
              <div key={label}>
                <dt className="text-[11px] text-slate-500">{label}</dt>
                <dd className="mt-1 flex gap-0.5" aria-label={`${n} out of 5`}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <span key={i} className={cn('h-1.5 flex-1 rounded-full', i < n ? 'bg-gradient-to-r from-iris to-volt' : 'bg-white/[0.06]')} />
                  ))}
                </dd>
              </div>
            ))}
          </dl>
          <p className="flex gap-2 rounded-xl border border-iris/15 bg-iris/[0.04] p-3 text-[13px] leading-relaxed text-slate-300">
            <Lightbulb size={15} className="mt-0.5 shrink-0 text-iris-soft" aria-hidden />
            {v.takeaway}
          </p>
          <p className="text-[10.5px] text-slate-600">Pre-written example output; ratings are illustrative, not benchmark results.</p>
        </div>
      </div>
    </div>
  )
}

function Block({ label, right, children }: { label: string; right?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-ink-950/60">
      <div className="flex items-center justify-between border-b border-white/[0.05] px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-slate-500">
        <span>{label}</span>
        <span className="normal-case tracking-normal">{right}</span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  )
}

/** Highlights the {{input}} template variable. */
function highlight(prompt: string) {
  return prompt.split('{{input}}').flatMap((part, i) =>
    i === 0 ? [part] : [<span key={i} className="rounded bg-iris/20 px-1 text-iris-soft">{'{{input}}'}</span>, part],
  )
}

function useTypewriter(text: string, key: string) {
  const reduce = useReducedMotion()
  const [n, setN] = useState(0)
  useEffect(() => {
    if (reduce) { setN(text.length); return }
    setN(0)
    const id = setInterval(() => setN((x) => (x >= text.length ? (clearInterval(id), x) : x + 4)), 16)
    return () => clearInterval(id)
  }, [key, text, reduce])
  return text.slice(0, n)
}
