import DashboardLayout from '../../layouts/DashboardLayout'
import type { AuthUser } from '../auth/types'
import { CalendarClock, Users, FileText, ClipboardList } from 'lucide-react'

interface DashboardMedicoProps {
  user: AuthUser
  onLogout: () => void
}

const navItems = [
  { label: 'Inicio', active: true },
  { label: 'Mi agenda' },
  { label: 'Pacientes asignados' },
  { label: 'Historia clínica' },
  { label: 'Órdenes médicas' },
  { label: 'Notificaciones' },
]

function DashboardMedico({ user, onLogout }: DashboardMedicoProps) {
  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      title="Módulo Médico"
      subtitle="Agenda, atención y seguimiento de pacientes"
      navItems={navItems}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border border-slate-200 bg-white p-4">
          <CalendarClock className="h-5 w-5 text-sky-700" aria-hidden="true" />
          <p className="mt-2 text-sm font-semibold text-slate-900">Mi agenda</p>
          <p className="mt-1 text-xs text-slate-500">Citas del día</p>
        </div>
        <div className="border border-slate-200 bg-white p-4">
          <Users className="h-5 w-5 text-sky-700" aria-hidden="true" />
          <p className="mt-2 text-sm font-semibold text-slate-900">
            Pacientes asignados
          </p>
          <p className="mt-1 text-xs text-slate-500">Listado y seguimiento</p>
        </div>
        <div className="border border-slate-200 bg-white p-4">
          <FileText className="h-5 w-5 text-sky-700" aria-hidden="true" />
          <p className="mt-2 text-sm font-semibold text-slate-900">
            Historia clínica
          </p>
          <p className="mt-1 text-xs text-slate-500">Evoluciones y diagnósticos</p>
        </div>
        <div className="border border-slate-200 bg-white p-4">
          <ClipboardList className="h-5 w-5 text-sky-700" aria-hidden="true" />
          <p className="mt-2 text-sm font-semibold text-slate-900">
            Órdenes médicas
          </p>
          <p className="mt-1 text-xs text-slate-500">Prescripciones y exámenes</p>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default DashboardMedico
