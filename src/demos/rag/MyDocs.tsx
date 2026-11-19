import { useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react'
import { BookOpen, Cpu, FileText, FileUp, Loader2, Quote, Search, ShieldCheck, Sparkles, Trash2 } from 'lucide-react'
import { documents as sampleDocs, suggestedQuestions, type SourceDoc } from './documents'
import { chunkDoc, extractAnswer, tokenize } from './pipeline'
import { buildTfidfIndex, checkCitations, isContext, isEvidence, search, tfidfQueryVector, type DocIndex, type Hit } from './semantic'
import { parseFile } from './parse'
import { embedTexts, type EmbedProgress } from '../../lib/embeddings'
import { useLlm } from '../../lib/llm-context'
import { Button, Panel } from '../../components/ui'
import { cn } from '../../lib/cn'

const MAX_DOCS = 10
const MAX_CHUNKS = 2000
const TOP_K = 5

interface Answer {
  question: string
  mode: 'llm' | 'extractive'
  text: string
  removed: number[]
  hits: Hit[]
  tokens?: number
}

export function MyDocs() {
  const { llm } = useLlm()
  const [docs, setDocs] = useState<SourceDoc[]>([])
  const [index, setIndex] = useState<DocIndex | null>(null)
  const [progress, setProgress] = useState<EmbedProgress | null>(null)
  const [indexing, setIndexing] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [question, setQuestion] = useState('')
  const [busy, setBusy] = useState(false)
  const [answer, setAnswer] = useState<Answer | null>(null)
  const [focus, setFocus] = useState<number | null>(null)
  const [drag, setDrag] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const isSample = docs.length > 0 && docs.every((d) => sampleDocs.some((s) => s.id === d.id))

  // Re-index whenever the document set changes.
  useEffect(() => {
    if (!docs.length) return setIndex(null)
    let cancelled = false
    const chunks = docs.flatMap((d) => chunkDoc(d, 70, true)).slice(0, MAX_CHUNKS)
    setIndexing(true)
    setAnswer(null)
    embedTexts(chunks.map((c) => c.text), (p) => !cancelled && setProgress(p))
      .then((vectors) => !cancelled && setIndex({ engine: 'minilm', chunks: chunks.map((c, i) => ({ ...c, vector: vectors[i] })) }))
      .catch((e) => {
        if (cancelled) return
        setNotice(`The neural embedding model could not load (${(e as Error).message}). Using lexical TF-IDF retrieval instead.`)
        setIndex(buildTfidfIndex(chunks))
      })
      .finally(() => {
        if (cancelled) return
        setIndexing(false)
        setProgress(null)
      })
    return () => {
      cancelled = true
    }
  }, [docs])

  const addFiles = async (files: FileList | File[]) => {
    setError(null)
    const list = [...files].slice(0, MAX_DOCS)
    const parsed: SourceDoc[] = []
    for (const f of list) {
      try {
        parsed.push(await parseFile(f))
      } catch (e) {
        setError((e as Error).message)
      }
    }
    if (parsed.length) setDocs((prev) => [...(isSample ? [] : prev), ...parsed.filter((p) => !prev.some((d) => d.id === p.id))].slice(0, MAX_DOCS))
    if (fileRef.current) fileRef.current.value = ''
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDrag(false)
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files)
  }

  const ask = async (q: string) => {
    if (!index || !q.trim() || busy) return
    setBusy(true)
    setError(null)
    setFocus(null)
    try {
      const qVec = index.engine === 'minilm' ? (await embedTexts([q]))[0] : tfidfQueryVector(index, q)
      const hits = search(index, qVec, q, TOP_K)
      const strong = hits.filter((h) => isEvidence(index.engine, h))
      const evidence = llm ? hits.filter((h) => isEvidence(index.engine, h) || isContext(index.engine, h)) : strong
      if (!strong.length) {
        setAnswer({ question: q, mode: llm ? 'llm' : 'extractive', text: 'None of your documents seems to cover this question, so there is nothing to answer from.', removed: [], hits })
        return
      }
      if (llm) {
        const sources = evidence.map((h, i) => `[${i + 1}] ${h.docTitle}\n${h.text}`).join('\n\n')
        const reply = await llm.chat({
          temperature: 0.1,
          maxTokens: 2048,
          messages: [
            {
              role: 'system',
              content:
                'Answer the question using ONLY the numbered sources. After every sentence, cite the sources it relies on with ASCII square brackets like [1] or [2][3]. If the sources do not contain the answer, say so plainly. Be concise: at most 5 sentences, no headings. Answer in the language of the question.',
            },
            { role: 'user', content: `Sources:\n${sources}\n\nQuestion: ${q}` },
          ],
        })
        const checked = checkCitations(reply.content ?? '', evidence.length)
        setAnswer({ question: q, mode: 'llm', text: checked.text, removed: checked.removed, hits: evidence, tokens: reply.usage?.total_tokens })
      } else {
        const picked = extractAnswer(evidence, [...new Set(tokenize(q))])
        setAnswer({
          question: q,
          mode: 'extractive',
          text: picked ? picked.map((p) => `${p.text.length > 320 ? `${p.text.slice(0, 320)}…` : p.text} [${p.cite}]`).join(' ') : 'The closest passages are listed below, but none states the answer directly.',
          removed: [],
          hits: evidence,
        })
      }
      setQuestion(q)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    ask(question)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <div className="space-y-4">
        <Panel title="Your knowledge base" icon={<BookOpen size={12} aria-hidden />} actions={<span className="font-mono text-[11px] text-slate-500">{docs.length}/{MAX_DOCS}</span>}>
          <div className="space-y-3 p-3">
            <div
              onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              onDrop={onDrop}
              className={cn('rounded-xl border border-dashed p-4 text-center transition-colors', drag ? 'border-iris/60 bg-iris/[0.06]' : 'border-white/10')}
            >
              <FileUp className="mx-auto mb-2 text-iris-soft" size={20} aria-hidden />
              <p className="text-xs text-slate-400">Drop PDF, TXT or Markdown files here</p>
              <input ref={fileRef} id="rag-upload" type="file" multiple accept=".pdf,.txt,.md,.markdown,application/pdf,text/plain,text/markdown" className="sr-only" onChange={(e) => e.target.files && addFiles(e.target.files)} />
              <Button className="mt-3 px-3 py-1.5 text-xs" onClick={() => fileRef.current?.click()}>Choose files</Button>
              <p className="mt-2 text-[11px] text-slate-500">Up to {MAX_DOCS} files, 10 MB each. Files are read in your browser and never uploaded.</p>
            </div>
            {!docs.length && (
              <Button variant="subtle" className="w-full text-xs" onClick={() => setDocs(sampleDocs)}>
                Or try it with 5 sample company documents
              </Button>
            )}
            <ul className="space-y-1.5">
              {docs.map((d) => (
                <li key={d.id} className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                  <FileText size={14} className="shrink-0 text-slate-500" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-slate-200">{d.title}</span>
                    <span className="block text-[11px] text-slate-500">{d.type} · {d.text.split(/\s+/).length.toLocaleString('en')} words</span>
                  </span>
                  <button type="button" onClick={() => setDocs((prev) => prev.filter((x) => x.id !== d.id))} className="rounded p-1 text-slate-500 hover:bg-white/5 hover:text-rose-300" aria-label={`Remove ${d.title}`}>
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </Panel>

        <Panel title="Index" icon={<Cpu size={12} aria-hidden />}>
          <div className="space-y-2 p-4 text-xs text-slate-400" aria-live="polite">
            {indexing ? (
              <>
                <p className="flex items-center gap-2 text-slate-300">
                  <Loader2 size={14} className="animate-spin" aria-hidden />
                  {progress?.phase === 'download' ? 'Downloading the embedding model (first time only)…' : 'Embedding chunks…'}
                </p>
                {progress && progress.total > 0 && (
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/5" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((100 * progress.done) / progress.total)}>
                    <div className="h-full bg-gradient-to-r from-iris to-volt transition-all" style={{ width: `${(100 * progress.done) / progress.total}%` }} />
                  </div>
                )}
                {progress && <p className="font-mono text-[11px] text-slate-500">{progress.phase === 'download' ? `${(progress.done / 1e6).toFixed(1)} / ${(progress.total / 1e6).toFixed(1)} MB` : `${progress.done} / ${progress.total} chunks`}</p>}
              </>
            ) : index ? (
              <>
                <p className="text-slate-300">{index.chunks.length} chunks indexed.</p>
                <p>{index.engine === 'minilm' ? 'Neural embeddings: all-MiniLM-L6-v2 (384 dimensions), computed in your browser.' : 'Lexical TF-IDF vectors (fallback).'}</p>
                <p>Retrieval: cosine top-{TOP_K}, then hybrid re-rank 0.6·cosine + 0.4·keyword coverage.</p>
              </>
            ) : (
              <p>Add documents to build a searchable index.</p>
            )}
            {notice && <p className="text-amber/90">{notice}</p>}
          </div>
        </Panel>
      </div>

      <div className="min-w-0 space-y-4">
        <div className="surface p-4">
          <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
            <label htmlFor="mydocs-q" className="sr-only">Question about your documents</label>
            <div className="relative flex-1">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden />
              <input id="mydocs-q" className="field pl-10" value={question} maxLength={300} onChange={(e) => setQuestion(e.target.value)} placeholder={index ? 'Ask a question about your documents…' : 'Add documents first'} disabled={!index} />
            </div>
            <Button type="submit" variant="primary" disabled={!index || !question.trim() || busy}>
              {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Sparkles size={16} aria-hidden />} Ask
            </Button>
          </form>
          {isSample && index && (
            <div className="mt-3 flex flex-wrap gap-2">
              {suggestedQuestions.map((q) => (
                <button key={q} type="button" disabled={busy} onClick={() => { setQuestion(q); ask(q) }} className="chip hover:border-iris/40 hover:text-white">{q}</button>
              ))}
            </div>
          )}
          {!llm && index && <p className="mt-3 text-xs text-slate-500">Offline mode: answers are the best-matching sentences, quoted verbatim. Connect Groq above for a written answer with citations.</p>}
          {error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
        </div>

        {answer && (
          <Panel title={answer.mode === 'llm' ? 'Answer · generated from your sources' : 'Answer · extracted from your sources'} icon={<Quote size={12} aria-hidden />} actions={answer.tokens ? <span className="font-mono text-[10px] text-slate-500">{answer.tokens} tokens</span> : undefined}>
            <div className="space-y-3 p-4">
              <p className="text-xs text-slate-500">“{answer.question}”</p>
              <p className="leading-relaxed text-slate-200">
                {answer.text.split(/(\[\d+\])/).map((part, i) => {
                  const m = part.match(/^\[(\d+)\]$/)
                  return m ? (
                    <button key={i} type="button" onClick={() => setFocus(Number(m[1]))} className="mx-0.5 rounded bg-iris/20 px-1 font-mono text-[11px] text-iris-soft hover:bg-iris/35" aria-label={`Show source ${m[1]}`}>
                      {m[1]}
                    </button>
                  ) : (
                    <span key={i}>{part}</span>
                  )
                })}
              </p>
              <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <ShieldCheck size={13} className="text-mint" aria-hidden />
                {answer.mode === 'llm' ? 'The model only saw the sources below; citations were checked against them.' : 'Quoted verbatim from the sources below.'}
                {answer.removed.length > 0 && <span className="text-amber/90"> Removed citations to sources it was never given: {answer.removed.join(', ')}.</span>}
              </p>
            </div>
          </Panel>
        )}

        {answer && answer.hits.length > 0 && (
          <Panel title="Retrieved sources">
            <ol className="divide-y divide-white/[0.05]">
              {answer.hits.map((h, i) => (
                <li key={h.id} className={cn('p-4 transition-colors', focus === i + 1 && 'bg-iris/[0.07]')}>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="grid h-5 w-5 place-items-center rounded bg-iris/20 font-mono text-[11px] text-iris-soft">{i + 1}</span>
                    <span className="truncate text-sm font-medium text-slate-200">{h.docTitle}</span>
                    <span className="font-mono text-[10px] text-slate-500">chunk {h.index}</span>
                    <span className="ml-auto font-mono text-[10px] text-slate-400">cos {h.cosine.toFixed(2)} · keywords {Math.round(h.coverage * 100)}% · score {h.score.toFixed(2)}</span>
                  </div>
                  <div className="mb-2 h-1 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full bg-gradient-to-r from-iris to-volt" style={{ width: `${Math.min(100, h.score * 100)}%` }} />
                  </div>
                  <Highlighted text={h.text} question={answer.question} />
                </li>
              ))}
            </ol>
          </Panel>
        )}
      </div>
    </div>
  )
}

function Highlighted({ text, question }: { text: string; question: string }) {
  const q = new Set(tokenize(question))
  return (
    <p className="text-[13px] leading-relaxed text-slate-400">
      {text.split(/(\s+)/).map((w, i) => {
        const t = tokenize(w)[0]
        return t && q.has(t) ? <mark key={i} className="rounded bg-volt/20 px-0.5 text-slate-100">{w}</mark> : <span key={i}>{w}</span>
      })}
    </p>
  )
}
