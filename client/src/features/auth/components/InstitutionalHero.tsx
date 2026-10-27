import { ShieldCheck } from 'lucide-react'
import epsHero from '../../../assets/eps-hero.jpg'
import BrandLogo from './BrandLogo'

function InstitutionalHero({ className }: { className?: string }) {
  return (
    <section
      className={`relative hidden overflow-hidden bg-sky-950 text-white lg:flex lg:flex-col lg:justify-between lg:p-8 xl:p-10 ${className}`}
      data-purpose="institutional-hero"
    >
      <img
        alt="Atención médica profesional y humana"
        className="absolute inset-0 z-0 h-full w-full object-cover object-center"
        src={epsHero}
      />
      <div className="absolute inset-0 z-10 custom-gradient-overlay" />
      <div className="relative z-20">
        <BrandLogo tone="light" />

        <h1 className="mt-6 max-w-md text-3xl font-extrabold leading-[1.08] tracking-tight text-white xl:mt-7 xl:text-[2.75rem]">
          Tu salud y la de tu familia en las mejores manos
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-200/90 xl:mt-5 xl:text-base">
          Gestiona citas médicas prioritarias, autorizaciones, fórmulas y
          consulta de exámenes diagnósticos sin filas ni traslados.
        </p>
      </div>

      <div className="relative z-20 mt-10 xl:mt-12">
        <div className="mt-5 flex flex-wrap items-start gap-x-5 gap-y-2 border-t border-white/15 pt-4 text-[9px] font-medium uppercase tracking-wider text-slate-300 xl:text-[10px]">
          <span className="flex items-start gap-1.5">
            <ShieldCheck
              className="mt-px h-3.5 w-3.5 shrink-0 text-cyan-300"
              aria-hidden="true"
            />
            Vigilado Superintendencia Nacional de Salud
          </span>
         
        </div>
      </div>
    </section>
  )
}

export default InstitutionalHero
