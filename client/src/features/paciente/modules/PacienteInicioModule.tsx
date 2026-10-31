import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarPlus, CalendarRange, ListOrdered, Sparkles } from 'lucide-react'
import { citasService } from '../../../services/citas.service'
import { listaEsperaService } from '../../../services/listaEspera.service'
import type { CitaDetalleResponseApi } from '../../../types/api/citas'
import type { ListaEsperaDetalleResponseApi } from '../../../types/api/listaEspera'
import type { AuthUser } from '../../auth/types'

type PacienteModuleTarget = 'agenda' | 'citas' | 'lista-espera'

interface PacienteInicioModuleProps {
  user: AuthUser
  onNavigate: (module: PacienteModuleTarget) => void
}

const ESTADO_LABEL: Record<string, string> = {
  pendiente: 'Programada',
  confirmada: 'Confirmada',
  atendida: 'Atendida',
  cancelada: 'Cancelada',
  no_asistio: 'No asistió',
}

function today(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

function PacienteInicioModule({ user, onNavigate }: PacienteInicioModuleProps) {
  const [citas, setCitas] = useState<CitaDetalleResponseApi[]>([])
  const [espera, setEspera] = useState<ListaEsperaDetalleResponseApi[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (user.profileId === null) {
      setError('No encontramos tu perfil de paciente. Cierra sesión e ingresa de nuevo.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const [citasData, esperaData] = await Promise.all([
        citasService.getAll({ id_paciente: user.profileId }),
        listaEsperaService.getAll(),
      ])
      setCitas(citasData)
      setEspera(esperaData.filter((item) => item.id_paciente === user.profileId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar tu resumen.')
    } finally {
      setLoading(false)
    }
  }, [user.profileId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const activas = useMemo(
    () =>
      citas
        .filter(
          (cita) =>
            cita.fecha_cupo?.slice(0, 10) >= today() &&
            cita.estado !== 'cancelada' &&
            cita.estado !== 'atendida' &&
            cita.estado !== 'no_asistio',
        )
        .sort((a, b) =>
          `${a.fecha_cupo} ${a.hora_cupo}`.localeCompare(`${b.fecha_cupo} ${b.hora_cupo}`),
        ),
    [citas],
  )

  const nextCita = activas[0] ?? null
  const ofertas = espera.filter((item) => item.estado === 'ofrecida')
  const pendientes = espera.filter((item) => item.estado === 'pendiente')

  return (
    <div className="space-y-4">
      <div className="border border-slate-200 bg-white px-4 py-4 sm:px-6 sm:py-5">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Hola, {user.fullName}
        </h1>
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">
          Este es el resumen de tus citas y solicitudes en la clínica.
        </p>
      </div>

      {loading ? (
        <div className="loading-banner animate-fade-in border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700" role="status" aria-live="polite">
          Cargando tu información…
        </div>
      ) : null}
      {error ? (
        <div className="animate-fade-up border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700" role="alert">{error}</div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-[74px] animate-pulse border border-slate-200 bg-white motion-reduce:animate-none"
            />
          ))
        ) : (
          <>
        <button
          type="button"
          onClick={() => onNavigate('citas')}
          className="border border-slate-200 bg-white p-3 text-left transition-colors hover:bg-slate-50"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Citas activas
            </p>
            <CalendarRange className="h-4 w-4 text-sky-700" aria-hidden="true" />
          </div>
          <p className="mt-1 text-2xl font-bold text-slate-900">{activas.length}</p>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('lista-espera')}
          className="border border-slate-200 bg-white p-3 text-left transition-colors hover:bg-slate-50"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              En lista de espera
            </p>
            <ListOrdered className="h-4 w-4 text-amber-600" aria-hidden="true" />
          </div>
          <p className="mt-1 text-2xl font-bold text-slate-900">{pendientes.length}</p>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('lista-espera')}
          className="border border-slate-200 bg-white p-3 text-left transition-colors hover:bg-slate-50"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Ofertas disponibles
            </p>
            <Sparkles className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          </div>
          <p className="mt-1 text-2xl font-bold text-slate-900">{ofertas.length}</p>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('agenda')}
          className="inline-flex items-center justify-center gap-2 border border-sky-800 bg-sky-800 p-3 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-sky-900"
        >
          <CalendarPlus className="h-4 w-4" aria-hidden="true" />
          Agendar cita
        </button>
          </>
        )}
      </div>

      {ofertas.length > 0 ? (
        <div className="border border-sky-200 bg-sky-50 px-4 py-3">
          <p className="text-sm font-semibold text-sky-900">
            Tienes {ofertas.length === 1 ? 'una oferta de cupo' : `${ofertas.length} ofertas de cupo`} esperando respuesta.
          </p>
          <p className="mt-1 text-xs text-sky-800">
            Revisa la fecha y hora ofrecida y acepta o rechaza antes de que expire.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('lista-espera')}
            className="mt-2 bg-sky-800 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-sky-900"
          >
            Ver ofertas
          </button>
        </div>
      ) : null}

      <div className="border border-slate-200 bg-white px-4 py-4 sm:px-6 sm:py-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-600">
          Próxima cita
        </h2>
        {loading ? (
          <div className="mt-3 h-16 animate-pulse border border-slate-200 bg-slate-100 motion-reduce:animate-none" />
        ) : nextCita ? (
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Fecha y hora</p>
              <p className="text-slate-900">
                {nextCita.fecha_cupo} {nextCita.hora_cupo?.slice(0, 5)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Médico</p>
              <p className="text-slate-900">{nextCita.medico}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Especialidad</p>
              <p className="text-slate-900">{nextCita.especialidad}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Estado</p>
              <p className="text-slate-900">{ESTADO_LABEL[nextCita.estado] ?? nextCita.estado}</p>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            No tienes citas activas. Puedes agendar una nueva cita desde el módulo Agendar cita.
          </p>
        )}
      </div>
    </div>
  )
}

export default PacienteInicioModule
