import { lazy, Suspense, useState } from 'react'
import {
  BookOpenText,
  Calendar,
  CalendarClock,
  Home,
  ListOrdered,
  Stethoscope,
  UserCog,
  Users,
} from 'lucide-react'
import type { AuthUser } from '../auth/types'
import AdminLayout from '../../layouts/AdminLayout'
import type { AdminModuleKey } from './types/admin'
import ModuleFallback from '../../components/ModuleFallback'
import AdminInicioModule from './modules/AdminInicioModule'

const UsuariosModule = lazy(() => import('./modules/UsuariosModule'))
const PacientesModule = lazy(() => import('./modules/PacientesModule'))
const MedicosModule = lazy(() => import('./modules/MedicosModule'))
const EspecialidadesModule = lazy(() => import('./modules/EspecialidadesModule'))
const CitasModule = lazy(() => import('./modules/CitasModule'))
const AgendaModule = lazy(() => import('./modules/AgendaModule'))
const ListaEsperaModule = lazy(() => import('./modules/ListaEsperaModule'))
const PerfilModule = lazy(() => import('../perfil/PerfilModule'))

interface DashboardAdministradorProps {
  user: AuthUser
  onLogout: () => void
  onUserUpdate: (user: AuthUser) => void
}

const navItems = [
  { key: 'inicio' as const, label: 'Inicio', icon: <Home className="h-4 w-4" /> },
  { key: 'usuarios' as const, label: 'Usuarios', icon: <UserCog className="h-4 w-4" /> },
  { key: 'pacientes' as const, label: 'Pacientes', icon: <Users className="h-4 w-4" /> },
  { key: 'medicos' as const, label: 'Médicos', icon: <Stethoscope className="h-4 w-4" /> },
  { key: 'especialidades' as const, label: 'Especialidades', icon: <BookOpenText className="h-4 w-4" /> },
  { key: 'citas' as const, label: 'Citas', icon: <Calendar className="h-4 w-4" /> },
  { key: 'agenda' as const, label: 'Agenda', icon: <CalendarClock className="h-4 w-4" /> },
  { key: 'lista-espera' as const, label: 'Lista de espera', icon: <ListOrdered className="h-4 w-4" /> },
]

function DashboardAdministrador({ user, onLogout, onUserUpdate }: DashboardAdministradorProps) {
  const [activeModule, setActiveModule] = useState<AdminModuleKey>('inicio')

  const renderModule = () => {
    switch (activeModule) {
      case 'usuarios':
        return <UsuariosModule />
      case 'pacientes':
        return <PacientesModule />
      case 'medicos':
        return <MedicosModule />
      case 'especialidades':
        return <EspecialidadesModule />
      case 'citas':
        return <CitasModule />
      case 'agenda':
        return <AgendaModule />
      case 'lista-espera':
        return <ListaEsperaModule />
      case 'perfil':
        return <PerfilModule user={user} onUserUpdate={onUserUpdate} />
      case 'inicio':
      default:
        return (
          <AdminInicioModule
            user={user}
            onNavigate={(module) => setActiveModule(module)}
          />
        )
    }
  }

  return (
    <AdminLayout
      user={user}
      onLogout={onLogout}
      activeModule={activeModule}
      onModuleChange={setActiveModule}
      navItems={navItems}
    >
      <Suspense fallback={<ModuleFallback label="Cargando módulo…" />}>
        {renderModule()}
      </Suspense>
    </AdminLayout>
  )
}

export default DashboardAdministrador
