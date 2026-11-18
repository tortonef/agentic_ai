import { ArrowUp } from 'lucide-react'
import { profile } from '../config/profile'

export function Footer() {
  return (
    <footer className="relative border-t border-white/[0.06]">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-slate-500 sm:flex-row sm:px-8">
        <p>
          © {new Date().getFullYear()} {profile.name}. Demos are deterministic simulations; no data leaves your browser.
        </p>
        <a href="#top" className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-slate-400 transition-colors hover:text-white">
          Back to top <ArrowUp size={14} aria-hidden />
        </a>
      </div>
    </footer>
  )
}
