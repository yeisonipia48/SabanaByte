import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bell, CalendarPlus, CalendarRange, CheckCheck, ListOrdered, Sparkles } from 'lucide-react'
import { citasService } from '../../../services/citas.service'
import { listaEsperaService } from '../../../services/listaEspera.service'
import { notificacionesService } from '../../../services/notificaciones.service'
import type { CitaDetalleResponseApi } from '../../../types/api/citas'
import type { ListaEsperaDetalleResponseApi } from '../../../types/api/listaEspera'
import type { NotificacionApi } from '../../../types/api/auth'
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
  const [notificaciones, setNotificaciones] = useState<NotificacionApi[]>([])
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
      const [citasData, esperaData, notificacionesData] = await Promise.all([
        citasService.getAll({ id_paciente: user.profileId }),
        listaEsperaService.getAll(),
        notificacionesService.getAll(),
      ])
      setCitas(citasData)
      setEspera(esperaData.filter((item) => item.id_paciente === user.profileId))
      setNotificaciones(notificacionesData)
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
  const noLeidas = notificaciones.filter((item) => !item.leida)
  const notificacionesVisibles = notificaciones.slice(0, 5)

  const marcarNotificacionLeida = async (id: number) => {
    try {
      await notificacionesService.marcarLeida(id)
      setNotificaciones((prev) =>
        prev.map((item) => (item.id === id ? { ...item, leida: true } : item)),
      )
    } catch {
      // La notificación se actualizará en la próxima recarga
    }
  }

  return (
    <div className="space-y-4">
      <div className="border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-4 py-4 sm:px-6 sm:py-5">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-2xl">
          Hola, {user.fullName}
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
          Este es el resumen de tus citas y solicitudes en la clínica.
        </p>
      </div>

      {loading ? (
        <div className="loading-banner animate-fade-in border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300" role="status" aria-live="polite">
          Cargando tu información…
        </div>
      ) : null}
      {error ? (
        <div className="animate-fade-up border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300" role="alert">{error}</div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-[74px] animate-pulse border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 motion-reduce:animate-none"
            />
          ))
        ) : (
          <>
        <button
          type="button"
          onClick={() => onNavigate('citas')}
          className="border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-3 text-left transition-colors hover:bg-slate-50 active:bg-slate-100 dark:hover:bg-slate-800 dark:active:bg-slate-700"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Citas activas
            </p>
            <CalendarRange className="h-4 w-4 text-sky-700" aria-hidden="true" />
          </div>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{activas.length}</p>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('lista-espera')}
          className="border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-3 text-left transition-colors hover:bg-slate-50 active:bg-slate-100 dark:hover:bg-slate-800 dark:active:bg-slate-700"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              En lista de espera
            </p>
            <ListOrdered className="h-4 w-4 text-amber-600" aria-hidden="true" />
          </div>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{pendientes.length}</p>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('lista-espera')}
          className="border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-3 text-left transition-colors hover:bg-slate-50 active:bg-slate-100 dark:hover:bg-slate-800 dark:active:bg-slate-700"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Ofertas disponibles
            </p>
            <Sparkles className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          </div>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{ofertas.length}</p>
        </button>
        <button
          type="button"
          onClick={() => onNavigate('agenda')}
          className="inline-flex items-center justify-center gap-2 border border-sky-800 bg-sky-800 p-3 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-sky-900 active:bg-sky-950 dark:border-sky-700 dark:bg-sky-700 dark:hover:bg-sky-600"
        >
          <CalendarPlus className="h-4 w-4" aria-hidden="true" />
          Agendar cita
        </button>
          </>
        )}
      </div>

      {ofertas.length > 0 ? (
        <div className="animate-fade-up border border-sky-200 bg-sky-50 px-4 py-3 dark:border-sky-900/60 dark:bg-sky-950/30">
          <p className="text-sm font-semibold text-sky-900 dark:text-sky-200">
            Tienes {ofertas.length === 1 ? 'una oferta de cupo' : `${ofertas.length} ofertas de cupo`} esperando respuesta.
          </p>
          <p className="mt-1 text-xs text-sky-800 dark:text-sky-300">
            Revisa la fecha y hora ofrecida y acepta o rechaza antes de que expire.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('lista-espera')}
            className="mt-2 bg-sky-800 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-sky-900 active:bg-sky-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 dark:bg-sky-700 dark:hover:bg-sky-600"
          >
            Ver ofertas
          </button>
        </div>
      ) : null}

      <div className="border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            <Bell className="h-4 w-4 text-sky-700" aria-hidden="true" />
            Notificaciones
          </h2>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {noLeidas.length} sin leer
          </span>
        </div>
        {notificacionesVisibles.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Aún no tienes notificaciones.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-200 dark:divide-slate-800">
            {notificacionesVisibles.map((notificacion) => (
              <li key={notificacion.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {notificacion.asunto}
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {notificacion.mensaje}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {notificacion.fecha_creacion}
                  </p>
                </div>
                {notificacion.leida ? (
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
                    <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    Leída
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => marcarNotificacionLeida(notificacion.id)}
                    className="shrink-0 self-start border border-sky-300 px-2 py-1 text-xs font-semibold text-sky-800 hover:bg-sky-50 dark:border-sky-800 dark:text-sky-300 dark:hover:bg-sky-950/40"
                  >
                    Marcar como leída
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-4 py-4 sm:px-6 sm:py-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
          Próxima cita
        </h2>
        {loading ? (
          <div className="mt-3 h-16 animate-pulse border border-slate-200 bg-slate-100 motion-reduce:animate-none" />
        ) : nextCita ? (
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Fecha y hora</p>
              <p className="text-slate-900 dark:text-slate-100">
                {nextCita.fecha_cupo} {nextCita.hora_cupo?.slice(0, 5)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Médico</p>
              <p className="text-slate-900 dark:text-slate-100">{nextCita.medico}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Especialidad</p>
              <p className="text-slate-900 dark:text-slate-100">{nextCita.especialidad}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Estado</p>
              <p className="text-slate-900 dark:text-slate-100">{ESTADO_LABEL[nextCita.estado] ?? nextCita.estado}</p>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            No tienes citas activas. Puedes agendar una nueva cita desde el módulo Agendar cita.
          </p>
        )}
      </div>
    </div>
  )
}

export default PacienteInicioModule
