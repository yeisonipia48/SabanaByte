import {
  BookOpen,
  Bot,
  FileCheck2,
  Headphones,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react'

interface HelpItem {
  label: string
  icon: LucideIcon
  wrapper: string
  iconBox: string
  text: string
}

const HELP_ITEMS: ReadonlyArray<HelpItem> = [
  {
    label: 'Guía de Ingreso',
    icon: BookOpen,
    wrapper: 'hover:border-sky-200 hover:bg-sky-50/50',
    iconBox: 'bg-sky-100 text-sky-700',
    text: 'group-hover:text-sky-900',
  },
  {
    label: 'SaludBot 24h',
    icon: Bot,
    wrapper: 'hover:border-emerald-200 hover:bg-emerald-50/50',
    iconBox: 'bg-emerald-100 text-emerald-700',
    text: 'group-hover:text-emerald-900',
  },
  {
    label: 'Preguntas Frecuentes',
    icon: HelpCircle,
    wrapper: 'hover:border-purple-200 hover:bg-purple-50/50',
    iconBox: 'bg-purple-100 text-purple-700',
    text: 'group-hover:text-purple-900',
  },
  {
    label: 'Validar Certificado',
    icon: FileCheck2,
    wrapper: 'hover:border-cyan-200 hover:bg-cyan-50/50',
    iconBox: 'bg-cyan-100 text-cyan-700',
    text: 'group-hover:text-cyan-900',
  },
]

function QuickHelp() {
  return (
    <footer
      className="mt-6 pt-5 border-t border-slate-100"
      data-purpose="quick-help-section"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
          Centro de Asistencia Rápida
        </span>
        <Headphones
          className="w-3.5 h-3.5 text-slate-400"
          aria-hidden="true"
        />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {HELP_ITEMS.map(({ label, icon: Icon, wrapper, iconBox, text }) => (
          <a
            key={label}
            href="#"
            className={`group p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 transition-all flex flex-col items-center text-center ${wrapper}`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center mb-1 group-hover:scale-105 transition-transform ${iconBox}`}
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
            </div>
            <span
              className={`text-[11px] font-semibold leading-tight text-slate-700 transition-colors ${text}`}
            >
              {label}
            </span>
          </a>
        ))}
      </div>
    </footer>
  )
}

export default QuickHelp
