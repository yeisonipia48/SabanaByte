import DashboardLayout from '../../layouts/DashboardLayout'
import type { AuthUser } from '../auth/types'
import { UsersRound, ShieldCheck, BarChart3, Settings } from 'lucide-react'

interface DashboardAdministradorProps {
  user: AuthUser
  onLogout: () => void
}

const navItems = [
  { label: 'Inicio', active: true },
  { label: 'Gestión de usuarios' },
  { label: 'Gestión de afiliados' },
  { label: 'Módulos' },
  { label: 'Reportes' },
  { label: 'Configuración del sistema' },
]

function DashboardAdministrador({ user, onLogout }: DashboardAdministradorProps) {
  return (
    <DashboardLayout
      user={user}
      onLogout={onLogout}
      title="Módulo Administrador"
      subtitle="Administración, usuarios, reportes y configuración"
      navItems={navItems}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border border-slate-200 bg-white p-4">
          <UsersRound className="h-5 w-5 text-sky-700" aria-hidden="true" />
          <p className="mt-2 text-sm font-semibold text-slate-900">
            Gestión de usuarios
          </p>
          <p className="mt-1 text-xs text-slate-500">Roles y permisos</p>
        </div>
        <div className="border border-slate-200 bg-white p-4">
          <ShieldCheck className="h-5 w-5 text-sky-700" aria-hidden="true" />
          <p className="mt-2 text-sm font-semibold text-slate-900">
            Gestión de afiliados
          </p>
          <p className="mt-1 text-xs text-slate-500">Afiliaciones y estados</p>
        </div>
        <div className="border border-slate-200 bg-white p-4">
          <BarChart3 className="h-5 w-5 text-sky-700" aria-hidden="true" />
          <p className="mt-2 text-sm font-semibold text-slate-900">Reportes</p>
          <p className="mt-1 text-xs text-slate-500">Indicadores y trazabilidad</p>
        </div>
        <div className="border border-slate-200 bg-white p-4">
          <Settings className="h-5 w-5 text-sky-700" aria-hidden="true" />
          <p className="mt-2 text-sm font-semibold text-slate-900">
            Configuración del sistema
          </p>
          <p className="mt-1 text-xs text-slate-500">Parámetros generales</p>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default DashboardAdministrador
