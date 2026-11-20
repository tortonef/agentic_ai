import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, ExternalLink } from 'lucide-react'
import { projects, type Project } from '../config/projects'
import { LinkButton, Reveal, Section } from '../components/ui'
import { GitHubIcon } from '../components/BrandIcons'
import { cn } from '../lib/cn'

export function Projects() {
  return (
    <Section
      id="projects"
      eyebrow="02 — Projects"
      title="Selected work"
      description="Each project is framed the way I approach real engagements: the problem first, then the solution and the architectural decisions behind it."
    >
      <div className="grid gap-5 md:grid-cols-2">
        {projects.map((p, i) => (
          <Reveal key={i} delay={i * 0.06} className="h-full">
            <ProjectCard project={p} index={i} />
          </Reveal>
        ))}
      </div>
    </Section>
  )
}

function ProjectCard({ project: p, index }: { project: Project; index: number }) {
  const [open, setOpen] = useState(false)
  const detailsId = `project-${index}-details`
  return (
    <article
      className={cn(
        'surface group relative flex h-full flex-col p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/15 hover:shadow-[0_24px_60px_-30px_rgb(139_92_246/0.5)]',
        p.placeholder && 'border-dashed',
      )}
    >
      <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-iris/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="mb-4 flex items-center justify-between">
        <span className="font-mono text-xs text-slate-500">{String(index + 1).padStart(2, '0')}</span>
        {p.placeholder && <span className="chip border-amber/25 text-amber/90">Placeholder</span>}
      </div>
      <h3 className="text-xl font-semibold leading-snug">{p.title}</h3>

      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-iris-soft">Problem</dt>
          <dd className="mt-1 leading-relaxed text-slate-400">{p.problem}</dd>
        </div>
        <div>
          <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-volt-soft">Solution</dt>
          <dd className="mt-1 leading-relaxed text-slate-400">{p.solution}</dd>
        </div>
      </dl>

      <ul className="mt-5 flex flex-wrap gap-1.5" aria-label="Technologies">
        {p.technologies.map((t) => (
          <li key={t} className="chip">{t}</li>
        ))}
      </ul>

      <button
        type="button"
        aria-expanded={open}
        aria-controls={detailsId}
        onClick={() => setOpen((o) => !o)}
        className="mt-5 flex items-center gap-1.5 self-start rounded-md text-sm text-slate-300 transition-colors hover:text-white"
      >
        Key architectural decisions
        <ChevronDown size={15} className={cn('transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul
            id={detailsId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {p.decisions.map((d) => (
              <li key={d} className="mt-2.5 flex gap-2 text-sm leading-relaxed text-slate-400">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-iris-soft" />
                {d}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>

      <div className="mt-auto flex flex-wrap gap-2 pt-6">
        {p.repo ? (
          <LinkButton href={p.repo} className="px-3 py-2" aria-label={`${p.title} repository on GitHub (opens in a new tab)`}>
            <GitHubIcon size={15} /> Repository
          </LinkButton>
        ) : (
          <span className="text-xs text-slate-600">Repository link to be added</span>
        )}
        {p.demo && (
          <LinkButton href={p.demo} variant="subtle" className="px-3 py-2" aria-label={`${p.title} ${(p.demoLabel ?? 'Live demo').toLowerCase()} (opens in a new tab)`}>
            <ExternalLink size={15} aria-hidden /> {p.demoLabel ?? 'Live demo'}
          </LinkButton>
        )}
      </div>
    </article>
  )
}
