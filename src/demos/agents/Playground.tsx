import { useEffect, useMemo, useRef, useState } from 'react'
import { ReactFlow, Background, BackgroundVariant, MarkerType, type Edge } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { motion } from 'framer-motion'
import { CheckCircle2, Circle, FastForward, ListChecks, Loader2, Play, RotateCcw, ScrollText, Sparkles, Terminal, Wrench } from 'lucide-react'
import { buildRun, examples, type NodeId, type Run, type Step } from './engine'
import { AgentNode, type AgentFlowNode, type NodeStatus } from './AgentNode'
import { Button, Panel } from '../../components/ui'
import { useMediaQuery } from '../../lib/hooks'
import { cn } from '../../lib/cn'

const nodeTypes = { agent: AgentNode }
const order: NodeId[] = ['objective', 'planner', 'workerA', 'workerB', 'writer', 'reviewer', 'output']
const links: [NodeId, NodeId][] = [
  ['objective', 'planner'], ['planner', 'workerA'], ['planner', 'workerB'],
  ['workerA', 'writer'], ['workerB', 'writer'], ['writer', 'reviewer'], ['reviewer', 'output'],
]
const layout = {
  horizontal: { objective: [0, 95], planner: [210, 95], workerA: [420, 0], workerB: [420, 190], writer: [630, 95], reviewer: [840, 95], output: [1050, 95] },
  vertical: { objective: [95, 0], planner: [95, 120], workerA: [0, 250], workerB: [190, 250], writer: [95, 380], reviewer: [95, 500], output: [95, 620] },
} as const

const kindStyle: Record<Step['kind'], string> = {
  thought: 'text-slate-400',
  plan: 'text-iris-soft',
  tool: 'text-volt-soft',
  observation: 'text-slate-300',
  handoff: 'text-iris-soft',
  done: 'text-mint',
}

export function AgentPlayground() {
  const [objective, setObjective] = useState(examples[0].objective)
  const [run, setRun] = useState<Run | null>(null)
  const [idx, setIdx] = useState(-1)
  const [speed, setSpeed] = useState(1)
  const [filter, setFilter] = useState<NodeId | null>(null)
  const vertical = useMediaQuery('(max-width: 640px)')
  const logRef = useRef<HTMLOListElement>(null)

  const total = run?.steps.length ?? 0
  const finished = run !== null && idx >= total - 1
  const running = run !== null && idx >= 0 && !finished

  // Step clock: reveals one step at a time using each step's simulated duration.
  useEffect(() => {
    if (!run || !running) return
    const t = setTimeout(() => setIdx((i) => i + 1), run.steps[idx].ms / speed)
    return () => clearTimeout(t)
  }, [run, idx, running, speed])

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
  }, [idx])

  const start = (text = objective) => {
    if (!text.trim()) return
    setFilter(null)
    setRun(buildRun(text))
    setIdx(0)
  }
  const reset = () => { setRun(null); setIdx(-1); setFilter(null) }

  const revealed = useMemo(() => (run ? run.steps.slice(0, idx + 1) : []), [run, idx])
  const statusOf = (id: NodeId): NodeStatus => {
    if (!run) return 'idle'
    if (id === 'objective') return 'done'
    if (revealed.some((s) => s.node === id && s.kind === 'done')) return 'done'
    return revealed.some((s) => s.node === id) ? 'running' : 'idle'
  }
  const statuses = Object.fromEntries(order.map((id) => [id, statusOf(id)])) as Record<NodeId, NodeStatus>

  const agents = run?.agents ?? buildRun(objective || examples[0].objective).agents
  const pos = layout[vertical ? 'vertical' : 'horizontal']

  const nodes: AgentFlowNode[] = order.map((id) => ({
    id,
    type: 'agent',
    position: { x: pos[id][0], y: pos[id][1] },
    data: { spec: agents[id], status: statuses[id], vertical, kind: id === 'objective' || id === 'output' ? 'io' : 'agent', selected: filter === id },
    draggable: false,
    selectable: false,
  }))

  const edges: Edge[] = links.map(([a, b]) => {
    const st = statuses[b]
    const color = st === 'running' ? '#a78bfa' : st === 'done' ? '#3b82f6' : '#2a3045'
    return {
      id: `${a}-${b}`,
      source: a,
      target: b,
      type: 'smoothstep',
      animated: st === 'running',
      style: { stroke: color, strokeWidth: st === 'idle' ? 1.2 : 1.8 },
      markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 },
    }
  })

  const showTasks = revealed.some((s) => s.kind === 'plan')
  const elapsed = revealed.slice(0, -1).reduce((sum, s) => sum + s.ms, 0)
  const logs = revealed.map((s, i) => ({ ...s, t: run!.steps.slice(0, i).reduce((sum, x) => sum + x.ms, 0) }))
  const visibleLogs = filter ? logs.filter((l) => l.node === filter) : logs
  const current = revealed[revealed.length - 1]

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="surface p-4">
        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault()
            start()
          }}
        >
          <label htmlFor="agent-objective" className="sr-only">Business objective</label>
          <input
            id="agent-objective"
            className="field font-medium"
            value={objective}
            maxLength={140}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="Describe a business objective…"
          />
          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={!objective.trim() || running} className="flex-1 sm:flex-none">
              {running ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Play size={16} aria-hidden />}
              {running ? 'Running' : 'Run agents'}
            </Button>
            <Button onClick={() => setIdx(total - 1)} disabled={!running} aria-label="Skip to end">
              <FastForward size={16} aria-hidden />
            </Button>
            <Button onClick={reset} disabled={!run} aria-label="Reset">
              <RotateCcw size={16} aria-hidden />
            </Button>
          </div>
        </form>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">Try:</span>
          {examples.map((ex) => (
            <button
              key={ex.kind}
              type="button"
              disabled={running}
              onClick={() => { setObjective(ex.objective); start(ex.objective) }}
              className="chip transition-colors hover:border-iris/40 hover:text-white disabled:opacity-40"
            >
              {ex.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1 rounded-lg border border-white/[0.07] p-0.5" role="group" aria-label="Simulation speed">
            {[1, 2, 4].map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={speed === s}
                onClick={() => setSpeed(s)}
                className={cn('rounded-md px-2 py-0.5 font-mono text-[11px]', speed === s ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300')}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {current ? `${agents[current.node].name}: ${current.text}` : ''}
      </p>

      {/* Workflow graph */}
        <Panel
          title="Workflow"
          icon={<Sparkles size={12} aria-hidden />}
          actions={
            run && (
              <span className="font-mono text-[11px] text-slate-500">
                step {Math.min(idx + 1, total)}/{total} · {(elapsed / 1000).toFixed(1)}s sim
              </span>
            )
          }
        >
          <div className={cn('relative', vertical ? 'h-[520px]' : 'h-[300px]')}>
            <ReactFlow
              key={vertical ? 'v' : 'h'}
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.08 }}
              minZoom={0.3}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={false}
              panOnDrag={false}
              zoomOnScroll={false}
              zoomOnPinch={false}
              zoomOnDoubleClick={false}
              preventScrolling={false}
              onNodeClick={(_, n) => {
                const id = n.id as NodeId
                if (id !== 'objective' && id !== 'output') setFilter((f) => (f === id ? null : id))
              }}
              proOptions={{ hideAttribution: true }}
            >
              <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="#232839" />
            </ReactFlow>
            {!run && (
              <div className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs text-slate-500">
                Press <span className="text-slate-300">Run agents</span> to execute the workflow
              </div>
            )}
          </div>
        </Panel>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1.4fr_1fr]">
        {/* Task decomposition */}
        <Panel title="Task plan" icon={<ListChecks size={12} aria-hidden />}>
          <div className="p-4">
            {!showTasks ? (
              <p className="text-sm text-slate-500">{run ? 'Planner is decomposing the objective…' : 'Tasks appear here once the Planner breaks down the objective.'}</p>
            ) : (
              <ol className="space-y-2.5">
                {run!.tasks.map((task, i) => {
                  const st = statuses[task.node]
                  return (
                    <motion.li
                      key={task.title}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className={cn('flex gap-3 rounded-xl border p-3 transition-colors', st === 'running' ? 'border-iris/30 bg-iris/[0.05]' : 'border-white/[0.06]')}
                    >
                      <span className="mt-0.5">
                        {st === 'done' ? <CheckCircle2 size={16} className="text-mint" aria-label="done" /> : st === 'running' ? <Loader2 size={16} className="animate-spin text-iris-soft" aria-label="in progress" /> : <Circle size={16} className="text-slate-600" aria-label="pending" />}
                      </span>
                      <span>
                        <span className="block text-sm leading-snug text-slate-200">{task.title}</span>
                        <span className="mt-0.5 block font-mono text-[11px] text-slate-500">→ {run!.agents[task.node].name}</span>
                      </span>
                    </motion.li>
                  )
                })}
              </ol>
            )}
          </div>
        </Panel>

        {/* Execution log */}
        <Panel
          title="Execution log"
          className="md:order-last md:col-span-2 xl:order-none xl:col-span-1"
          icon={<Terminal size={12} aria-hidden />}
          actions={
            <div className="flex flex-wrap justify-end gap-1">
              {(['planner', 'workerA', 'workerB', 'writer', 'reviewer'] as NodeId[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={filter === id}
                  onClick={() => setFilter((f) => (f === id ? null : id))}
                  className={cn('rounded-md px-1.5 py-0.5 font-mono text-[10px] transition-colors', filter === id ? 'bg-volt/20 text-volt-soft' : 'text-slate-500 hover:text-slate-300')}
                >
                  {agents[id].name.toLowerCase()}
                </button>
              ))}
            </div>
          }
        >
          <ol ref={logRef} className="scroll-thin h-[300px] space-y-1.5 overflow-y-auto p-4 font-mono text-[12px] leading-relaxed">
            {visibleLogs.length === 0 && <li className="text-slate-600">{filter ? 'No events for this agent yet.' : '$ waiting for execution…'}</li>}
            {visibleLogs.map((l, i) => (
              <motion.li key={`${l.t}-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2.5">
                <span className="shrink-0 text-slate-600">+{(l.t / 1000).toFixed(1)}s</span>
                <span className="w-[88px] shrink-0 truncate text-slate-500">{agents[l.node].name.toLowerCase()}</span>
                <span className={cn('min-w-0 break-words', kindStyle[l.kind])}>
                  {l.kind === 'tool' && <Wrench size={11} className="mr-1 inline -translate-y-px" aria-label="tool call" />}
                  {l.text}
                </span>
              </motion.li>
            ))}
          </ol>
        </Panel>

        {/* Final result */}
        <Panel title="Result" icon={<ScrollText size={12} aria-hidden />}>
          <div className="scroll-thin h-[300px] overflow-y-auto p-4">
              {finished ? (
                <motion.article key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <h4 className="text-base font-semibold">{run!.result.title}</h4>
                  <p className="mt-1.5 text-sm text-slate-400">{run!.result.summary}</p>
                  {run!.result.sections.map((sec) => (
                    <div key={sec.heading} className="mt-4">
                      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-iris-soft">{sec.heading}</p>
                      <ul className="mt-1.5 space-y-1 text-sm text-slate-300">
                        {sec.items.map((it) => (
                          <li key={it} className="flex gap-2"><span className="text-slate-600">–</span>{it}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  <p className="mt-4 border-t border-white/[0.06] pt-3 text-[11px] text-slate-500">
                    Illustrative output from a deterministic script. It shows the structure an agent team would produce, not real research.
                  </p>
                </motion.article>
              ) : (
                <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-slate-500">
                  {run ? 'The deliverable appears when the Reviewer approves it.' : 'No result yet.'}
                </motion.p>
              )}
          </div>
        </Panel>
      </div>
    </div>
  )
}
