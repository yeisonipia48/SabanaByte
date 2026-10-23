import { Lock, ShieldCheck } from 'lucide-react'
import BrandLogo from './BrandLogo'

function MobileBrandBanner() {
  return (
    <section
      className="relative overflow-hidden bg-sky-950 text-white lg:hidden"
      data-purpose="mobile-brand-banner"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,116,144,0.55),transparent_60%)]"
      />

      <div className="relative px-5 pb-6 pt-6 sm:px-8">
        <div className="flex items-center justify-between gap-3">
          <BrandLogo tone="light" />
          <span className="shrink-0 border border-emerald-300/40 bg-emerald-400/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-200">
            Portal seguro
          </span>
        </div>

        <h1 className="mt-6 max-w-sm text-xl font-extrabold leading-snug tracking-tight sm:text-2xl">
          Tu salud y la de tu familia en las mejores manos
        </h1>
        <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-300">
          Citas, autorizaciones y resultados en un solo lugar.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/15 pt-4 text-[9px] font-semibold uppercase tracking-wider text-slate-300">
          <span className="flex items-center gap-1.5">
            <ShieldCheck
              className="h-3.5 w-3.5 text-cyan-300"
              aria-hidden="true"
            />
            Vigilado Supersalud
          </span>
          <span className="flex items-center gap-1.5">
            <Lock
              className="h-3.5 w-3.5 text-emerald-300"
              aria-hidden="true"
            />
            Conexión SSL
          </span>
        </div>
      </div>
    </section>
  )
}

export default MobileBrandBanner
