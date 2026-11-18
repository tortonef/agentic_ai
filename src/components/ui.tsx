import type { ReactNode, AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react'
import { motion } from 'framer-motion'
import { FlaskConical } from 'lucide-react'
import { cn } from '../lib/cn'

type Variant = 'primary' | 'ghost' | 'subtle'

const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-iris to-volt text-white shadow-[0_8px_30px_-8px_rgb(139_92_246/0.6)] hover:shadow-[0_10px_40px_-6px_rgb(99_102_241/0.75)] hover:brightness-110',
  ghost: 'border border-white/10 bg-white/[0.03] text-slate-200 hover:border-white/20 hover:bg-white/[0.06]',
  subtle: 'text-slate-300 hover:bg-white/5 hover:text-white',
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]'

export function Button({ variant = 'ghost', className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type="button" className={cn(base, variants[variant], className)} {...props} />
}

export function LinkButton({ variant = 'ghost', className, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant }) {
  const external = props.href?.startsWith('http')
  return (
    <a
      className={cn(base, variants[variant], className)}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      {...props}
    />
  )
}

export function Section({
  id,
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  id: string
  eyebrow: string
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn('relative mx-auto max-w-6xl px-5 py-24 sm:px-8 md:py-32', className)}>
      <Reveal className="mb-12 max-w-2xl md:mb-16">
        <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-iris-soft">{eyebrow}</p>
        <h2 id={`${id}-title`} className="text-3xl font-semibold sm:text-4xl md:text-[2.75rem] md:leading-[1.1]">
          {title}
        </h2>
        {description && <p className="mt-4 text-base leading-relaxed text-slate-400 sm:text-lg">{description}</p>}
      </Reveal>
      {children}
    </section>
  )
}

export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

/** Marks every demo output as a deterministic simulation, never real LLM inference. */
export function SimulatedBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn('chip border-amber/25 bg-amber/[0.06] text-amber/90', className)}
      title="Outputs are produced by deterministic local code. No LLM is called and no data leaves your browser."
    >
      <FlaskConical size={12} aria-hidden /> Simulated · no LLM call
    </span>
  )
}

export function Panel({ title, icon, actions, children, className }: { title: string; icon?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('surface flex min-h-0 flex-col overflow-hidden', className)}>
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-2.5">
        <h3 className="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">
          {icon}
          {title}
        </h3>
        {actions}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  )
}
