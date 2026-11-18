import { skills } from '../config/skills'
import { Reveal, Section } from '../components/ui'

export function Skills() {
  return (
    <Section
      id="skills"
      eyebrow="04 — Skills & Technologies"
      title="The toolkit"
      description="The capabilities behind the lab, from model-level techniques to the enterprise context they operate in."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {skills.map((s, i) => {
          const Icon = s.icon
          return (
            <Reveal key={s.title} delay={(i % 4) * 0.05} className="h-full">
              <div
                className="surface group relative h-full overflow-hidden p-5 transition-all duration-300 hover:border-white/15"
                onPointerMove={(e) => {
                  const r = e.currentTarget.getBoundingClientRect()
                  e.currentTarget.style.setProperty('--x', `${e.clientX - r.left}px`)
                  e.currentTarget.style.setProperty('--y', `${e.clientY - r.top}px`)
                }}
              >
                {/* Cursor-following spotlight */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{ background: 'radial-gradient(240px circle at var(--x) var(--y), rgb(139 92 246 / 0.12), transparent 70%)' }}
                />
                <span className="relative grid h-10 w-10 place-items-center rounded-xl border border-white/[0.08] bg-gradient-to-br from-iris/20 to-volt/10 text-iris-soft transition-colors group-hover:text-white">
                  <Icon size={19} aria-hidden />
                </span>
                <h3 className="relative mt-4 text-[17px] font-semibold">{s.title}</h3>
                <p className="relative mt-2 text-sm leading-relaxed text-slate-400">{s.summary}</p>
                <ul className="relative mt-4 flex flex-wrap gap-1.5">
                  {s.tools.map((t) => (
                    <li key={t} className="rounded-md bg-white/[0.04] px-2 py-0.5 font-mono text-[10.5px] text-slate-400">{t}</li>
                  ))}
                </ul>
              </div>
            </Reveal>
          )
        })}
      </div>
    </Section>
  )
}
