import { useId, useState, type FormEvent } from 'react'
import { ExternalLink, KeyRound, Loader2, LogOut, ShieldCheck, Zap } from 'lucide-react'
import { MODELS, verifyKey } from '../lib/llm'
import { useLlm } from '../lib/llm-context'
import { Button } from './ui'
import { cn } from '../lib/cn'

/** "Connect Groq" bar shown above the Lab: turns every demo from offline mode into live LLM calls. */
export function ApiKeyPanel() {
  const { llm, model, remembered, connect, disconnect, setModel } = useLlm()
  const [open, setOpen] = useState(false)
  const [key, setKey] = useState('')
  const [draftModel, setDraftModel] = useState(model)
  const [remember, setRemember] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ids = { key: useId(), model: useId(), remember: useId(), note: useId() }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const k = key.trim()
    if (!k) return
    setBusy(true)
    setError(null)
    try {
      await verifyKey(k)
      connect(k, draftModel, remember)
      setKey('')
      setOpen(false)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (llm) {
    return (
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-mint/25 bg-mint/[0.05] px-4 py-3">
        <span className="chip border-mint/30 bg-mint/10 text-mint">
          <Zap size={12} aria-hidden /> Live · Groq connected
        </span>
        <label htmlFor={ids.model} className="sr-only">Model</label>
        <select id={ids.model} value={model} onChange={(e) => setModel(e.target.value)} className="field w-auto py-1.5 text-xs">
          {MODELS.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
        <span className="text-xs text-slate-400">{remembered ? 'Key saved on this device.' : 'Key kept in memory until you leave the page.'}</span>
        <Button variant="subtle" className="ml-auto px-3 py-1.5 text-xs" onClick={disconnect}>
          <LogOut size={14} aria-hidden /> Disconnect{remembered ? ' and forget key' : ''}
        </Button>
      </div>
    )
  }

  return (
    <div className="mb-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="chip border-amber/25 bg-amber/[0.06] text-amber/90">Offline mode</span>
        <p className="min-w-0 flex-1 text-sm text-slate-400">
          Every tool works with local code. Connect a free Groq key to run real LLMs: questions on your data, answers with citations, agents that call tools.
        </p>
        <Button variant="primary" className="px-3 py-2 text-xs" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <KeyRound size={14} aria-hidden /> Connect Groq
        </Button>
      </div>

      {open && (
        <form onSubmit={submit} className="mt-4 grid gap-3 border-t border-white/[0.06] pt-4 md:grid-cols-[1fr_auto_auto]" aria-describedby={ids.note}>
          <div>
            <label htmlFor={ids.key} className="mb-1 block text-xs text-slate-400">Groq API key</label>
            <input
              id={ids.key}
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="gsk_…"
              className="field font-mono"
            />
          </div>
          <div>
            <label htmlFor={ids.model} className="mb-1 block text-xs text-slate-400">Model</label>
            <select id={ids.model} value={draftModel} onChange={(e) => setDraftModel(e.target.value)} className="field">
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit" variant="primary" disabled={busy || !key.trim()} className="w-full">
              {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Zap size={16} aria-hidden />}
              {busy ? 'Checking…' : 'Connect'}
            </Button>
          </div>
          <label htmlFor={ids.remember} className="flex items-center gap-2 text-xs text-slate-400 md:col-span-3">
            <input id={ids.remember} type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="accent-iris" />
            Remember the key on this device (stored in this browser only)
          </label>
          {error && <p role="alert" className="text-sm text-rose-300 md:col-span-3">{error}</p>}
          <p id={ids.note} className={cn('flex flex-wrap items-start gap-x-3 gap-y-1 text-xs text-slate-500 md:col-span-3')}>
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-mint" aria-hidden />
              Your key and the data a demo puts in the prompt go only to api.groq.com. There is no server behind this site.
            </span>
            <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-iris-soft hover:text-white">
              Get a free key <ExternalLink size={12} aria-hidden />
            </a>
          </p>
        </form>
      )}
    </div>
  )
}
