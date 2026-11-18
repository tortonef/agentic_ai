import { profile } from '../config/profile'
import { Reveal, Section } from '../components/ui'

export function About() {
  const { about } = profile
  return (
    <Section id="about" eyebrow="03 — About" title={<>At the intersection of <span className="text-gradient">AI and business.</span></>}>
      <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
        <Reveal>
          <p className="font-display text-xl leading-relaxed text-slate-200 sm:text-2xl">{about.intro}</p>
          {about.paragraphs.map((p) => (
            <p key={p} className="mt-5 leading-relaxed text-slate-400">{p}</p>
          ))}
          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-white/[0.06] pt-6">
            {about.facts.map((f) => (
              <div key={f.label}>
                <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">{f.label}</dt>
                <dd className="mt-1 text-sm text-slate-200">{f.value}</dd>
              </div>
            ))}
          </dl>
        </Reveal>

        <Reveal delay={0.1}>
          <PillarOrbit pillars={about.pillars} initials={profile.initials} />
        </Reveal>
      </div>
    </Section>
  )
}

/** Pillars arranged around a centre: the "intersection" positioning, as a diagram. */
function PillarOrbit({ pillars, initials }: { pillars: string[]; initials: string }) {
  return (
    <div className="surface relative overflow-hidden p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgb(139_92_246/0.16),transparent_60%)]" />
      <div className="relative mx-auto aspect-square max-w-[360px]">
        <div className="absolute inset-[14%] rounded-full border border-white/[0.07]" />
        <div className="absolute inset-[30%] rounded-full border border-dashed border-white/[0.08]" />
        <div className="absolute left-1/2 top-1/2 grid h-20 w-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl bg-gradient-to-br from-iris to-volt font-display text-xl font-bold text-white shadow-[0_0_60px_-10px_rgb(139_92_246/0.9)]">
          {initials}
        </div>
        <ul>
          {pillars.map((p, i) => {
            const a = (i / pillars.length) * Math.PI * 2 - Math.PI / 2
            return (
              <li
                key={p}
                className="glass absolute w-[42%] -translate-x-1/2 -translate-y-1/2 rounded-xl px-2.5 py-2 text-center text-[11px] font-medium leading-tight text-slate-200 sm:text-xs"
                style={{ left: `${50 + Math.cos(a) * 36}%`, top: `${50 + Math.sin(a) * 36}%` }}
              >
                {p}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
