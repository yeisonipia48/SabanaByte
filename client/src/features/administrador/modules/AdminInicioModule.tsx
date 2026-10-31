import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BookOpenText,
  Calendar,
  CalendarClock,
  ListOrdered,
  Stethoscope,
  UserCog,
  Users,
} from 'lucide-react'
import { citasService } from '../../../services/citas.service'
import { listaEsperaService } from '../../../services/listaEspera.service'
import { medicosService } from '../../../services/medicos.service'
import { pacientesService } from '../../../services/pacientes.service'
import type { CitaDetalleResponseApi } from '../../../types/api/citas'
import type { ListaEsperaDetalleResponseApi } from '../../../types/api/listaEspera'
import type { AuthUser } from '../../auth/types'
import type { AdminModuleKey } from '../types/admin'

interface AdminInicioModuleProps {
  user: AuthUser
  onNavigate: (module: AdminModuleKey) => void
}

function today(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

function AdminInicioModule({ user, onNavigate }: AdminInicioModuleProps) {
  const [pacientes, setPacientes] = useState(0)
  const [medicos, setMedicos] = useState(0)
  const [citas, setCitas] = useState<CitaDetalleResponseApi[]>([])
  const [espera, setEspera] = useState<ListaEsperaDetalleResponseApi[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [pacientesData, medicosData, citasData, esperaData] = await Promise.all([
        pacientesService.getAll(),
        medicosService.getAll(),
        citasService.getAll(),
        listaEsperaService.getAll(),
      ])
      setPacientes(pacientesData.length)
      setMedicos(medicosData.length)
      setCitas(citasData)
      setEspera(esperaData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el resumen del sistema.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const stats = useMemo(() => {
    const fecha = today()
    const citasHoy = citas.filter((cita) => cita.fecha_cupo?.slice(0, 10) === fecha)
    const pendientes = citas.filter(
      (cita) => cita.estado === 'pendiente' || cita.estado === 'confirmada',
    )
    const atendidas = citas.filter((cita) => cita.estado === 'atendida')
    const noAsistio = citas.filter((cita) => cita.estado === 'no_asistio')
    const esperaPendiente = espera.filter(
      (item) => item.estado === 'pendiente' || item.estado === 'ofrecida',
    )

    return {
      citasHoy: citasHoy.length,
      pendientes: pendientes.length,
      atendidas: atendidas.length,
      noAsistio: noAsistio.length,
      esperaPendiente: esperaPendiente.length,
    }
  }, [citas, espera])

  const modules = [
    { key: 'usuarios' as const, label: 'Usuarios', icon: UserCog },
    { key: 'pacientes' as const, label: 'Pacientes', icon: Users },
    { key: 'medicos' as const, label: 'Médicos', icon: Stethoscope },
    { key: 'especialidades' as const, label: 'Especialidades', icon: BookOpenText },
    { key: 'citas' as const, label: 'Citas', icon: Calendar },
    { key: 'agenda' as const, label: 'Agenda', icon: CalendarClock },
    { key: 'lista-espera' as const, label: 'Lista de espera', icon: ListOrdered },
  ]

  return (
    <div className="space-y-4">
      <div className="border border-slate-200 bg-white px-4 py-4 sm:px-6 sm:py-5">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Panel administrador
        </h1>
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">
          Bienvenido(a) <strong>{user.fullName}</strong>. Tienes control total sobre pacientes,
          médicos, agenda, citas y lista de espera.
        </p>
      </div>

      {loading ? (
        <div className="loading-banner animate-fade-in border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700" role="status" aria-live="polite">
          Cargando resumen…
        </div>
      ) : null}
      {error ? (
        <div className="animate-fade-up border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700" role="alert">{error}</div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 7 }).map((_, index) => (
              <div
                key={index}
                className="h-[74px] animate-pulse border border-slate-200 bg-white motion-reduce:animate-none"
              />
            ))
          : [
              { label: 'Pacientes', value: pacientes, icon: Users },
              { label: 'Médicos', value: medicos, icon: Stethoscope },
              { label: 'Citas de hoy', value: stats.citasHoy, icon: Calendar },
              { label: 'En lista de espera', value: stats.esperaPendiente, icon: ListOrdered },
              { label: 'Citas pendientes', value: stats.pendientes, icon: CalendarClock },
              { label: 'Citas atendidas', value: stats.atendidas, icon: Calendar },
              { label: 'No asistió', value: stats.noAsistio, icon: Calendar },
            ].map((card) => (
              <div key={card.label} className="border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {card.label}
                  </p>
                  <card.icon className="h-4 w-4 text-sky-700" aria-hidden="true" />
                </div>
                <p className="mt-1 text-2xl font-bold text-slate-900">{card.value}</p>
              </div>
            ))}
      </div>

      <div className="border border-slate-200 bg-white px-4 py-4 sm:px-6 sm:py-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-600">
          Accesos rápidos
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((module) => (
            <button
              key={module.key}
              type="button"
              onClick={() => onNavigate(module.key)}
              className="flex items-center gap-3 border border-slate-200 px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
            >
              <span className="flex h-9 w-9 items-center justify-center border border-slate-200 text-sky-700">
                <module.icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="text-sm font-semibold text-slate-900">{module.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AdminInicioModule
