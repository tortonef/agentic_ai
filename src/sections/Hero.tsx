import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { profile } from '../config/profile'
import { labDemos } from '../config/lab'
import { LinkButton } from '../components/ui'
import { GitHubIcon } from '../components/BrandIcons'

const ease = [0.22, 1, 0.36, 1] as const

export function Hero() {
  return (
    <section id="top" className="relative mx-auto grid min-h-[100svh] max-w-6xl items-center gap-14 px-5 pb-20 pt-28 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:pt-24">
      <div>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          className="chip mb-7 border-iris/25 bg-iris/[0.07] text-iris-soft"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-iris-soft opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-iris-soft" />
          </span>
          {profile.hero.eyebrow}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.08, ease }}
          className="text-[2.6rem] font-semibold leading-[1.04] sm:text-6xl lg:text-[4.1rem]"
        >
          {headlineWithAccent(profile.hero.headline)}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.18, ease }}
          className="mt-6 max-w-xl text-lg leading-relaxed text-slate-400"
        >
          {profile.hero.supporting}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.28, ease }}
          className="mt-6 text-sm text-slate-500"
        >
          <span className="font-medium text-slate-200">{profile.name}</span>
          <span className="mx-2 text-slate-700">/</span>
          {profile.role}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.36, ease }}
          className="mt-9 flex flex-wrap gap-3"
        >
          <LinkButton href="#lab" variant="primary" className="px-5 py-3">
            Explore the lab <ArrowRight size={16} aria-hidden />
          </LinkButton>
          <LinkButton href={profile.links.github} className="px-5 py-3" aria-label="GitHub (opens in a new tab)">
            <GitHubIcon size={16} /> GitHub
          </LinkButton>
        </motion.div>

        <motion.dl
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.55 }}
          className="mt-14 grid max-w-md grid-cols-3 gap-6 border-t border-white/[0.06] pt-6"
        >
          {[
            [String(labDemos.length), 'interactive demos'],
            ['0', 'API keys needed'],
            ['100%', 'runs in your browser'],
          ].map(([v, l]) => (
            <div key={l}>
              <dt className="sr-only">{l}</dt>
              <dd className="font-display text-2xl font-semibold text-slate-100">{v}</dd>
              <dd className="mt-1 text-xs text-slate-500">{l}</dd>
            </div>
          ))}
        </motion.dl>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.1, delay: 0.2, ease }}
        className="relative hidden sm:block"
      >
        <AgentGraphVisual />
      </motion.div>
    </section>
  )
}

/** Highlights the last two words of the headline with the accent gradient. */
function headlineWithAccent(text: string) {
  const words = text.split(' ')
  const tail = words.splice(-2).join(' ')
  return (
    <>
      {words.join(' ')} <span className="text-gradient">{tail}</span>
    </>
  )
}

// Decorative system graph: objective → agents → tools → output.
const nodes = [
  { id: 'in', x: 60, y: 200, label: 'objective', r: 7 },
  { id: 'plan', x: 165, y: 200, label: 'planner', r: 11 },
  { id: 'a1', x: 280, y: 95, label: 'research', r: 9 },
  { id: 'a2', x: 280, y: 200, label: 'retrieve', r: 9 },
  { id: 'a3', x: 280, y: 305, label: 'analyze', r: 9 },
  { id: 't1', x: 385, y: 140, label: 'tools', r: 6 },
  { id: 't2', x: 385, y: 262, label: 'memory', r: 6 },
  { id: 'out', x: 470, y: 200, label: 'result', r: 10 },
]
const edges: [string, string][] = [
  ['in', 'plan'], ['plan', 'a1'], ['plan', 'a2'], ['plan', 'a3'],
  ['a1', 't1'], ['a2', 't1'], ['a2', 't2'], ['a3', 't2'], ['t1', 'out'], ['t2', 'out'],
]
const byId = Object.fromEntries(nodes.map((n) => [n.id, n]))
const pathFor = ([a, b]: [string, string]) => {
  const p = byId[a], q = byId[b]
  const mx = (p.x + q.x) / 2
  return `M${p.x},${p.y} C${mx},${p.y} ${mx},${q.y} ${q.x},${q.y}`
}

function AgentGraphVisual() {
  const reduce = useReducedMotion()
  return (
    <div className="glass relative overflow-hidden rounded-3xl p-5 shadow-[0_40px_120px_-40px_rgb(76_29_149/0.6)]">
      <div className="mb-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
        <span>agent runtime · live view</span>
        <span className="flex items-center gap-1.5 text-mint/80">
          <span className="h-1.5 w-1.5 rounded-full bg-mint" /> running
        </span>
      </div>
      <svg viewBox="0 0 530 400" className="h-auto w-full" role="img" aria-label="Illustration of an objective flowing through a planner, three agents, tools and memory to a result">
        <defs>
          <linearGradient id="edge" x1="0" x2="1">
            <stop offset="0" stopColor="#8b5cf6" stopOpacity="0.55" />
            <stop offset="1" stopColor="#3b82f6" stopOpacity="0.55" />
          </linearGradient>
          <radialGradient id="node">
            <stop offset="0" stopColor="#c4b5fd" />
            <stop offset="1" stopColor="#6366f1" />
          </radialGradient>
        </defs>
        {edges.map((e, i) => (
          <path key={i} id={`hero-e-${i}`} d={pathFor(e)} stroke="url(#edge)" strokeWidth="1.2" fill="none" />
        ))}
        {!reduce &&
          edges.map((_, i) => (
            <circle key={i} r="2.6" fill="#e0e7ff">
              <animateMotion dur={`${2.4 + (i % 4) * 0.5}s`} begin={`${(i * 0.37) % 2}s`} repeatCount="indefinite">
                <mpath href={`#hero-e-${i}`} />
              </animateMotion>
            </circle>
          ))}
        {nodes.map((n, i) => (
          <g key={n.id}>
            <circle cx={n.x} cy={n.y} r={n.r + 9} fill="#8b5cf6" opacity="0.08">
              {!reduce && <animate attributeName="r" values={`${n.r + 6};${n.r + 13};${n.r + 6}`} dur="3.6s" begin={`${i * 0.4}s`} repeatCount="indefinite" />}
            </circle>
            <circle cx={n.x} cy={n.y} r={n.r} fill="url(#node)" stroke="#0a0c14" strokeWidth="2" />
            <text x={n.x} y={n.y + n.r + 18} textAnchor="middle" fill="#64748b" fontSize="11" fontFamily="JetBrains Mono, monospace">
              {n.label}
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-2 space-y-1.5 rounded-xl border border-white/[0.06] bg-ink-950/70 p-3 font-mono text-[11px] leading-relaxed">
        <p className="text-slate-500"><span className="text-iris-soft">planner</span> → decomposed objective into 4 tasks</p>
        <p className="text-slate-500"><span className="text-volt-soft">retrieve</span> → top-k=4 chunks · cosine 0.82</p>
        <p className="caret text-slate-400"><span className="text-mint">writer</span> → composing grounded answer</p>
      </div>
    </div>
  )
}
