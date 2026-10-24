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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border border-slate-200 bg-white p-4">
          <Calendar className="h-5 w-5 text-sky-700" aria-hidden="true" />
          <p className="mt-2 text-sm font-semibold text-slate-900">
            Mis citas médicas
          </p>
          <p className="mt-1 text-xs text-slate-500">Consulta y agenda</p>
        </div>
        <div className="border border-slate-200 bg-white p-4">
          <FileText className="h-5 w-5 text-sky-700" aria-hidden="true" />
          <p className="mt-2 text-sm font-semibold text-slate-900">
            Historial clínico
          </p>
          <p className="mt-1 text-xs text-slate-500">Atenciones previas</p>
        </div>
        <div className="border border-slate-200 bg-white p-4">
          <ClipboardList className="h-5 w-5 text-sky-700" aria-hidden="true" />
          <p className="mt-2 text-sm font-semibold text-slate-900">
            Resultados de exámenes
          </p>
          <p className="mt-1 text-xs text-slate-500">Descarga y consulta</p>
        </div>
        <div className="border border-slate-200 bg-white p-4">
          <User className="h-5 w-5 text-sky-700" aria-hidden="true" />
          <p className="mt-2 text-sm font-semibold text-slate-900">Perfil</p>
          <p className="mt-1 text-xs text-slate-500">Datos personales</p>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default DashboardPaciente
