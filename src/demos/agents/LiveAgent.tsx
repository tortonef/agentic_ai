import { memo, useEffect, useRef, useState } from 'react'
import { ReactFlow, Background, BackgroundVariant, Handle, MarkerType, Position, type Edge, type Node, type NodeProps } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Bot, Brain, Check, CheckCircle2, Flag, Loader2, Play, Square, Target, Wrench, X, XCircle, type LucideIcon } from 'lucide-react'
import { useLlm } from '../../lib/llm-context'
import { Button, Panel } from '../../components/ui'
import { cn } from '../../lib/cn'
import { MAX_STEPS, runAgent, type AgentEvent, type AgentRun } from './loop'
import { buildTools, liveExamples, toolCatalog, type ToolId } from './tools'

type Status = 'idle' | 'running' | 'done' | 'error'
type LiveNodeData = { label: string; sub: string; icon: LucideIcon; status: Status; count?: number }
type LiveFlowNode = Node<LiveNodeData, 'live'>

const LiveNode = memo(function LiveNode({ data }: NodeProps<LiveFlowNode>) {
  const Icon = data.icon
  return (
    <div
      className={cn(
        'w-[160px] rounded-xl border bg-ink-850/95 px-3 py-2.5 transition-all duration-300',
        data.status === 'running' && 'border-iris/70 shadow-[0_0_0_4px_rgb(139_92_246/0.15),0_0_30px_-4px_rgb(139_92_246/0.6)]',
        data.status === 'done' && 'border-volt/40',
        data.status === 'error' && 'border-rose-400/50',
        data.status === 'idle' && 'border-white/10',
      )}
    >
      <Handle type="target" position={Position.Left} id="l" isConnectable={false} />
      <Handle type="target" position={Position.Top} id="t" isConnectable={false} />
      <div className="flex items-center gap-2">
        <span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-md', data.status === 'running' ? 'bg-iris text-white' : data.status === 'done' ? 'bg-volt/20 text-volt-soft' : 'bg-white/5 text-slate-500')}>
          <Icon size={13} aria-hidden />
        </span>
        <span className="truncate font-display text-[13px] font-semibold text-slate-100">{data.label}</span>
        {data.count ? <span className="ml-auto rounded bg-white/5 px-1.5 font-mono text-[10px] text-slate-400">×{data.count}</span> : null}
      </div>
      <p className="mt-1 truncate text-[11px] text-slate-500">{data.sub}</p>
      <Handle type="source" position={Position.Right} id="r" isConnectable={false} />
      <Handle type="source" position={Position.Bottom} id="b" isConnectable={false} />
    </div>
  )
})

const nodeTypes = { live: LiveNode }

interface Pending {
  question: string
  action: string
  resolve: (r: { approved: boolean; comment: string }) => void
}

export function LiveAgent() {
  const { llm } = useLlm()
  const [objective, setObjective] = useState(liveExamples[0].objective)
  const [enabled, setEnabled] = useState<ToolId[]>(liveExamples[0].tools)
  const [events, setEvents] = useState<AgentEvent[]>([])
  const [running, setRunning] = useState(false)
  const [activeTool, setActiveTool] = useState<string | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const [comment, setComment] = useState('')
  const [summary, setSummary] = useState<(AgentRun & { ms: number }) | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abort = useRef<AbortController | null>(null)
  const logRef = useRef<HTMLOListElement>(null)

  useEffect(() => () => abort.current?.abort(), [])
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
  }, [events, pending])

  const start = async () => {
    if (!llm || !objective.trim() || running) return
    setEvents([])
    setSummary(null)
    setError(null)
    setRunning(true)
    abort.current = new AbortController()
    const t0 = performance.now()
    const tools = buildTools(enabled, (question, action) => new Promise((resolve) => setPending({ question, action, resolve })))
    try {
      const run = await runAgent({
        llm,
        objective: objective.trim(),
        tools,
        signal: abort.current.signal,
        onEvent: (e) => {
          setEvents((prev) => [...prev, e])
          if (e.type === 'tool_call') setActiveTool(e.name)
          if (e.type === 'tool_result') setActiveTool(null)
        },
      })
      setSummary({ ...run, ms: performance.now() - t0 })
    } catch (e) {
      setError((e as Error).name === 'AbortError' ? 'Run stopped.' : (e as Error).message)
    } finally {
      setRunning(false)
      setActiveTool(null)
      setPending(null)
    }
  }

  const stop = () => {
    pending?.resolve({ approved: false, comment: 'Run stopped by the operator.' })
    abort.current?.abort()
  }

  const decide = (approved: boolean) => {
    pending?.resolve({ approved, comment: comment.trim() })
    setEvents((prev) => [...prev, { type: 'thought', step: 0, text: `${approved ? '✅ You approved' : '⛔ You rejected'}: ${pending?.action}${comment.trim() ? ` (“${comment.trim()}”)` : ''}` }])
    setPending(null)
    setComment('')
  }

  const toggle = (id: ToolId) => setEnabled((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]))

  // Graph: objective → agent → answer, with the enabled tools hanging under the agent.
  const calls = (name: string) => events.filter((e) => e.type === 'tool_call' && e.name === name).length
  const failed = (name: string) => events.some((e) => e.type === 'tool_result' && e.name === name && !e.ok)
  const done = summary?.final != null
  const started = running || events.length > 0
  const toolsOn = toolCatalog.filter((t) => enabled.includes(t.id))
  const span = (toolsOn.length - 1) * 190
  const nodes: LiveFlowNode[] = [
    { id: 'objective', type: 'live', position: { x: 0, y: 0 }, data: { label: 'Objective', sub: objective || '—', icon: Target, status: started ? 'done' : 'idle' } },
    { id: 'agent', type: 'live', position: { x: 240, y: 0 }, data: { label: 'Agent (LLM)', sub: llm?.model.split('/').pop() ?? 'not connected', icon: Bot, status: running && !activeTool && !pending ? 'running' : started ? 'done' : 'idle' } },
    { id: 'answer', type: 'live', position: { x: 480, y: 0 }, data: { label: 'Answer', sub: done ? 'delivered' : summary?.stoppedAtCap ? 'step cap reached' : 'pending', icon: Flag, status: done ? 'done' : 'idle' } },
    ...toolsOn.map<LiveFlowNode>((t, i) => ({
      id: t.id,
      type: 'live',
      position: { x: 240 - span / 2 + i * 190, y: 150 },
      data: {
        label: t.label,
        sub: t.id,
        icon: t.icon,
        count: calls(t.id),
        status: activeTool === t.id || (t.id === 'ask_human' && pending) ? 'running' : failed(t.id) ? 'error' : calls(t.id) ? 'done' : 'idle',
      },
    })),
  ]
  const edge = (id: string, source: string, target: string, sh: string, th: string, on: boolean, hot: boolean): Edge => {
    const color = hot ? '#a78bfa' : on ? '#3b82f6' : '#2a3045'
    return { id, source, target, sourceHandle: sh, targetHandle: th, type: 'smoothstep', animated: hot, style: { stroke: color, strokeWidth: on || hot ? 1.8 : 1.2 }, markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 } }
  }
  const edges: Edge[] = [
    edge('o-a', 'objective', 'agent', 'r', 'l', started, false),
    edge('a-ans', 'agent', 'answer', 'r', 'l', done, false),
    ...toolsOn.map((t) => edge(`a-${t.id}`, 'agent', t.id, 'b', 't', calls(t.id) > 0, activeTool === t.id || (t.id === 'ask_human' && !!pending))),
  ]

  const final = events.find((e) => e.type === 'final')

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="surface space-y-3 p-4">
          <label htmlFor="live-objective" className="block text-xs font-medium text-slate-400">Objective</label>
          <textarea id="live-objective" rows={3} maxLength={500} value={objective} onChange={(e) => setObjective(e.target.value)} className="field resize-y" disabled={running} />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">Try:</span>
            {liveExamples.map((ex) => (
              <button key={ex.label} type="button" disabled={running} className="chip hover:border-iris/40 hover:text-white" onClick={() => { setObjective(ex.objective); setEnabled(ex.tools) }}>
                {ex.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {running ? (
              <Button onClick={stop}><Square size={14} aria-hidden /> Stop</Button>
            ) : (
              <Button variant="primary" onClick={start} disabled={!llm || !objective.trim()}><Play size={16} aria-hidden /> Run agent</Button>
            )}
            <span className="text-xs text-slate-500">Up to {MAX_STEPS} model steps · tools run in your browser</span>
          </div>
        </div>
        <Panel title="Tools" icon={<Wrench size={12} aria-hidden />}>
          <ul className="space-y-1.5 p-3">
            {toolCatalog.map((t) => {
              const on = enabled.includes(t.id)
              const Icon = t.icon
              return (
                <li key={t.id}>
                  <label className={cn('flex cursor-pointer gap-3 rounded-xl border px-3 py-2 transition-colors', on ? 'border-white/10 bg-white/[0.04]' : 'border-transparent opacity-60 hover:opacity-90')}>
                    <input type="checkbox" checked={on} onChange={() => toggle(t.id)} disabled={running} className="mt-1 accent-iris" />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 text-[13px] text-slate-200"><Icon size={13} aria-hidden /> {t.label}</span>
                      <span className="block text-[11px] leading-snug text-slate-500">{t.blurb}</span>
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </Panel>
      </div>

      <div className="surface h-[300px] overflow-hidden" aria-label="Agent graph: objective, agent, tools and answer">
        <ReactFlow
          key={toolsOn.map((t) => t.id).join()}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.3}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnScroll={false}
          zoomOnScroll={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#262c42" />
        </ReactFlow>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Panel title="Execution trace" actions={summary ? <span className="font-mono text-[10px] text-slate-500">{summary.steps} steps · {summary.tokens.toLocaleString('en')} tokens · {(summary.ms / 1000).toFixed(1)} s</span> : undefined}>
          <ol ref={logRef} className="scroll-thin max-h-[420px] space-y-2 overflow-y-auto p-3" aria-live="polite">
            {!events.length && !running && <li className="p-4 text-center text-sm text-slate-500">{llm ? 'Pick tools, describe the objective and run the agent.' : 'Connect Groq above to run a real agent.'}</li>}
            {events.map((e, i) => <TraceItem key={i} e={e} />)}
            {running && !pending && (
              <li className="flex items-center gap-2 px-2 text-xs text-slate-500"><Loader2 size={13} className="animate-spin" aria-hidden /> {activeTool ? `Running ${activeTool}…` : 'Model is thinking…'}</li>
            )}
            {pending && (
              <li className="rounded-xl border border-amber/40 bg-amber/[0.06] p-3">
                <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-amber">Approval needed</p>
                <p className="text-sm text-slate-200">{pending.question}</p>
                <p className="mt-1 text-sm text-slate-400"><span className="text-slate-500">Proposed action:</span> {pending.action}</p>
                <label htmlFor="approval-comment" className="sr-only">Comment for the agent</label>
                <input id="approval-comment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional comment for the agent" className="field mt-2 text-xs" maxLength={200} />
                <div className="mt-2 flex gap-2">
                  <Button variant="primary" className="px-3 py-1.5 text-xs" onClick={() => decide(true)}><Check size={14} aria-hidden /> Approve</Button>
                  <Button className="px-3 py-1.5 text-xs" onClick={() => decide(false)}><X size={14} aria-hidden /> Reject</Button>
                </div>
              </li>
            )}
          </ol>
        </Panel>
        <Panel title="Answer" icon={<Flag size={12} aria-hidden />}>
          <div className="p-4 text-sm leading-relaxed">
            {final && final.type === 'final' ? (
              <p className="whitespace-pre-wrap text-slate-200">{final.text}</p>
            ) : summary?.stoppedAtCap ? (
              <p className="text-amber/90">The agent reached the {MAX_STEPS}-step cap without a final answer. Try a narrower objective or enable the tool it was missing.</p>
            ) : error ? (
              <p role="alert" className="text-rose-300">{error}</p>
            ) : (
              <p className="text-slate-500">{running ? 'Working…' : 'The final answer appears here.'}</p>
            )}
          </div>
        </Panel>
      </div>
    </div>
  )
}

function TraceItem({ e }: { e: AgentEvent }) {
  if (e.type === 'thought')
    return (
      <li className="flex gap-2.5 rounded-lg px-2 py-1.5">
        <Brain size={14} className="mt-0.5 shrink-0 text-slate-500" aria-hidden />
        <p className="line-clamp-4 text-[13px] text-slate-400">{e.text}</p>
      </li>
    )
  if (e.type === 'tool_call')
    return (
      <li className="rounded-lg border border-volt/20 bg-volt/[0.05] px-3 py-2">
        <p className="flex items-center gap-2 font-mono text-[11px] text-volt-soft"><Wrench size={12} aria-hidden /> {e.name}</p>
        <pre className="scroll-thin mt-1 overflow-x-auto whitespace-pre-wrap font-mono text-[11px] text-slate-300">{Object.entries(e.args).map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`).join('\n')}</pre>
      </li>
    )
  if (e.type === 'tool_result')
    return (
      <li className="px-2">
        <details className="group text-[12px]">
          <summary className="flex cursor-pointer list-none items-start gap-2 text-slate-400 hover:text-slate-200">
            {e.ok ? <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-mint" aria-label="ok" /> : <XCircle size={13} className="mt-0.5 shrink-0 text-rose-400" aria-label="error" />}
            <span className="line-clamp-2">{e.result}</span>
          </summary>
          <pre className="scroll-thin mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-ink-950/80 p-2 font-mono text-[11px] text-slate-400">{e.result}</pre>
        </details>
      </li>
    )
  return (
    <li className="flex gap-2.5 rounded-lg border border-mint/25 bg-mint/[0.05] px-3 py-2">
      <Flag size={14} className="mt-0.5 shrink-0 text-mint" aria-hidden />
      <p className="text-[13px] text-slate-200">Final answer ready (step {e.step}).</p>
    </li>
  )
}
