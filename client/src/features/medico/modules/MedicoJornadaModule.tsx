import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarCheck, CheckCircle2, Clock3, RefreshCw, Users } from 'lucide-react'
import AdminDataTable from '../../administrador/components/AdminDataTable'
import ConfirmDeleteModal from '../../administrador/components/ConfirmDeleteModal'
import { citasService } from '../../../services/citas.service'
import type { CitaDetalleResponseApi } from '../../../types/api/citas'
import type { AuthUser } from '../../auth/types'

interface MedicoJornadaModuleProps {
  user: AuthUser
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

function MedicoJornadaModule({ user }: MedicoJornadaModuleProps) {
  const [fecha, setFecha] = useState(today)
  const [items, setItems] = useState<CitaDetalleResponseApi[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toCancel, setToCancel] = useState<CitaDetalleResponseApi | null>(null)

  const loadData = useCallback(async () => {
    if (user.profileId === null) {
      setError('No encontramos tu perfil de médico. Cierra sesión e ingresa de nuevo.')
      setItems([])
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await citasService.getJornadaMedico(user.profileId, fecha)
      setItems(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar tu jornada.')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [fecha, user.profileId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const stats = useMemo(() => {
    const atendidas = items.filter((item) => item.estado === 'atendida').length
    const noAsistio = items.filter((item) => item.estado === 'no_asistio').length
    const pendientes = items.filter(
      (item) => item.estado === 'pendiente' || item.estado === 'confirmada',
    ).length

    return { total: items.length, atendidas, noAsistio, pendientes }
  }, [items])

  const cambiarEstado = async (
    item: CitaDetalleResponseApi,
    estado: 'confirmada' | 'atendida' | 'no_asistio',
  ) => {
    try {
      await citasService.actualizarAsistencia(item.id, estado)
      await loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo actualizar la cita.')
    }
  }

  const handleCancel = async () => {
    if (!toCancel) return

    try {
      await citasService.cancelar(toCancel.id)
      setToCancel(null)
      await loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo cancelar la cita.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Mi jornada</h2>
          <p className="text-xs text-slate-500">
            Revisa las citas del día y registra la asistencia de tus pacientes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="jornada-fecha" className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Fecha
          </label>
          <input
            id="jornada-fecha"
            type="date"
            value={fecha}
            onChange={(event) => setFecha(event.target.value)}
            className="border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-700/25"
          />
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-2 border border-slate-300 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Actualizar
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-[74px] animate-pulse border border-slate-200 bg-white motion-reduce:animate-none"
              />
            ))
          : [
              { label: 'Citas del día', value: stats.total, icon: CalendarCheck },
              { label: 'Pendientes', value: stats.pendientes, icon: Clock3 },
              { label: 'Atendidas', value: stats.atendidas, icon: CheckCircle2 },
              { label: 'No asistió', value: stats.noAsistio, icon: Users },
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

      {loading ? (
        <div className="loading-banner animate-fade-in border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700" role="status" aria-live="polite">
          Cargando jornada…
        </div>
      ) : null}
      {error ? (
        <div className="animate-fade-up border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700" role="alert">{error}</div>
      ) : null}

      <AdminDataTable
        loading={loading}
        columns={[
          { header: 'Hora', render: (row: CitaDetalleResponseApi) => row.hora_cupo?.slice(0, 5) ?? '' },
          { header: 'Paciente', accessor: 'paciente' },
          { header: 'Documento', accessor: 'numero_documento' },
          { header: 'Especialidad', accessor: 'especialidad' },
          { header: 'Consultorio', accessor: 'consultorio' },
          {
            header: 'Estado',
            render: (row: CitaDetalleResponseApi) => ESTADO_LABEL[row.estado] ?? row.estado,
          },
          {
            header: 'Acciones',
            render: (row: CitaDetalleResponseApi) => (
              <div className="flex flex-wrap items-center gap-1">
                {row.estado === 'pendiente' ? (
                  <button
                    type="button"
                    onClick={() => cambiarEstado(row, 'confirmada')}
                    className="border border-sky-300 px-2 py-1 text-xs text-sky-700 hover:bg-sky-50"
                  >
                    Confirmar
                  </button>
                ) : null}
                {row.estado !== 'atendida' &&
                row.estado !== 'cancelada' &&
                row.estado !== 'no_asistio' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => cambiarEstado(row, 'atendida')}
                      className="border border-emerald-300 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50"
                    >
                      Asistió
                    </button>
                    <button
                      type="button"
                      onClick={() => cambiarEstado(row, 'no_asistio')}
                      className="border border-amber-300 px-2 py-1 text-xs text-amber-700 hover:bg-amber-50"
                    >
                      No asistió
                    </button>
                    <button
                      type="button"
                      onClick={() => setToCancel(row)}
                      className="border border-rose-200 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                    >
                      Cancelar
                    </button>
                  </>
                ) : null}
              </div>
            ),
          },
        ]}
        data={items}
        emptyMessage="No tienes citas para esta fecha."
      />

      <ConfirmDeleteModal
        open={toCancel !== null}
        onCancel={() => setToCancel(null)}
        onConfirm={handleCancel}
        title="Cancelar cita"
        description={`¿Cancelar la cita de ${toCancel?.paciente ?? ''}? El cupo podrá ofrecerse a la lista de espera.`}
        confirmText="Cancelar cita"
        cancelText="Volver"
      />
    </div>
  )
}

export default MedicoJornadaModule
