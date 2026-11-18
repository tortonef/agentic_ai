/** Fixed, low-contrast ambient light + grid. Pure CSS so it costs nothing at runtime. */
export function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgb(76_29_149/0.28),transparent_70%)]" />
      <div className="animate-drift absolute -left-40 top-1/4 h-[36rem] w-[36rem] rounded-full bg-iris/[0.07] blur-[120px]" />
      <div
        className="animate-drift absolute -right-40 top-2/3 h-[32rem] w-[32rem] rounded-full bg-volt/[0.07] blur-[120px]"
        style={{ animationDelay: '-9s' }}
      />
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(rgb(255 255 255 / 0.025) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.025) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 30%, black, transparent)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 30%, black, transparent)',
        }}
      />
    </div>
  )
}
