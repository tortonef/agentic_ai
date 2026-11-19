import { useState } from 'react'
import { BookOpen, Workflow } from 'lucide-react'
import { MyDocs } from './MyDocs'
import { RagExplorer } from './Explorer'
import { cn } from '../../lib/cn'

export default function RagLab() {
  const [mode, setMode] = useState<'docs' | 'explore'>('docs')
  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1" role="group" aria-label="RAG mode">
        {([
          ['docs', 'Ask your documents', BookOpen],
          ['explore', 'How RAG works, step by step', Workflow],
        ] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            aria-pressed={mode === id}
            onClick={() => setMode(id)}
            className={cn('flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-2 py-2 sm:px-3 text-xs font-medium transition-colors sm:text-sm', mode === id ? 'bg-iris/15 text-white' : 'text-slate-400 hover:text-slate-200')}
          >
            <Icon size={15} aria-hidden /> <span className="truncate">{label}</span>
          </button>
        ))}
      </div>
      {mode === 'docs' ? <MyDocs /> : <RagExplorer />}
    </div>
  )
}
