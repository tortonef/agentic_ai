import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AlertTriangle, CheckCircle2, Code2, Database, FileUp, Loader2, MessageSquareText, Play, ShieldAlert, Sparkles, Table2, XCircle } from 'lucide-react'
import { ensureDemoTable, loadCsv, query, type QueryResult } from '../../lib/duckdb'
import { guardSql, tableName } from '../../lib/sqlGuard'
import { useLlm } from '../../lib/llm-context'
import { Button, Panel } from '../../components/ui'
import { cn } from '../../lib/cn'
import { profileTable, qualityChecks, runCharts, suggestCharts, type ChartData, type Profile, type QualityIssue } from './profile'
import { askData, type Answer } from './ask'
import { Chart, DataTable } from './Chart'
import { fmt } from './spec'

type View = 'overview' | 'ask' | 'sql'
const MAX_BYTES = 25 * 1024 * 1024

const demoQuestions = [
  'Monthly revenue by region',
  'Which category has the highest return rate online?',
  'Top 5 stores by average discount',
  'Revenue share by channel',
]

export default function DataLab() {
  const { llm } = useLlm()
  const [status, setStatus] = useState<'boot' | 'loading' | 'ready' | 'error'>('boot')
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [issues, setIssues] = useState<QualityIssue[]>([])
  const [charts, setCharts] = useState<ChartData[]>([])
  const [isDemo, setIsDemo] = useState(true)
  const [view, setView] = useState<View>('overview')
  const fileRef = useRef<HTMLInputElement>(null)

  const analyse = async (table: string) => {
    const p = await profileTable(table)
    const [q, c] = await Promise.all([qualityChecks(p), runCharts(suggestCharts(p))])
    setProfile(p)
    setIssues(q)
    setCharts(c)
  }

  useEffect(() => {
    ensureDemoTable()
      .then(() => analyse('retail_sales'))
      .then(() => setStatus('ready'))
      .catch((e) => {
        setError(`The SQL engine could not start: ${(e as Error).message}`)
        setStatus('error')
      })
  }, [])

  const onFile = async (file: File | undefined) => {
    if (!file) return
    if (file.size > MAX_BYTES) return setError('That file is larger than 25 MB. Try a smaller extract.')
    setStatus('loading')
    setError(null)
    try {
      const t = tableName(file.name)
      await loadCsv(t, await file.text())
      await analyse(t)
      setIsDemo(false)
      setView('overview')
    } catch (e) {
      setError(`Could not read that CSV: ${(e as Error).message}`)
    } finally {
      setStatus('ready')
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  if (status === 'boot' || (status === 'error' && !profile))
    return (
      <div className="grid h-[420px] place-items-center text-center">
        {status === 'boot' ? (
          <div className="text-slate-400">
            <Loader2 className="mx-auto mb-3 animate-spin text-iris-soft" aria-hidden />
            Starting DuckDB in your browser… <span className="block text-xs text-slate-500">about 7 MB, first time only</span>
          </div>
        ) : (
          <p role="alert" className="max-w-md text-sm text-rose-300">{error}</p>
        )}
      </div>
    )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
        <Database size={18} className="text-iris-soft" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-sm text-slate-100">{profile!.table}</p>
          <p className="text-xs text-slate-500">
            {profile!.rows.toLocaleString('en')} rows · {profile!.columns.length} columns · {isDemo ? 'synthetic retail sales with a few planted data issues' : 'your file, loaded only in this browser'}
          </p>
        </div>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="sr-only" id="data-upload" onChange={(e) => onFile(e.target.files?.[0])} />
        <Button onClick={() => fileRef.current?.click()} disabled={status === 'loading'} className="px-3 py-2 text-xs">
          {status === 'loading' ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <FileUp size={14} aria-hidden />} Upload a CSV
        </Button>
        {!isDemo && (
          <Button variant="subtle" className="px-3 py-2 text-xs" onClick={() => { setStatus('loading'); analyse('retail_sales').then(() => { setIsDemo(true); setStatus('ready') }) }}>
            Back to demo data
          </Button>
        )}
      </div>
      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}

      <div className="flex gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1" role="group" aria-label="Data views">
        {([
          ['overview', 'Profile & quality', Table2],
          ['ask', 'Ask in plain language', MessageSquareText],
          ['sql', 'SQL editor', Code2],
        ] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            aria-pressed={view === id}
            onClick={() => setView(id)}
            className={cn('flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-2 py-2 sm:px-3 text-xs font-medium transition-colors sm:text-sm', view === id ? 'bg-iris/15 text-white' : 'text-slate-400 hover:text-slate-200')}
          >
            <Icon size={15} aria-hidden /> <span className="truncate">{label}</span>
          </button>
        ))}
      </div>

      {view === 'overview' && <Overview profile={profile!} issues={issues} charts={charts} />}
      {view === 'ask' && <Ask key={profile!.table} profile={profile!} isDemo={isDemo} live={!!llm} />}
      {view === 'sql' && <SqlEditor key={profile!.table} table={profile!.table} />}
    </div>
  )
}

function Overview({ profile, issues, charts }: { profile: Profile; issues: QualityIssue[]; charts: ChartData[] }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {charts.map((c) => (
          <Panel key={c.title} title={c.title} className={cn(c.chart === 'kpi' && 'md:col-span-1')}>
            <div className="p-4">
              <Chart spec={c} result={c.result} height={c.chart === 'kpi' ? 120 : 220} />
            </div>
          </Panel>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Column profile">
          <div className="scroll-thin max-h-[320px] overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-ink-850 text-slate-500">
                <tr>
                  {['Column', 'Type', 'Distinct', 'Missing', 'Min', 'Max'].map((h) => (
                    <th key={h} scope="col" className="px-3 py-2 font-mono font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {profile.columns.map((c) => (
                  <tr key={c.name} className="border-t border-white/[0.04] text-slate-300">
                    <td className="px-3 py-1.5 font-mono text-slate-100">{c.name}</td>
                    <td className="px-3 py-1.5 text-slate-500">{c.type}</td>
                    <td className="px-3 py-1.5">{c.distinct.toLocaleString('en')}</td>
                    <td className={cn('px-3 py-1.5', c.nullPct > 0 && 'text-amber')}>{c.nullPct ? `${c.nullPct.toFixed(1)}%` : '—'}</td>
                    <td className="max-w-[120px] truncate px-3 py-1.5">{c.min ?? '—'}</td>
                    <td className="max-w-[120px] truncate px-3 py-1.5">{c.max ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title="Data quality checks" icon={<ShieldAlert size={13} aria-hidden />}>
          <ul className="space-y-2 p-4">
            {issues.map((i) => (
              <li key={i.check} className="flex gap-2.5 text-sm">
                {i.severity === 'ok' ? (
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-mint" aria-label="passed" />
                ) : i.severity === 'warn' ? (
                  <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber" aria-label="warning" />
                ) : (
                  <XCircle size={16} className="mt-0.5 shrink-0 text-rose-400" aria-label="failed" />
                )}
                <span>
                  <span className="font-medium text-slate-200">{i.check}</span>
                  <span className="block text-xs text-slate-400">{i.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  )
}

function Ask({ profile, isDemo, live }: { profile: Profile; isDemo: boolean; live: boolean }) {
  const { llm } = useLlm()
  const [question, setQuestion] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [answers, setAnswers] = useState<(Answer & { question: string })[]>([])
  const abort = useRef<AbortController | null>(null)

  useEffect(() => () => abort.current?.abort(), [])

  const ask = async (q: string) => {
    if (!llm || !q.trim() || busy) return
    setBusy(true)
    setError(null)
    abort.current = new AbortController()
    try {
      const a = await askData(llm, profile, q.trim(), abort.current.signal)
      setAnswers((prev) => [{ ...a, question: q.trim() }, ...prev].slice(0, 5))
      setQuestion('')
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    ask(question)
  }

  if (!live)
    return (
      <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
        <Sparkles className="mx-auto mb-3 text-iris-soft" aria-hidden />
        <p className="font-medium text-slate-200">Connect a Groq key above to ask questions in plain language.</p>
        <p className="mx-auto mt-2 max-w-lg text-sm text-slate-400">
          The model writes the SQL and picks a chart; the query runs here in DuckDB and only the schema, three sample rows and the result go to Groq. Without a key you can still use the profile and the SQL editor.
        </p>
      </div>
    )

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="data-question" className="sr-only">Question about the data</label>
        <input id="data-question" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder={`Ask about ${profile.table}…`} className="field flex-1" maxLength={300} />
        <Button type="submit" variant="primary" disabled={busy || !question.trim()}>
          {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Sparkles size={16} aria-hidden />} Ask
        </Button>
      </form>
      {isDemo && (
        <div className="flex flex-wrap gap-2">
          {demoQuestions.map((q) => (
            <button key={q} type="button" className="chip hover:border-iris/40 hover:text-white" onClick={() => ask(q)} disabled={busy}>{q}</button>
          ))}
        </div>
      )}
      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      {busy && <p className="flex items-center gap-2 text-sm text-slate-400" aria-live="polite"><Loader2 size={14} className="animate-spin" aria-hidden /> Writing SQL, running it in DuckDB and reading the result…</p>}
      {answers.map((a, i) => (
        <Panel key={answers.length - i} title={a.spec.title} actions={<span className="font-mono text-[10px] text-slate-500">{a.attempts > 1 ? 'fixed after 1 retry · ' : ''}{a.tokens.toLocaleString('en')} tokens</span>}>
          <div className="space-y-3 p-4">
            <p className="text-xs text-slate-500">“{a.question}”</p>
            {a.caveat && (
              <p className="flex gap-2 rounded-lg border border-amber/30 bg-amber/[0.06] px-3 py-2 text-[13px] text-amber/90">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden /> {a.caveat}
              </p>
            )}
            {a.insight && <p className="text-sm leading-relaxed text-slate-200">{a.insight}</p>}
            <Chart spec={a.spec} result={a.result} />
            <details className="text-xs">
              <summary className="cursor-pointer text-slate-400 hover:text-slate-200">SQL and reasoning</summary>
              {a.explanation && <p className="mt-2 text-slate-400">{a.explanation}</p>}
              <pre className="scroll-thin mt-2 overflow-x-auto rounded-lg bg-ink-950/80 p-3 font-mono text-[11px] text-slate-300">{a.sql}</pre>
            </details>
          </div>
        </Panel>
      ))}
    </div>
  )
}

function SqlEditor({ table }: { table: string }) {
  const [sql, setSql] = useState(`SELECT * FROM "${table}" LIMIT 20`)
  const [result, setResult] = useState<QueryResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const run = async () => {
    const g = guardSql(sql)
    if (!g.ok) return setError(g.reason)
    setBusy(true)
    setError(null)
    try {
      setResult(await query(g.sql))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <label htmlFor="sql-editor" className="sr-only">SQL query</label>
      <textarea
        id="sql-editor"
        value={sql}
        onChange={(e) => setSql(e.target.value)}
        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') run() }}
        rows={5}
        spellCheck={false}
        className="field font-mono text-xs"
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" onClick={run} disabled={busy}>
          {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Play size={16} aria-hidden />} Run
        </Button>
        <span className="text-xs text-slate-500">Ctrl+Enter · read-only, one SELECT per run, up to 1,000 rows</span>
        {result && <span className="ml-auto text-xs text-slate-400">{fmt(result.rows.length)} rows</span>}
      </div>
      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      {result && <DataTable result={result} maxHeight={360} />}
    </div>
  )
}
