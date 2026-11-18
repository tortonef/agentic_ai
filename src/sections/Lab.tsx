import { Suspense, useRef, useState, type KeyboardEvent } from 'react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { labDemos } from '../config/lab'
import { Section, Reveal, SimulatedBadge } from '../components/ui'
import { cn } from '../lib/cn'

export function Lab() {
  const [activeId, setActiveId] = useState(labDemos[0].id)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const active = labDemos.find((d) => d.id === activeId)!
  const Demo = active.component

  // WAI-ARIA tabs: arrow keys move between tabs.
  const onKeyDown = (e: KeyboardEvent, i: number) => {
    const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!delta) return
    e.preventDefault()
    const next = (i + delta + labDemos.length) % labDemos.length
    setActiveId(labDemos[next].id)
    tabs.current[next]?.focus()
  }

  return (
    <Section
      id="lab"
      eyebrow="01 — Interactive GenAI Lab"
      title={
        <>
          A working lab, <span className="text-gradient">not a slide deck.</span>
        </>
      }
      description="Three hands-on demonstrations of how modern AI systems are put together. Every run is a transparent, deterministic simulation, so you can inspect each step."
    >
      <Reveal>
        <div role="tablist" aria-label="Lab demonstrations" className="mb-6 grid gap-3 md:grid-cols-3">
          {labDemos.map((demo, i) => {
            const selected = demo.id === activeId
            const Icon = demo.icon
            return (
              <button
                key={demo.id}
                ref={(el) => { tabs.current[i] = el }}
                role="tab"
                id={`tab-${demo.id}`}
                aria-selected={selected}
                aria-controls={`panel-${demo.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveId(demo.id)}
                onKeyDown={(e) => onKeyDown(e, i)}
                className={cn(
                  'group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-300',
                  selected ? 'border-iris/40 bg-iris/[0.06]' : 'border-white/[0.07] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]',
                )}
              >
                {selected && (
                  <motion.span layoutId="lab-tab-glow" className="absolute inset-x-6 -top-px h-px bg-gradient-to-r from-transparent via-iris-soft to-transparent" />
                )}
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-colors',
                      selected ? 'bg-gradient-to-br from-iris to-volt text-white' : 'bg-white/5 text-slate-400 group-hover:text-slate-200',
                    )}
                  >
                    <Icon size={18} aria-hidden />
                  </span>
                  <span className="font-display text-[15px] font-semibold text-slate-100">{demo.title}</span>
                </div>
                <p className="mt-2.5 text-[13px] leading-snug text-slate-400">{demo.tagline}</p>
              </button>
            )
          })}
        </div>
      </Reveal>

      <div
        role="tabpanel"
        id={`panel-${active.id}`}
        aria-labelledby={`tab-${active.id}`}
        className="glass relative rounded-3xl p-3 sm:p-5"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 px-1">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
            lab / <span className="text-slate-300">{active.id}</span>
          </p>
          <SimulatedBadge />
        </div>
        <Suspense
          fallback={
            <div className="grid h-[520px] place-items-center text-slate-500">
              <Loader2 className="animate-spin" aria-label="Loading demo" />
            </div>
          }
        >
          <Demo key={active.id} />
        </Suspense>
      </div>
    </Section>
  )
}
