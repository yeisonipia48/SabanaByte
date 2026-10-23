import { Lock, Shield, ShieldCheck } from 'lucide-react'
import epsHero from '../../../assets/eps-hero.jpg'

function InstitutionalHero() {
  return (
    <section
      className="relative hidden overflow-hidden bg-sky-950 text-white lg:col-span-5 lg:flex lg:flex-col lg:justify-between lg:p-10 xl:p-12"
      data-purpose="institutional-hero"
    >
      <img
        alt="Atención médica profesional y humana"
        className="absolute inset-0 z-0 h-full w-full object-cover object-center"
        src={epsHero}
      />
      <div className="absolute inset-0 z-10 custom-gradient-overlay" />

      <div className="relative z-20">
        <span className="inline-flex items-center gap-2 border border-white/25 bg-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
          <Shield className="h-3.5 w-3.5 text-cyan-300" aria-hidden="true" />
          Red Integral de Salud Colombia
        </span>

        <h1 className="mt-7 max-w-md text-4xl font-extrabold leading-[1.08] tracking-tight text-white xl:text-[2.75rem]">
          Tu salud y la de tu familia en las mejores manos
        </h1>
        <p className="mt-5 max-w-md text-sm leading-relaxed text-slate-200/90 xl:text-base">
          Gestiona citas médicas prioritarias, autorizaciones, fórmulas y
          consulta de exámenes diagnósticos sin filas ni traslados.
        </p>
      </div>

      <div className="relative z-20 mt-12">

        <div className="mt-5 flex flex-wrap items-start gap-x-5 gap-y-2 border-t border-white/15 pt-4 text-[10px] font-medium uppercase tracking-wider text-slate-300">
          <span className="flex items-start gap-1.5">
            <ShieldCheck
              className="mt-px h-3.5 w-3.5 shrink-0 text-cyan-300"
              aria-hidden="true"
            />
            Vigilado Superintendencia Nacional de Salud
          </span>
          <span className="flex items-center gap-1.5">
            <Lock
              className="h-3.5 w-3.5 shrink-0 text-emerald-300"
              aria-hidden="true"
            />
            Conexión Cifrada SSL
          </span>
        </div>
      </div>
    </section>
  )
}

export default InstitutionalHero
