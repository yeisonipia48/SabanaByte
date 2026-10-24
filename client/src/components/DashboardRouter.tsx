import type { AuthUser } from '../features/auth/types'
import DashboardPaciente from '../features/paciente/DashboardPaciente'
import DashboardMedico from '../features/medico/DashboardMedico'
import DashboardAdministrador from '../features/administrador/DashboardAdministrador'

interface DashboardRouterProps {
  user: AuthUser
  onLogout: () => void
}

function DashboardRouter({ user, onLogout }: DashboardRouterProps) {
  if (user.role === 'Medico') {
    return <DashboardMedico user={user} onLogout={onLogout} />
  }

  if (user.role === 'Administrador') {
    return <DashboardAdministrador user={user} onLogout={onLogout} />
  }

  return <DashboardPaciente user={user} onLogout={onLogout} />
}

export default DashboardRouter
