import { memo } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { Bot, CheckCircle2, Flag, Target } from 'lucide-react'
import type { AgentSpec } from './engine'
import { cn } from '../../lib/cn'

export type NodeStatus = 'idle' | 'running' | 'done'
export type AgentNodeData = { spec: AgentSpec; status: NodeStatus; vertical: boolean; kind: 'io' | 'agent'; selected: boolean }
export type AgentFlowNode = Node<AgentNodeData, 'agent'>

function AgentNodeImpl({ id, data }: NodeProps<AgentFlowNode>) {
  const { spec, status, vertical, kind, selected } = data
  const Icon = id === 'objective' ? Target : id === 'output' ? Flag : Bot
  return (
    <div
      className={cn(
        'relative w-[168px] rounded-xl border bg-ink-850/95 px-3 py-2.5 transition-all duration-300',
        status === 'running' && 'border-iris/70 shadow-[0_0_0_4px_rgb(139_92_246/0.15),0_0_30px_-4px_rgb(139_92_246/0.6)]',
        status === 'done' && 'border-volt/40',
        status === 'idle' && 'border-white/10',
        selected && 'ring-2 ring-volt-soft/70',
        kind === 'agent' && 'cursor-pointer',
      )}
    >
      <Handle type="target" position={vertical ? Position.Top : Position.Left} isConnectable={false} />
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'grid h-6 w-6 shrink-0 place-items-center rounded-md',
            status === 'running' ? 'bg-iris text-white' : status === 'done' ? 'bg-volt/20 text-volt-soft' : 'bg-white/5 text-slate-500',
          )}
        >
          <Icon size={13} aria-hidden />
        </span>
        <span className="truncate font-display text-[13px] font-semibold text-slate-100">{spec.name}</span>
        <span className="ml-auto">
          {status === 'done' ? (
            <CheckCircle2 size={14} className="text-volt-soft" aria-label="done" />
          ) : status === 'running' ? (
            <span className="block h-2 w-2 animate-pulse rounded-full bg-iris-soft" aria-label="running" />
          ) : (
            <span className="block h-2 w-2 rounded-full bg-slate-700" aria-label="idle" />
          )}
        </span>
      </div>
      <p className="mt-1 truncate text-[11px] text-slate-500">{spec.role}</p>
      {spec.tools.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {spec.tools.map((t) => (
            <span key={t} className="rounded bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9.5px] text-slate-400">
              {t}
            </span>
          ))}
        </div>
      )}
      <Handle type="source" position={vertical ? Position.Bottom : Position.Right} isConnectable={false} />
    </div>
  )
}

export const AgentNode = memo(AgentNodeImpl)
