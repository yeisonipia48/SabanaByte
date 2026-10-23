import { Lock, PhoneCall, Shield, ShieldCheck } from 'lucide-react'
import epsHero from '../../../assets/eps-hero.jpg'

function InstitutionalHero() {
  return (
    <section
      className="relative hidden lg:flex lg:col-span-5 flex-col justify-between p-8 text-white overflow-hidden"
      data-purpose="institutional-hero"
    >
      <img
        alt="Atención médica profesional y humana"
        className="absolute inset-0 w-full h-full object-cover object-center z-0"
        src={epsHero}
      />
      <div className="absolute inset-0 custom-gradient-overlay z-10" />

      <div className="relative z-20 space-y-5">
        <div>
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide text-white border border-white/20 uppercase">
            <Shield className="w-3.5 h-3.5 text-cyan-300" aria-hidden="true" />
            Red Integral de Salud Colombia
          </span>
        </div>
        <h1 className="text-3xl xl:text-4xl font-extrabold leading-tight tracking-tight text-white">
          Tu salud y la de tu familia en las mejores manos
        </h1>
        <p className="text-sm xl:text-base text-slate-200/90 leading-relaxed font-normal">
          Gestiona citas médicas prioritarias, autorizaciones, fórmulas y
          consulta de exámenes diagnósticos sin filas ni traslados.
        </p>
      </div>

      <div className="relative z-20 space-y-4 pt-12">
        <div className="bg-white/95 backdrop-blur-md text-slate-800 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 shadow-lg border border-white/40">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
            <PhoneCall
              className="w-4 h-4 shrink-0 text-emerald-600"
              aria-hidden="true"
            />
            <span>
              Línea Nacional 24/7:{' '}
              <strong className="text-sky-900 font-bold tracking-tight">
                01 8000 123 456
              </strong>
            </span>
          </div>
          <span className="shrink-0 bg-rose-100 text-rose-700 font-bold text-[11px] px-2 py-0.5 rounded-md border border-rose-200/60">
            Urgencias: #123
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 text-[11px] text-slate-300 px-1 font-medium">
          <div className="flex items-center gap-1.5 hover:text-white transition-colors cursor-default">
            <ShieldCheck
              className="w-3.5 h-3.5 shrink-0 text-cyan-400"
              aria-hidden="true"
            />
            <span>Vigilado Superintendencia Nacional de Salud</span>
          </div>
          <div className="flex items-center gap-1.5 hover:text-white transition-colors cursor-default">
            <Lock
              className="w-3.5 h-3.5 shrink-0 text-emerald-400"
              aria-hidden="true"
            />
            <span>Conexión Cifrada SSL</span>
          </div>
        </div>
      </div>
    </section>
  )
}

export default InstitutionalHero
