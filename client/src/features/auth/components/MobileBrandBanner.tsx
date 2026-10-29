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

      <div className="relative px-4 pb-3 pt-3 sm:px-6 sm:pb-4 sm:pt-4">
        <div className="flex items-center justify-between gap-3">
          <BrandLogo tone="light" />
          <span className="shrink-0 border border-emerald-300/40 bg-emerald-400/10 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.14em] text-emerald-200 sm:text-[9px]">
            Portal seguro
          </span>
        </div>

        <h1 className="mt-2 max-w-sm text-lg font-extrabold leading-snug tracking-tight sm:mt-3 sm:text-xl lg:text-2xl">
          Tu salud y la de tu familia en las mejores manos
        </h1>
        <p className="mt-1 hidden max-w-md text-xs leading-relaxed text-slate-300 sm:mt-1.5 sm:block">
          Citas, autorizaciones y resultados en un solo lugar.
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-white/15 pt-2 text-[8px] font-semibold uppercase tracking-wider text-slate-300 sm:mt-3 sm:gap-x-4 sm:gap-y-2 sm:pt-3 sm:text-[9px]">
          <span className="flex items-center gap-1.5">
            <ShieldCheck
              className="h-3 w-3 text-cyan-300 sm:h-3.5 sm:w-3.5"
              aria-hidden="true"
            />
            Vigilado Supersalud
          </span>
          <span className="flex items-center gap-1.5">
            <Lock
              className="h-3 w-3 text-emerald-300 sm:h-3.5 sm:w-3.5"
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
