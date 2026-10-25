import DashboardLayout from '../../layouts/DashboardLayout'
import type { AuthUser } from '../auth/types'
import { Calendar, FileText, ClipboardList, User } from 'lucide-react'

interface DashboardPacienteProps {
  user: AuthUser
  onLogout: () => void
}

const navItems = [
  { label: 'Inicio', active: true },
  { label: 'Mis citas médicas' },
  { label: 'Historial clínico' },
  { label: 'Resultados de exámenes' },
  { label: 'Autorizaciones' },
  { label: 'Perfil' },
]

function DashboardPaciente({ user, onLogout }: DashboardPacienteProps) {
  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      title="Módulo Paciente"
      subtitle="Gestiona tus citas, resultados y autorizaciones"
      navItems={navItems}
    >
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="border border-slate-200 bg-white p-3 sm:p-4">
          <Calendar className="h-5 w-5 text-sky-700" aria-hidden="true" />
          <p className="mt-2 text-xs font-semibold text-slate-900 sm:text-sm">
            Mis citas médicas
          </p>
          <p className="mt-1 hidden text-xs text-slate-500 sm:block">Consulta y agenda</p>
        </div>
        <div className="border border-slate-200 bg-white p-3 sm:p-4">
          <FileText className="h-5 w-5 text-sky-700" aria-hidden="true" />
          <p className="mt-2 text-xs font-semibold text-slate-900 sm:text-sm">
            Historial clínico
          </p>
          <p className="mt-1 hidden text-xs text-slate-500 sm:block">Atenciones previas</p>
        </div>
        <div className="border border-slate-200 bg-white p-3 sm:p-4">
          <ClipboardList className="h-5 w-5 text-sky-700" aria-hidden="true" />
          <p className="mt-2 text-xs font-semibold text-slate-900 sm:text-sm">
            Resultados de exámenes
          </p>
          <p className="mt-1 hidden text-xs text-slate-500 sm:block">Descarga y consulta</p>
        </div>
        <div className="border border-slate-200 bg-white p-3 sm:p-4">
          <User className="h-5 w-5 text-sky-700" aria-hidden="true" />
          <p className="mt-2 text-xs font-semibold text-slate-900 sm:text-sm">Perfil</p>
          <p className="mt-1 hidden text-xs text-slate-500 sm:block">Datos personales</p>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default DashboardPaciente
