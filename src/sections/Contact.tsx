import { useState } from 'react'
import { ArrowUpRight, Check, Copy, Download, Mail } from 'lucide-react'
import { profile } from '../config/profile'
import { Reveal, Section } from '../components/ui'
import { GitHubIcon, LinkedInIcon } from '../components/BrandIcons'

const handle = (url: string) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')

export function Contact() {
  const { links } = profile
  const [copied, setCopied] = useState(false)

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(links.email)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      window.location.href = `mailto:${links.email}`
    }
  }

  const cards = [
    { label: 'GitHub', value: handle(links.github), href: links.github, icon: <GitHubIcon size={20} />, external: true },
    { label: 'LinkedIn', value: handle(links.linkedin), href: links.linkedin, icon: <LinkedInIcon size={20} />, external: true },
    { label: 'Email', value: links.email, href: `mailto:${links.email}`, icon: <Mail size={20} aria-hidden />, external: false },
    // import.meta.env.BASE_URL keeps the path correct under /<repo>/ on GitHub Pages.
    { label: 'Curriculum Vitae', value: 'Download PDF', href: `${import.meta.env.BASE_URL}${links.cv}`, icon: <Download size={20} aria-hidden />, external: false, download: true },
  ]

  return (
    <Section
      id="contact"
      eyebrow="05 — Contact"
      title={<>Let's build something <span className="text-gradient">intelligent.</span></>}
      description="Open to conversations about GenAI strategy, agentic systems and turning AI prototypes into production value."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c, i) => (
          <Reveal key={c.label} delay={i * 0.05}>
            <div className="surface group relative flex items-center gap-4 p-5 transition-all duration-300 hover:border-iris/30 hover:bg-iris/[0.03]">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-300 transition-colors group-hover:text-white">
                {c.icon}
              </span>
              <a
                href={c.href}
                {...(c.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                {...(c.download ? { download: `${profile.name.replace(/\s+/g, '-')}-CV.pdf` } : {})}
                className="min-w-0 flex-1 after:absolute after:inset-0 after:rounded-2xl"
              >
                <span className="block text-sm text-slate-500">{c.label}</span>
                <span className="block truncate font-medium text-slate-100">{c.value}</span>
              </a>
              {c.label === 'Email' ? (
                <button
                  type="button"
                  onClick={copyEmail}
                  className="relative z-10 grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
                  aria-label={copied ? 'Email copied' : 'Copy email address'}
                >
                  {copied ? <Check size={16} className="text-mint" /> : <Copy size={16} />}
                </button>
              ) : (
                <ArrowUpRight size={18} className="text-slate-600 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-slate-300" aria-hidden />
              )}
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  )
}
