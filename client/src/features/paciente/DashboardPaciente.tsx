import { useState } from 'react'
import { Calendar, CalendarClock, Home, ListOrdered } from 'lucide-react'
import type { AuthUser } from '../auth/types'
import PacienteLayout, { type PacienteModuleKey } from '../../layouts/PacienteLayout'
import PacienteCitasModule from './modules/PacienteCitasModule'
import PacienteAgendaModule from './modules/PacienteAgendaModule'
import PacienteListaEsperaModule from './modules/PacienteListaEsperaModule'

interface DashboardPacienteProps {
  user: AuthUser
  onLogout: () => void
}

const navItems = [
  { key: 'inicio' as const, label: 'Inicio', icon: <Home className="h-4 w-4" /> },
  { key: 'citas' as const, label: 'Citas', icon: <Calendar className="h-4 w-4" /> },
  { key: 'agenda' as const, label: 'Agenda', icon: <CalendarClock className="h-4 w-4" /> },
  { key: 'lista-espera' as const, label: 'Lista de Espera', icon: <ListOrdered className="h-4 w-4" /> },
]

function DashboardPaciente({ user, onLogout }: DashboardPacienteProps) {
  const [activeModule, setActiveModule] = useState<PacienteModuleKey>('inicio')

  const renderModule = () => {
    switch (activeModule) {
      case 'citas':
        return <PacienteCitasModule />
      case 'agenda':
        return <PacienteAgendaModule />
      case 'lista-espera':
        return <PacienteListaEsperaModule />
      case 'inicio':
      default:
        return (
          <div className="space-y-4">
            <div className="border border-slate-200 bg-white px-4 py-4 sm:px-6 sm:py-5">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                Módulo Paciente
              </h1>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                Gestiona tus citas, agenda y lista de espera
              </p>
              <div className="mt-3 border-l-4 border-sky-700 bg-sky-50 px-3 py-2.5 text-xs text-sky-900 sm:mt-4 sm:px-4 sm:py-3 sm:text-sm">
                Bienvenido(a) <strong>{user.fullName}</strong>, has ingresado como{' '}
                <strong>{user.role}</strong>.
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {navItems
                .filter((item) => item.key !== 'inicio')
                .map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActiveModule(item.key)}
                    className="flex flex-col items-start gap-2 border border-slate-200 bg-white p-3 text-left transition-colors hover:bg-slate-50"
                  >
                    <span className="flex h-9 w-9 items-center justify-center border border-slate-200 text-sky-700">
                      {item.icon}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                      <p className="text-xs text-slate-500">Administrar</p>
                    </div>
                  </button>
                ))}
            </div>
          </div>
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
      {renderModule()}
    </PacienteLayout>
  )
}

export default DashboardPaciente
