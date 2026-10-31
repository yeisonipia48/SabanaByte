import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { Eye, ListPlus, RefreshCw } from 'lucide-react'
import AdminDataTable from '../../administrador/components/AdminDataTable'
import AdminFormField from '../../administrador/components/AdminFormField'
import AdminModal from '../../administrador/components/AdminModal'
import { listaEsperaService } from '../../../services/listaEspera.service'
import { medicosService } from '../../../services/medicos.service'
import type { ListaEsperaDetalleResponseApi } from '../../../types/api/listaEspera'
import type { MedicoResponseApi } from '../../../types/api/medicos'
import type { AuthUser } from '../../auth/types'

interface PacienteListaEsperaModuleProps {
  user: AuthUser
}

type PendingAction = 'aceptar' | 'rechazar' | 'cancelar'

const ESTADO_LABEL: Record<string, string> = {
  pendiente: 'En espera',
  ofrecida: 'Oferta disponible',
  aceptada: 'Aceptada',
  cancelada: 'Cancelada',
  expirada: 'Expirada',
}

function estadoBadge(estado: string): string {
  switch (estado) {
    case 'ofrecida':
      return 'bg-sky-50 text-sky-700'
    case 'aceptada':
      return 'bg-emerald-50 text-emerald-700'
    case 'cancelada':
    case 'expirada':
      return 'bg-rose-50 text-rose-700'
    default:
      return 'bg-amber-50 text-amber-700'
  }
}

function PacienteListaEsperaModule({ user }: PacienteListaEsperaModuleProps) {
  const [items, setItems] = useState<ListaEsperaDetalleResponseApi[]>([])
  const [medicos, setMedicos] = useState<MedicoResponseApi[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [doctorId, setDoctorId] = useState('')
  const [prioridad, setPrioridad] = useState('1')
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState<ListaEsperaDetalleResponseApi | null>(null)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [actionItem, setActionItem] = useState<ListaEsperaDetalleResponseApi | null>(null)

  const loadData = useCallback(async () => {
    if (user.profileId === null) {
      setError('No encontramos tu perfil de paciente. Cierra sesión e ingresa de nuevo.')
      setItems([])
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await listaEsperaService.getAll()
      setItems(data.filter((item) => item.id_paciente === user.profileId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar tu lista de espera.')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [user.profileId])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    medicosService
      .getAll()
      .then(setMedicos)
      .catch(() => setMedicos([]))
  }, [])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return items

    return items.filter((item) =>
      [
        item.medico ?? '',
        item.especialidad ?? '',
        item.medico_ofrecido ?? '',
        item.especialidad_ofrecida ?? '',
        item.fecha_solicitud,
        item.fecha_cupo ?? '',
        ESTADO_LABEL[item.estado] ?? item.estado,
      ]
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }, [items, search])

  const handleCreate = async () => {
    if (user.profileId === null) {
      alert('No encontramos tu perfil de paciente.')
      return
    }

    const priority = Number(prioridad)
    if (!Number.isFinite(priority) || priority < 1 || priority > 5) {
      alert('La prioridad debe estar entre 1 y 5.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await listaEsperaService.create({
        id_paciente: user.profileId,
        id_medico: doctorId ? Number(doctorId) : null,
        prioridad: priority,
      })
      setCreateOpen(false)
      setDoctorId('')
      setPrioridad('1')
      setSuccess('Solicitud registrada. Te avisaremos cuando haya un cupo disponible.')
      await loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo registrar la solicitud.')
    } finally {
      setSaving(false)
    }
  }

  const runAction = async () => {
    if (!actionItem || !pendingAction) return

    try {
      if (pendingAction === 'aceptar') {
        await listaEsperaService.aceptarOferta(actionItem.id)
        setSuccess('Oferta aceptada. Tu cita quedó agendada.')
      } else if (pendingAction === 'rechazar') {
        await listaEsperaService.rechazarOferta(actionItem.id)
        setSuccess('Oferta rechazada. Tu solicitud volvió a la lista de espera.')
      } else {
        await listaEsperaService.cancelar(actionItem.id)
        setSuccess('Solicitud cancelada.')
      }

      setPendingAction(null)
      setActionItem(null)
      await loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo completar la acción.')
    }
  }

  const askAction = (action: PendingAction, item: ListaEsperaDetalleResponseApi) => {
    setPendingAction(action)
    setActionItem(item)
  }

  const actionTitle =
    pendingAction === 'aceptar'
      ? 'Aceptar oferta de cupo'
      : pendingAction === 'rechazar'
        ? 'Rechazar oferta de cupo'
        : 'Cancelar solicitud'

  const actionDescription =
    pendingAction === 'aceptar'
      ? `¿Confirmar la cita ofrecida para el ${actionItem?.fecha_cupo ?? ''} a las ${actionItem?.hora_cupo?.slice(0, 5) ?? ''}?`
      : pendingAction === 'rechazar'
        ? '¿Rechazar esta oferta? La solicitud volverá a la lista de espera.'
        : '¿Cancelar esta solicitud de lista de espera?'

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Mi lista de espera</h2>
          <p className="text-xs text-slate-500">
            Solicita un cupo y acepta o rechaza las ofertas que te asignen.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setCreateOpen(true)
            setSuccess(null)
          }}
          className="inline-flex items-center justify-center gap-2 bg-sky-800 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:bg-sky-900"
        >
          <ListPlus className="h-4 w-4" aria-hidden="true" />
          Solicitar cupo
        </button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por médico, especialidad o estado..."
          className="w-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-700/25 sm:w-80"
        />
        <button
          type="button"
          onClick={loadData}
          className="inline-flex items-center justify-center gap-2 border border-slate-300 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Actualizar
        </button>
      </div>

      {loading ? (
        <div className="loading-banner animate-fade-in border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700" role="status" aria-live="polite">
          Cargando solicitudes…
        </div>
      ) : null}
      {error ? (
        <div className="animate-fade-up border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700" role="alert">{error}</div>
      ) : null}
      {success ? (
        <div className="animate-fade-up border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700" role="status">
          {success}
        </div>
      ) : null}

      <AdminDataTable
        loading={loading}
        columns={[
          {
            header: 'Médico solicitado',
            render: (row: ListaEsperaDetalleResponseApi) => row.medico || 'Cualquier médico',
          },
          {
            header: 'Especialidad',
            render: (row: ListaEsperaDetalleResponseApi) => row.especialidad || '-',
          },
          {
            header: 'Prioridad',
            render: (row: ListaEsperaDetalleResponseApi) => row.prioridad,
          },
          {
            header: 'Solicitud',
            render: (row: ListaEsperaDetalleResponseApi) => row.fecha_solicitud?.slice(0, 10) ?? '',
          },
          {
            header: 'Oferta',
            render: (row: ListaEsperaDetalleResponseApi) =>
              row.fecha_cupo
                ? `${row.fecha_cupo} ${row.hora_cupo?.slice(0, 5) ?? ''}`
                : 'Sin oferta',
          },
          {
            header: 'Estado',
            render: (row: ListaEsperaDetalleResponseApi) => (
              <span className={`inline-flex px-2 py-0.5 text-xs font-medium ${estadoBadge(row.estado)}`}>
                {ESTADO_LABEL[row.estado] ?? row.estado}
              </span>
            ),
          },
          {
            header: 'Acciones',
            render: (row: ListaEsperaDetalleResponseApi) => (
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSelected(row)}
                  className="inline-flex items-center gap-1 border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Ver
                </button>
                {row.estado === 'ofrecida' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => askAction('aceptar', row)}
                      className="border border-emerald-300 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50"
                    >
                      Aceptar
                    </button>
                    <button
                      type="button"
                      onClick={() => askAction('rechazar', row)}
                      className="border border-amber-300 px-2 py-1 text-xs text-amber-700 hover:bg-amber-50"
                    >
                      Rechazar
                    </button>
                  </>
                ) : null}
                {row.estado === 'pendiente' || row.estado === 'ofrecida' ? (
                  <button
                    type="button"
                    onClick={() => askAction('cancelar', row)}
                    className="border border-rose-200 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                  >
                    Cancelar
                  </button>
                ) : null}
              </div>
            ),
          },
        ]}
        data={filtered}
        emptyMessage="No tienes solicitudes en lista de espera."
      />

      <AdminModal
        open={createOpen}
        title="Solicitar cupo en lista de espera"
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={saving}
              className="bg-sky-800 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-sky-900 disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Registrar solicitud'}
            </button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <AdminFormField
            label="Médico (opcional)"
            id="lista-medico"
            value={doctorId}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => setDoctorId(event.target.value)}
          >
            <option value="">Cualquier médico</option>
            {medicos.map((medico) => (
              <option key={medico.id} value={medico.id}>
                {medico.nombres} {medico.apellidos} · {medico.especialidad}
              </option>
            ))}
          </AdminFormField>
          <AdminFormField
            label="Prioridad (1 a 5)"
            id="lista-prioridad"
            type="number"
            required
            min={1}
            max={5}
            value={prioridad}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setPrioridad(event.target.value)}
          />
        </div>
      </AdminModal>

      <AdminModal
        open={selected !== null}
        title="Detalle de la solicitud"
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
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Estado</dt>
              <dd className="text-sm text-slate-900">
                {ESTADO_LABEL[selected.estado] ?? selected.estado}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Prioridad</dt>
              <dd className="text-sm text-slate-900">{selected.prioridad}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Médico solicitado</dt>
              <dd className="text-sm text-slate-900">{selected.medico || 'Cualquier médico'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Especialidad</dt>
              <dd className="text-sm text-slate-900">{selected.especialidad || '-'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Fecha de solicitud</dt>
              <dd className="text-sm text-slate-900">{selected.fecha_solicitud}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Oferta</dt>
              <dd className="text-sm text-slate-900">
                {selected.fecha_cupo
                  ? `${selected.fecha_cupo} ${selected.hora_cupo?.slice(0, 5) ?? ''}`
                  : 'Sin oferta'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Médico ofrecido</dt>
              <dd className="text-sm text-slate-900">{selected.medico_ofrecido || '-'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Expira</dt>
              <dd className="text-sm text-slate-900">{selected.fecha_expiracion || '-'}</dd>
            </div>
          </dl>
        ) : null}
      </AdminModal>

      <AdminModal
        open={pendingAction !== null}
        title={actionTitle}
        onClose={() => {
          setPendingAction(null)
          setActionItem(null)
        }}
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setPendingAction(null)
                setActionItem(null)
              }}
              className="border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700 hover:bg-slate-50"
            >
              Volver
            </button>
            <button
              type="button"
              onClick={runAction}
              className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white ${
                pendingAction === 'aceptar'
                  ? 'bg-emerald-700 hover:bg-emerald-800'
                  : pendingAction === 'rechazar'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-rose-700 hover:bg-rose-800'
              }`}
            >
              Confirmar
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600">{actionDescription}</p>
      </AdminModal>
    </div>
  )
}

export default PacienteListaEsperaModule
