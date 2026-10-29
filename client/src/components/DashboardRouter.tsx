import type { AuthUser } from '../features/auth/types'
import DashboardPaciente from '../features/paciente/DashboardPaciente'
import DashboardMedico from '../features/medico/DashboardMedico'
import DashboardAdministrador from '../features/administrador/DashboardAdministrador'

interface DashboardRouterProps {
  user: AuthUser
  onLogout: () => void
  onUserUpdate: (user: AuthUser) => void
}

function DashboardRouter({ user, onLogout, onUserUpdate }: DashboardRouterProps) {
  if (user.role === 'Medico') {
    return <DashboardMedico user={user} onLogout={onLogout} onUserUpdate={onUserUpdate} />
  }

  if (user.role === 'Administrador') {
    return <DashboardAdministrador user={user} onLogout={onLogout} onUserUpdate={onUserUpdate} />
  }

  return <DashboardPaciente user={user} onLogout={onLogout} onUserUpdate={onUserUpdate} />
}

export default DashboardRouter
