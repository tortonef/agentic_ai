import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowDown, ArrowUp, Check, FileText, Minus, Play, Search } from 'lucide-react'
import { documents, suggestedQuestions } from './documents'
import { DIM, RELEVANCE_THRESHOLD, runPipeline, type Scored, type Vector } from './pipeline'
import { Button, Panel } from '../../components/ui'
import { cn } from '../../lib/cn'

const stages = [
  { id: 'docs', label: 'Documents' },
  { id: 'chunk', label: 'Chunking' },
  { id: 'embed', label: 'Embedding' },
  { id: 'retrieve', label: 'Retrieval' },
  { id: 'rank', label: 'Re-ranking' },
  { id: 'context', label: 'Context' },
  { id: 'answer', label: 'Answer' },
] as const

const docHue: Record<string, string> = {
  remote: '#a78bfa', faq: '#60a5fa', ai: '#34d399', incident: '#f472b6', expenses: '#fbbf24',
}

export function RagExplorer() {
  const reduce = useReducedMotion()
  const [selected, setSelected] = useState<string[]>(documents.map((d) => d.id))
  const [chunkWords, setChunkWords] = useState(45)
  const [overlap, setOverlap] = useState(false)
  const [topK, setTopK] = useState(4)
  const [question, setQuestion] = useState(suggestedQuestions[0])
  const [asked, setAsked] = useState<string | null>(null)
  const [stage, setStage] = useState(0)
  const [reached, setReached] = useState(0)
  const [focusChunk, setFocusChunk] = useState<string | null>(null)

  const docs = documents.filter((d) => selected.includes(d.id))
  const result = useMemo(
    () => runPipeline(docs, asked ?? '', { chunkWords, overlap, topK }),
    [selected, chunkWords, overlap, topK, asked],
  )

  // Animate through the stages after each question.
  useEffect(() => {
    if (asked === null || reached >= stages.length - 1) return
    const t = setTimeout(() => { setReached((r) => r + 1); setStage((s) => s + 1) }, reduce ? 0 : 650)
    return () => clearTimeout(t)
  }, [asked, reached, reduce])

  const ask = (q = question) => {
    if (!q.trim() || !docs.length) return
    setQuestion(q)
    setAsked(q)
    setFocusChunk(null)
    setStage(0)
    setReached(0)
  }

  const toggleDoc = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const current = stages[stage].id

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      {/* Corpus + parameters */}
      <div className="space-y-4">
        <Panel title="Knowledge base" icon={<FileText size={12} aria-hidden />} actions={<span className="font-mono text-[11px] text-slate-500">{selected.length}/{documents.length}</span>}>
          <ul className="space-y-1.5 p-3">
            {documents.map((d) => {
              const on = selected.includes(d.id)
              return (
                <li key={d.id}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => toggleDoc(d.id)}
                    className={cn('flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors', on ? 'border-white/10 bg-white/[0.04]' : 'border-transparent opacity-55 hover:opacity-90')}
                  >
                    <span className={cn('grid h-4 w-4 shrink-0 place-items-center rounded border', on ? 'border-transparent' : 'border-white/20')} style={on ? { background: docHue[d.id] } : undefined}>
                      {on && <Check size={11} className="text-ink-950" strokeWidth={3} aria-hidden />}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] text-slate-200">{d.title}</span>
                      <span className="block text-[11px] text-slate-500">{d.type} · {d.text.split(/\s+/).length} words</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="border-t border-white/[0.06] px-4 py-2.5 text-[11px] text-slate-500">Fictional sample documents.</p>
        </Panel>

        <Panel title="Parameters">
          <div className="space-y-4 p-4 text-sm">
            <Slider label="Chunk size" value={chunkWords} min={20} max={90} step={5} unit=" words" onChange={setChunkWords} />
            <Slider label="Top-k retrieved" value={topK} min={1} max={8} step={1} onChange={setTopK} />
            <label className="flex cursor-pointer items-center justify-between text-slate-300">
              <span>Sentence overlap</span>
              <input type="checkbox" checked={overlap} onChange={(e) => setOverlap(e.target.checked)} className="h-4 w-4 accent-[#8b5cf6]" />
            </label>
            <p className="text-[11px] leading-relaxed text-slate-500">Changing a parameter re-runs the pipeline instantly; watch how chunk size affects ranking.</p>
          </div>
        </Panel>
      </div>

      {/* Query + pipeline */}
      <div className="min-w-0 space-y-4">
        <div className="surface p-4">
          <form className="flex flex-col gap-3 sm:flex-row" onSubmit={(e) => { e.preventDefault(); ask() }}>
            <label htmlFor="rag-q" className="sr-only">Question</label>
            <div className="relative flex-1">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden />
              <input id="rag-q" className="field pl-10" value={question} maxLength={160} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask about the documents…" />
            </div>
            <Button type="submit" variant="primary" disabled={!question.trim() || !docs.length}>
              <Play size={16} aria-hidden /> Run pipeline
            </Button>
          </form>
          <div className="mt-3 flex flex-wrap gap-2">
            {suggestedQuestions.map((q) => (
              <button key={q} type="button" onClick={() => ask(q)} className="chip transition-colors hover:border-iris/40 hover:text-white">
                {q}
              </button>
            ))}
          </div>
          {!docs.length && <p className="mt-3 text-xs text-amber">Select at least one document.</p>}
        </div>

        {/* Stepper */}
        <div role="tablist" aria-label="Pipeline stages" className="flex flex-wrap gap-1 rounded-2xl border border-white/[0.06] bg-ink-950/50 p-1.5">
          {stages.map((s, i) => {
            const enabled = asked !== null && i <= reached
            return (
              <button
                key={s.id}
                role="tab"
                aria-selected={stage === i}
                disabled={!enabled}
                onClick={() => setStage(i)}
                className={cn(
                  'relative flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-colors',
                  stage === i && enabled ? 'text-white' : enabled ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600',
                )}
              >
                {stage === i && enabled && <motion.span layoutId="rag-stage" className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-iris/30 to-volt/30" />}
                <span className={cn('grid h-5 w-5 place-items-center rounded-full font-mono text-[10px]', enabled ? 'bg-white/10' : 'bg-white/[0.03]')}>{i + 1}</span>
                {s.label}
              </button>
            )
          })}
        </div>

        <div className="surface min-h-[380px] p-4 sm:p-5">
          {asked === null ? (
            <Empty>Ask a question to run it through the pipeline. Every stage is computed live in your browser.</Empty>
          ) : (
              <motion.div key={current} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                {current === 'docs' && (
                  <Stage title={`${docs.length} documents selected`} note="The retrieval corpus. Only these documents can be used to ground the answer.">
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {docs.map((d) => (
                        <li key={d.id} className="rounded-xl border border-white/[0.06] p-3">
                          <p className="flex items-center gap-2 text-sm text-slate-200"><Dot id={d.id} />{d.title}</p>
                          <p className="mt-1 line-clamp-2 text-xs text-slate-500">{d.text}</p>
                        </li>
                      ))}
                    </ul>
                  </Stage>
                )}

                {current === 'chunk' && (
                  <Stage title={`${result.chunks.length} chunks`} note={`Sentence-aware splitting at ~${chunkWords} words${overlap ? ', repeating one sentence between neighbours' : ''}. Select a chunk to read it.`}>
                    <div className="space-y-3">
                      {docs.map((d) => (
                        <div key={d.id}>
                          <p className="mb-1.5 text-xs text-slate-400">{d.title}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {result.chunks.filter((c) => c.docId === d.id).map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                aria-pressed={focusChunk === c.id}
                                onClick={() => setFocusChunk((f) => (f === c.id ? null : c.id))}
                                className={cn('rounded-md border px-2 py-1 font-mono text-[11px] transition-all', focusChunk === c.id ? 'border-white/40 text-white' : 'border-white/10 text-slate-400 hover:border-white/25')}
                                style={{ background: `${docHue[d.id]}${focusChunk === c.id ? '33' : '14'}` }}
                              >
                                {c.id} · {c.text.split(/\s+/).length}w
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                      {focusChunk && (
                        <p className="rounded-xl border border-white/[0.08] bg-ink-950/60 p-3 text-sm leading-relaxed text-slate-300">
                          {result.chunks.find((c) => c.id === focusChunk)?.text}
                        </p>
                      )}
                    </div>
                  </Stage>
                )}

                {current === 'embed' && (
                  <Stage title={`${DIM}-dimensional vectors`} note="Each chunk and the query become vectors: TF-IDF term weights hashed into 64 buckets, then normalised. This stands in for a neural embedding model.">
                    <div className="space-y-2.5">
                      <EmbeddingRow label="query" vector={result.queryVector} highlight />
                      <p className="pt-1 font-mono text-[11px] text-slate-500">query terms: {result.queryTokens.join(', ') || '—'}</p>
                      {result.retrieved.slice(0, 4).map((c) => (
                        <EmbeddingRow key={c.id} label={c.id} vector={c.vector} />
                      ))}
                    </div>
                  </Stage>
                )}

                {current === 'retrieve' && (
                  <Stage title={`Top ${result.retrieved.length} by cosine similarity`} note={`Out of ${result.chunks.length} chunks, the ${topK} nearest to the query vector.`}>
                    <ul className="space-y-2">
                      {result.retrieved.map((c) => (
                        <ChunkRow key={c.id} c={c} metric={c.cosine} metricLabel="cos" rank={c.retrievalRank} />
                      ))}
                    </ul>
                  </Stage>
                )}

                {current === 'rank' && (
                  <Stage title="Hybrid re-ranking" note={`score = 0.6 × cosine + 0.4 × keyword coverage. Chunks below ${RELEVANCE_THRESHOLD} are dropped as irrelevant.`}>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[460px] text-left text-sm">
                        <thead className="font-mono text-[11px] uppercase tracking-wider text-slate-500">
                          <tr><th className="py-2 pr-3 font-normal">#</th><th className="pr-3 font-normal">chunk</th><th className="pr-3 font-normal">cosine</th><th className="pr-3 font-normal">coverage</th><th className="pr-3 font-normal">score</th><th className="font-normal">Δ</th></tr>
                        </thead>
                        <tbody>
                          {result.reranked.map((c) => {
                            const delta = c.retrievalRank - c.finalRank
                            const dropped = c.score < RELEVANCE_THRESHOLD
                            return (
                              <tr key={c.id} className={cn('border-t border-white/[0.05]', dropped && 'opacity-40')}>
                                <td className="py-2 pr-3 font-mono text-slate-400">{c.finalRank}</td>
                                <td className="pr-3"><span className="flex items-center gap-2 font-mono text-xs text-slate-200"><Dot id={c.docId} />{c.id}</span></td>
                                <td className="pr-3 font-mono text-xs text-slate-400">{c.cosine.toFixed(3)}</td>
                                <td className="pr-3 font-mono text-xs text-slate-400">{(c.coverage * 100).toFixed(0)}%</td>
                                <td className="pr-3 font-mono text-xs text-slate-100">{c.score.toFixed(3)}</td>
                                <td className="font-mono text-xs">
                                  {delta > 0 ? <span className="inline-flex items-center text-mint"><ArrowUp size={12} />{delta}</span> : delta < 0 ? <span className="inline-flex items-center text-rose-400"><ArrowDown size={12} />{-delta}</span> : <Minus size={12} className="text-slate-600" />}
                                  {dropped && <span className="ml-2 text-slate-500">dropped</span>}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Stage>
                )}

                {current === 'context' && (
                  <Stage title="Prompt with injected context" note={`≈${Math.ceil(result.context.length / 4) + 60} tokens. The model is told to answer only from these numbered sources.`}>
                    <pre className="scroll-thin max-h-[300px] overflow-auto whitespace-pre-wrap rounded-xl border border-white/[0.06] bg-ink-950/70 p-4 font-mono text-[12px] leading-relaxed text-slate-400">
                      <span className="text-iris-soft">SYSTEM:</span> Answer using only the sources below. Cite them as [n]. If they do not contain the answer, say so.{'\n\n'}
                      <span className="text-volt-soft">SOURCES:</span>{'\n'}{result.context || '(no chunk passed the relevance threshold)'}{'\n\n'}
                      <span className="text-mint">USER:</span> {asked}
                    </pre>
                  </Stage>
                )}

                {current === 'answer' && (
                  <Stage title="Grounded answer" note="Generated extractively: the best-matching source sentences, each with a citation. A real system would let an LLM write this from the same context.">
                    {result.answer ? (
                      <>
                        <p className="rounded-xl border border-iris/20 bg-iris/[0.05] p-4 text-[15px] leading-relaxed text-slate-200">
                          {result.answer.map((s, i) => (
                            <span key={i}>
                              {s.text}{' '}
                              <button type="button" onClick={() => setFocusChunk(contextChunk(result.reranked, s.cite)?.id ?? null)} className="mr-1 rounded bg-volt/20 px-1.5 font-mono text-[11px] text-volt-soft hover:bg-volt/30" aria-label={`Show source ${s.cite}`}>
                                [{s.cite}]
                              </button>
                            </span>
                          ))}
                        </p>
                        <p className="mb-2 mt-5 font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">Sources</p>
                        <ul className="space-y-2">
                          {result.reranked.filter((c) => c.score >= RELEVANCE_THRESHOLD).map((c, i) => (
                            <li key={c.id} className={cn('rounded-xl border p-3 text-sm transition-colors', focusChunk === c.id ? 'border-volt/50 bg-volt/[0.06]' : 'border-white/[0.06]')}>
                              <p className="mb-1 flex items-center gap-2 font-mono text-[11px] text-slate-400">
                                <span className="text-volt-soft">[{i + 1}]</span><Dot id={c.docId} />{c.docTitle} · {c.id}
                              </p>
                              <p className="text-slate-400">{c.text}</p>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <p className="rounded-xl border border-amber/20 bg-amber/[0.05] p-4 text-sm text-slate-300">
                        The selected documents don't contain enough relevant information to answer this question. Rather than guess, the system declines: this is the behaviour grounding is meant to enforce.
                      </p>
                    )}
                  </Stage>
                )}
              </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}

const contextChunk = (reranked: Scored[], cite: number) => reranked.filter((c) => c.score >= RELEVANCE_THRESHOLD)[cite - 1]

function Stage({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <div>
      <h4 className="text-lg font-semibold">{title}</h4>
      <p className="mb-4 mt-1 text-sm text-slate-500">{note}</p>
      {children}
    </div>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return <div className="grid min-h-[340px] place-items-center text-center text-sm text-slate-500"><p className="max-w-sm">{children}</p></div>
}

const Dot = ({ id }: { id: string }) => <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: docHue[id] }} aria-hidden />

function EmbeddingRow({ label, vector, highlight }: { label: string; vector: Vector; highlight?: boolean }) {
  const max = Math.max(...vector.map(Math.abs)) || 1
  return (
    <div className="flex items-center gap-3">
      <span className={cn('w-20 shrink-0 truncate font-mono text-[11px]', highlight ? 'text-iris-soft' : 'text-slate-500')}>{label}</span>
      <div className="grid flex-1 gap-px" style={{ gridTemplateColumns: `repeat(${DIM}, minmax(0, 1fr))` }} aria-hidden>
        {vector.map((v, i) => (
          <span
            key={i}
            className="h-5 rounded-[2px]"
            style={{ background: v >= 0 ? `rgb(139 92 246 / ${Math.abs(v) / max})` : `rgb(59 130 246 / ${Math.abs(v) / max})`, outline: '1px solid rgb(255 255 255 / 0.03)' }}
          />
        ))}
      </div>
    </div>
  )
}

function ChunkRow({ c, metric, metricLabel, rank }: { c: Scored; metric: number; metricLabel: string; rank: number }) {
  return (
    <li className="rounded-xl border border-white/[0.06] p-3">
      <div className="mb-1.5 flex items-center gap-3">
        <span className="font-mono text-xs text-slate-500">#{rank}</span>
        <span className="flex items-center gap-2 font-mono text-xs text-slate-200"><Dot id={c.docId} />{c.id}</span>
        <div className="ml-auto flex items-center gap-2">
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/5">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-iris to-volt" initial={{ width: 0 }} animate={{ width: `${Math.min(100, metric * 100)}%` }} transition={{ duration: 0.6 }} />
          </div>
          <span className="w-16 text-right font-mono text-[11px] text-slate-400">{metricLabel} {metric.toFixed(3)}</span>
        </div>
      </div>
      <p className="line-clamp-2 text-xs text-slate-400">{c.text}</p>
    </li>
  )
}

function Slider({ label, value, min, max, step, unit = '', onChange }: { label: string; value: number; min: number; max: number; step: number; unit?: string; onChange: (v: number) => void }) {
  const id = `slider-${label.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-slate-300">
        <label htmlFor={id}>{label}</label>
        <span className="font-mono text-xs text-slate-400">{value}{unit}</span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[#8b5cf6]" />
    </div>
  )
}
