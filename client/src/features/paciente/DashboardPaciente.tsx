import { lazy, Suspense, useState } from 'react'
import { Calendar, CalendarClock, Home, ListOrdered } from 'lucide-react'
import type { AuthUser } from '../auth/types'
import PacienteLayout, { type PacienteModuleKey } from '../../layouts/PacienteLayout'
import ModuleFallback from '../../components/ModuleFallback'
import PacienteInicioModule from './modules/PacienteInicioModule'

const PacienteCitasModule = lazy(() => import('./modules/PacienteCitasModule'))
const PacienteAgendaModule = lazy(() => import('./modules/PacienteAgendaModule'))
const PacienteListaEsperaModule = lazy(() => import('./modules/PacienteListaEsperaModule'))
const PerfilModule = lazy(() => import('../perfil/PerfilModule'))

interface DashboardPacienteProps {
  user: AuthUser
  onLogout: () => void
  onUserUpdate: (user: AuthUser) => void
}

const navItems = [
  { key: 'inicio' as const, label: 'Inicio', icon: <Home className="h-4 w-4" /> },
  { key: 'agenda' as const, label: 'Agendar cita', icon: <CalendarClock className="h-4 w-4" /> },
  { key: 'citas' as const, label: 'Mis citas', icon: <Calendar className="h-4 w-4" /> },
  { key: 'lista-espera' as const, label: 'Lista de espera', icon: <ListOrdered className="h-4 w-4" /> },
]

function DashboardPaciente({ user, onLogout, onUserUpdate }: DashboardPacienteProps) {
  const [activeModule, setActiveModule] = useState<PacienteModuleKey>('inicio')

  const renderModule = () => {
    switch (activeModule) {
      case 'citas':
        return (
          <PacienteCitasModule
            user={user}
            onGoToAgenda={() => setActiveModule('agenda')}
          />
        )
      case 'agenda':
        return <PacienteAgendaModule user={user} />
      case 'lista-espera':
        return <PacienteListaEsperaModule user={user} />
      case 'perfil':
        return <PerfilModule user={user} onUserUpdate={onUserUpdate} />
      case 'inicio':
      default:
        return (
          <PacienteInicioModule
            user={user}
            onNavigate={(module) => setActiveModule(module)}
          />
        )
    }
  }

  return (
    <PacienteLayout
      user={user}
      onLogout={onLogout}
      activeModule={activeModule}
      onModuleChange={setActiveModule}
      navItems={navItems}
    >
      <Suspense fallback={<ModuleFallback label="Cargando módulo…" />}>
        {renderModule()}
      </Suspense>
    </PacienteLayout>
  )
}

export default DashboardPaciente
