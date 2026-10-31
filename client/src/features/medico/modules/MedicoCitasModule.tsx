import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarCheck, Eye, RefreshCw, XCircle } from 'lucide-react'
import AdminDataTable from '../../administrador/components/AdminDataTable'
import AdminModal from '../../administrador/components/AdminModal'
import ConfirmDeleteModal from '../../administrador/components/ConfirmDeleteModal'
import { citasService } from '../../../services/citas.service'
import type { CitaDetalleResponseApi } from '../../../types/api/citas'
import type { AuthUser } from '../../auth/types'

interface MedicoCitasModuleProps {
  user: AuthUser
}

const ESTADOS = [
  { value: '', label: 'Todos los estados' },
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'confirmada', label: 'Confirmadas' },
  { value: 'atendida', label: 'Atendidas' },
  { value: 'no_asistio', label: 'No asistió' },
  { value: 'cancelada', label: 'Canceladas' },
]

const ESTADO_LABEL: Record<string, string> = {
  pendiente: 'Programada',
  confirmada: 'Confirmada',
  atendida: 'Atendida',
  cancelada: 'Cancelada',
  no_asistio: 'No asistió',
}

function estadoBadge(estado: string): string {
  switch (estado) {
    case 'atendida':
      return 'bg-emerald-50 text-emerald-700'
    case 'cancelada':
      return 'bg-rose-50 text-rose-700'
    case 'no_asistio':
      return 'bg-amber-50 text-amber-700'
    case 'confirmada':
      return 'bg-sky-50 text-sky-700'
    default:
      return 'bg-slate-100 text-slate-600'
  }
}

function MedicoCitasModule({ user }: MedicoCitasModuleProps) {
  const [items, setItems] = useState<CitaDetalleResponseApi[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [estado, setEstado] = useState('')
  const [fecha, setFecha] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<CitaDetalleResponseApi | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)

  const loadData = useCallback(async () => {
    if (user.profileId === null) {
      setError('No encontramos tu perfil de médico. Cierra sesión e ingresa de nuevo.')
      setItems([])
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await citasService.getAll({
        id_medico: user.profileId,
        estado: estado || undefined,
        fecha: fecha || undefined,
      })
      setItems(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar tus citas.')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [estado, fecha, user.profileId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return items

    return items.filter((item) =>
      [
        item.paciente,
        item.numero_documento,
        item.email,
        item.especialidad,
        item.consultorio,
        item.motivo_consulta ?? '',
        item.fecha_cupo,
        item.hora_cupo,
        ESTADO_LABEL[item.estado] ?? item.estado,
      ]
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }, [items, search])

  const cambiarEstado = async (
    item: CitaDetalleResponseApi,
    nextEstado: 'confirmada' | 'atendida' | 'no_asistio',
  ) => {
    try {
      await citasService.actualizarAsistencia(item.id, nextEstado)
      await loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo actualizar la cita.')
    }
  }

  const handleCancel = async () => {
    if (!selected) return

    try {
      await citasService.cancelar(selected.id)
      setCancelOpen(false)
      setSelected(null)
      await loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo cancelar la cita.')
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Mis citas</h2>
        <p className="text-xs text-slate-500">
          Consulta y actualiza la asistencia de las citas de tus pacientes.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <select
          value={estado}
          onChange={(event) => setEstado(event.target.value)}
          className="border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-700/25"
          aria-label="Filtrar por estado"
        >
          {ESTADOS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={fecha}
          onChange={(event) => setFecha(event.target.value)}
          className="border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-700/25"
          aria-label="Filtrar por fecha"
        />
        <input
          type="search"
          name="search"
          aria-label="Buscar citas"
          autoComplete="off"
          spellCheck={false}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar paciente, documento o motivo…"
          className="border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-shadow focus:outline-none focus:ring-2 focus:ring-sky-700/25 sm:col-span-2"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={loadData}
          className="inline-flex items-center gap-2 border border-slate-300 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Actualizar
        </button>
      </div>

      {loading ? (
        <div className="loading-banner animate-fade-in border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700" role="status" aria-live="polite">
          Cargando citas…
        </div>
      ) : null}
      {error ? (
        <div className="animate-fade-up border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700" role="alert">{error}</div>
      ) : null}

      <AdminDataTable
        loading={loading}
        columns={[
          { header: 'Paciente', accessor: 'paciente' },
          { header: 'Documento', accessor: 'numero_documento' },
          { header: 'Fecha', accessor: 'fecha_cupo' },
          {
            header: 'Hora',
            render: (row: CitaDetalleResponseApi) => row.hora_cupo?.slice(0, 5) ?? '',
          },
          { header: 'Especialidad', accessor: 'especialidad' },
          {
            header: 'Estado',
            render: (row: CitaDetalleResponseApi) => (
              <span className={`inline-flex px-2 py-0.5 text-xs font-medium ${estadoBadge(row.estado)}`}>
                {ESTADO_LABEL[row.estado] ?? row.estado}
              </span>
            ),
          },
          {
            header: 'Acciones',
            render: (row: CitaDetalleResponseApi) => (
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelected(row)}
                  className="inline-flex items-center gap-1 border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Ver
                </button>
                {row.estado === 'pendiente' ? (
                  <button
                    type="button"
                    onClick={() => cambiarEstado(row, 'confirmada')}
                    className="inline-flex items-center gap-1 border border-sky-300 px-2 py-1 text-xs text-sky-700 hover:bg-sky-50"
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
                      className="inline-flex items-center gap-1 border border-emerald-300 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50"
                    >
                      <CalendarCheck className="h-3.5 w-3.5" />
                      Asistió
                    </button>
                    <button
                      type="button"
                      onClick={() => cambiarEstado(row, 'no_asistio')}
                      className="inline-flex items-center gap-1 border border-amber-300 px-2 py-1 text-xs text-amber-700 hover:bg-amber-50"
                    >
                      No asistió
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(row)
                        setCancelOpen(true)
                      }}
                      className="inline-flex items-center gap-1 border border-rose-200 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Cancelar
                    </button>
                  </>
                ) : null}
              </div>
            ),
          },
        ]}
        data={filtered}
        emptyMessage="No tienes citas con los filtros seleccionados."
      />

      <AdminModal
        open={selected !== null && !cancelOpen}
        title="Detalle de la cita"
        onClose={() => setSelected(null)}
        footer={
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700 hover:bg-slate-50"
          >
            Cerrar
          </button>
        }
      >
        {selected ? (
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Paciente</dt>
              <dd className="text-sm text-slate-900">{selected.paciente}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Documento</dt>
              <dd className="text-sm text-slate-900">{selected.numero_documento}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Correo</dt>
              <dd className="text-sm text-slate-900">{selected.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Especialidad</dt>
              <dd className="text-sm text-slate-900">{selected.especialidad}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Fecha y hora</dt>
              <dd className="text-sm text-slate-900">
                {selected.fecha_cupo} {selected.hora_cupo?.slice(0, 5)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Consultorio</dt>
              <dd className="text-sm text-slate-900">{selected.consultorio}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Motivo</dt>
              <dd className="text-sm text-slate-900">{selected.motivo_consulta || 'Sin motivo registrado'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Estado</dt>
              <dd className="text-sm text-slate-900">
                {ESTADO_LABEL[selected.estado] ?? selected.estado}
              </dd>
            </div>
          </dl>
        ) : null}
      </AdminModal>

      <ConfirmDeleteModal
        open={cancelOpen}
        onCancel={() => {
          setCancelOpen(false)
          setSelected(null)
        }}
        onConfirm={handleCancel}
        title="Cancelar cita"
        description="¿Cancelar esta cita? Si hay pacientes en lista de espera, el cupo podrá ofrecerse automáticamente."
        confirmText="Cancelar cita"
        cancelText="Volver"
      />
    </div>
  )
}

export default MedicoCitasModule
