import { lazy, Suspense } from 'react'
import type { AuthUser } from '../features/auth/types'
import ModuleFallback from './ModuleFallback'

const DashboardPaciente = lazy(() => import('../features/paciente/DashboardPaciente'))
const DashboardMedico = lazy(() => import('../features/medico/DashboardMedico'))
const DashboardAdministrador = lazy(() => import('../features/administrador/DashboardAdministrador'))

interface DashboardRouterProps {
  user: AuthUser
  onLogout: () => void
  onUserUpdate: (user: AuthUser) => void
}

function DashboardRouter({ user, onLogout, onUserUpdate }: DashboardRouterProps) {
  const fallback = (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-4xl">
        <ModuleFallback label="Cargando panel…" />
      </div>
    </div>
  )

  if (user.role === 'Medico') {
    return (
      <Suspense fallback={fallback}>
        <DashboardMedico user={user} onLogout={onLogout} onUserUpdate={onUserUpdate} />
      </Suspense>
    )
  }

  if (user.role === 'Administrador') {
    return (
      <Suspense fallback={fallback}>
        <DashboardAdministrador user={user} onLogout={onLogout} onUserUpdate={onUserUpdate} />
      </Suspense>
    )
  }

  return (
    <Suspense fallback={fallback}>
      <DashboardPaciente user={user} onLogout={onLogout} onUserUpdate={onUserUpdate} />
    </Suspense>
  )
}

export default DashboardRouter
