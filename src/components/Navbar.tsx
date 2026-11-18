import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { navigation, profile } from '../config/profile'
import { GitHubIcon } from './BrandIcons'
import { cn } from '../lib/cn'

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<string>('')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Highlight the section currently in the middle of the viewport.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-45% 0px -50% 0px' },
    )
    ;['top', ...navigation.map((n) => n.id)].forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled || open ? 'glass border-x-0 border-t-0' : 'border-b border-transparent',
        open && 'bg-ink-900/97',
      )}
    >
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <a href="#top" className="group flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-iris to-volt font-display text-xs font-bold text-white shadow-[0_0_20px_-4px_rgb(139_92_246/0.7)]">
            {profile.initials}
          </span>
          <span className="font-display text-sm font-semibold text-slate-100">
            {profile.name}
            <span className="ml-2 hidden font-mono text-[10px] font-normal uppercase tracking-[0.2em] text-slate-500 sm:inline">GenAI Lab</span>
          </span>
        </a>

        <ul className="hidden items-center gap-1 md:flex">
          {navigation.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={active === item.id ? 'true' : undefined}
                className={cn(
                  'relative rounded-lg px-3 py-2 text-sm transition-colors',
                  active === item.id ? 'text-white' : 'text-slate-400 hover:text-slate-100',
                )}
              >
                {active === item.id && (
                  <motion.span layoutId="nav-pill" className="absolute inset-0 -z-10 rounded-lg bg-white/[0.06]" transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }} />
                )}
                {item.label}
              </a>
            </li>
          ))}
          <li className="ml-2">
            <a
              href={profile.links.github}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub profile (opens in a new tab)"
              className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
            >
              <GitHubIcon />
            </a>
          </li>
        </ul>

        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-lg text-slate-300 hover:bg-white/5 md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.ul
            id="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-5 md:hidden"
          >
            {navigation.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  onClick={() => setOpen(false)}
                  className="block border-t border-white/5 py-3.5 text-base text-slate-200"
                >
                  {item.label}
                </a>
              </li>
            ))}
            <li>
              <a
                href={profile.links.github}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 border-t border-white/5 py-3.5 pb-5 text-base text-slate-200"
              >
                <GitHubIcon size={16} /> GitHub
              </a>
            </li>
          </motion.ul>
        )}
      </AnimatePresence>
    </header>
  )
}
