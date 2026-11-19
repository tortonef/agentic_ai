import { useState } from 'react'
import { FlaskConical, Zap } from 'lucide-react'
import { useLlm } from '../../lib/llm-context'
import { cn } from '../../lib/cn'
import { LiveAgent } from './LiveAgent'
import { AgentPlayground } from './Playground'

export default function Agents() {
  const { llm } = useLlm()
  const [mode, setMode] = useState<'live' | 'simulated'>('live')
  const live = !!llm && mode === 'live'
  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1" role="group" aria-label="Agent mode">
        {([
          ['live', 'Build and run a real agent', Zap],
          ['simulated', 'Simulated multi-agent walkthrough', FlaskConical],
        ] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            aria-pressed={(id === 'live') === live}
            onClick={() => setMode(id)}
            disabled={id === 'live' && !llm}
            title={id === 'live' && !llm ? 'Connect Groq above to run a real agent' : undefined}
            className={cn('flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-2 py-2 sm:px-3 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm', (id === 'live') === live ? 'bg-iris/15 text-white' : 'text-slate-400 hover:text-slate-200')}
          >
            <Icon size={15} aria-hidden /> <span className="truncate">{label}</span>
          </button>
        ))}
      </div>
      {!llm && <p className="text-xs text-slate-500">Connect a Groq key above to build an agent from a goal and a set of tools, and run it for real. Until then, this is a deterministic walkthrough.</p>}
      {live ? <LiveAgent /> : <AgentPlayground />}
    </div>
  )
}
