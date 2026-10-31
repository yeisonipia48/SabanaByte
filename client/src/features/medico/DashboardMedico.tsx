import { lazy, Suspense, useState } from 'react'
import { Calendar, CalendarCheck, CalendarClock } from 'lucide-react'
import type { AuthUser } from '../auth/types'
import MedicoLayout, { type MedicoModuleKey } from '../../layouts/MedicoLayout'
import ModuleFallback from '../../components/ModuleFallback'
import MedicoJornadaModule from './modules/MedicoJornadaModule'

const MedicoCitasModule = lazy(() => import('./modules/MedicoCitasModule'))
const MedicoAgendaModule = lazy(() => import('./modules/MedicoAgendaModule'))
const PerfilModule = lazy(() => import('../perfil/PerfilModule'))

interface DashboardMedicoProps {
  user: AuthUser
  onLogout: () => void
  onUserUpdate: (user: AuthUser) => void
}

const navItems = [
  { key: 'jornada' as const, label: 'Mi jornada', icon: <CalendarCheck className="h-4 w-4" /> },
  { key: 'citas' as const, label: 'Mis citas', icon: <Calendar className="h-4 w-4" /> },
  { key: 'agenda' as const, label: 'Mi agenda', icon: <CalendarClock className="h-4 w-4" /> },
]

function DashboardMedico({ user, onLogout, onUserUpdate }: DashboardMedicoProps) {
  const [activeModule, setActiveModule] = useState<MedicoModuleKey>('jornada')

  const renderModule = () => {
    switch (activeModule) {
      case 'citas':
        return <MedicoCitasModule user={user} />
      case 'agenda':
        return <MedicoAgendaModule user={user} />
      case 'perfil':
        return <PerfilModule user={user} onUserUpdate={onUserUpdate} />
      case 'jornada':
      default:
        return <MedicoJornadaModule user={user} />
    }
  }

  return (
    <MedicoLayout
      user={user}
      onLogout={onLogout}
      activeModule={activeModule}
      onModuleChange={setActiveModule}
      navItems={navItems}
    >
      <Suspense fallback={<ModuleFallback label="Cargando módulo…" />}>
        {renderModule()}
      </Suspense>
    </MedicoLayout>
  )
}

export default DashboardMedico
