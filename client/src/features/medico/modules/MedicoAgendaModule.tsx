import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { CalendarPlus, Edit, Eye, RefreshCw, Trash2 } from 'lucide-react'
import AdminDataTable from '../../administrador/components/AdminDataTable'
import AdminFormField from '../../administrador/components/AdminFormField'
import AdminModal from '../../administrador/components/AdminModal'
import ConfirmDeleteModal from '../../administrador/components/ConfirmDeleteModal'
import { agendaService } from '../../../services/agenda.service'
import type { AgendaResponseApi } from '../../../types/api/agenda'
import type { AuthUser } from '../../auth/types'

interface MedicoAgendaModuleProps {
  user: AuthUser
}

interface FormState {
  date: string
  startTime: string
  endTime: string
  duration: string
  status: 'activo' | 'inactivo'
}

const emptyForm: FormState = {
  date: '',
  startTime: '08:00',
  endTime: '12:00',
  duration: '30',
  status: 'activo',
}

function formatTime(value: string): string {
  return value?.slice(0, 5) ?? ''
}

function MedicoAgendaModule({ user }: MedicoAgendaModuleProps) {
  const [items, setItems] = useState<AgendaResponseApi[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [mode, setMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selected, setSelected] = useState<AgendaResponseApi | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [toDelete, setToDelete] = useState<AgendaResponseApi | null>(null)

  const loadData = useCallback(async () => {
    if (user.profileId === null) {
      setError('No encontramos tu perfil de médico. Cierra sesión e ingresa de nuevo.')
      setItems([])
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await agendaService.getByMedico(user.profileId)
      setItems(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar tu agenda.')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [user.profileId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return items

    return items.filter((item) =>
      [item.fecha_inicio, item.fecha_fin, formatTime(item.hora_inicio), formatTime(item.hora_fin), item.estado]
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }, [items, search])

  const openCreate = () => {
    setMode('create')
    setSelected(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (item: AgendaResponseApi) => {
    setMode('edit')
    setSelected(item)
    setForm({
      date: item.fecha_inicio?.slice(0, 10) ?? '',
      startTime: formatTime(item.hora_inicio),
      endTime: formatTime(item.hora_fin),
      duration: String(item.duracion_cita ?? 30),
      status: item.estado === 'activo' ? 'activo' : 'inactivo',
    })
    setModalOpen(true)
  }

  const openView = (item: AgendaResponseApi) => {
    openEdit(item)
    setMode('view')
  }

  const validate = (): string | null => {
    if (!form.date) return 'Selecciona la fecha de la agenda.'
    if (!form.startTime || !form.endTime) return 'Ingresa la hora de inicio y fin.'
    if (form.startTime >= form.endTime) return 'La hora de fin debe ser mayor que la hora de inicio.'
    if (Number(form.duration) <= 0) return 'La duración de la cita debe ser mayor a cero.'
    return null
  }

  const handleSubmit = async () => {
    if (mode === 'view') {
      setModalOpen(false)
      return
    }

    if (user.profileId === null) {
      alert('No encontramos tu perfil de médico.')
      return
    }

    const validation = validate()
    if (validation) {
      alert(validation)
      return
    }

    try {
      if (mode === 'create') {
        const created = await agendaService.create({
          id_medico: user.profileId,
          fecha_inicio: form.date,
          fecha_fin: form.date,
          duracion_cita: Number(form.duration),
          hora_inicio: form.startTime,
          hora_fin: form.endTime,
        })

        try {
          await agendaService.generarCupos(created.id)
        } catch {
          // La agenda queda creada aunque no se generen cupos.
        }
      } else if (selected) {
        await agendaService.update(selected.id, {
          fecha_inicio: form.date,
          fecha_fin: form.date,
          duracion_cita: Number(form.duration),
          hora_inicio: form.startTime,
          hora_fin: form.endTime,
          estado: form.status,
        })
      }

      await loadData()
      setModalOpen(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo guardar la agenda.')
    }
  }

  const toggleEstado = async (item: AgendaResponseApi) => {
    try {
      await agendaService.update(item.id, {
        estado: item.estado === 'activo' ? 'inactivo' : 'activo',
      })
      await loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo cambiar el estado de la agenda.')
    }
  }

  const generarCupos = async (item: AgendaResponseApi) => {
    try {
      const result = await agendaService.generarCupos(item.id)
      alert(`Cupos generados: ${result.cupos_creados}. Omitidos: ${result.cupos_omitidos}.`)
      await loadData()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudieron generar los cupos.')
    }
  }

  const confirmDelete = (item: AgendaResponseApi) => {
    setToDelete(item)
    setDeleteOpen(true)
  }

  const handleDelete = async () => {
    if (!toDelete) return

    try {
      await agendaService.remove(toDelete.id)
      await loadData()
      setDeleteOpen(false)
      setToDelete(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo eliminar la agenda.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Mi agenda</h2>
          <p className="text-xs text-slate-500">
            Crea tus jornadas y genera los cupos disponibles para tus pacientes.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 bg-sky-800 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:bg-sky-900"
        >
          <CalendarPlus className="h-4 w-4" aria-hidden="true" />
          Crear agenda
        </button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          name="search"
          aria-label="Buscar agenda"
          autoComplete="off"
          spellCheck={false}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por fecha, hora o estado…"
          className="w-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-shadow focus:outline-none focus:ring-2 focus:ring-sky-700/25 sm:w-80"
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
          Cargando agenda…
        </div>
      ) : null}
      {error ? (
        <div className="animate-fade-up border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700" role="alert">{error}</div>
      ) : null}

      <AdminDataTable
        loading={loading}
        columns={[
          { header: 'Fecha', accessor: 'fecha_inicio' },
          {
            header: 'Horario',
            render: (row: AgendaResponseApi) =>
              `${formatTime(row.hora_inicio)} - ${formatTime(row.hora_fin)}`,
          },
          {
            header: 'Duración',
            render: (row: AgendaResponseApi) => `${row.duracion_cita} min`,
          },
          {
            header: 'Estado',
            render: (row: AgendaResponseApi) => (
              <span
                className={`inline-flex px-2 py-0.5 text-xs font-medium ${
                  row.estado === 'activo'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {row.estado === 'activo' ? 'Activa' : 'Inactiva'}
              </span>
            ),
          },
          {
            header: 'Acciones',
            render: (row: AgendaResponseApi) => (
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => openView(row)}
                  className="inline-flex items-center gap-1 border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Ver
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(row)}
                  className="inline-flex items-center gap-1 border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                >
                  <Edit className="h-3.5 w-3.5" />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => generarCupos(row)}
                  className="inline-flex items-center gap-1 border border-sky-300 px-2 py-1 text-xs text-sky-700 hover:bg-sky-50"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Cupos
                </button>
                <button
                  type="button"
                  onClick={() => toggleEstado(row)}
                  className="inline-flex items-center gap-1 border border-amber-300 px-2 py-1 text-xs text-amber-700 hover:bg-amber-50"
                >
                  {row.estado === 'activo' ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  type="button"
                  onClick={() => confirmDelete(row)}
                  className="inline-flex items-center gap-1 border border-rose-200 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Eliminar
                </button>
              </div>
            ),
          },
        ]}
        data={filtered}
        emptyMessage="No tienes agendas creadas."
      />

      <AdminModal
        open={modalOpen}
        title={mode === 'create' ? 'Crear agenda' : mode === 'edit' ? 'Editar agenda' : 'Detalle de agenda'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="inline-flex items-center gap-2 border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700"
            >
              {mode === 'view' ? 'Cerrar' : 'Cancelar'}
            </button>
            {mode !== 'view' ? (
              <button
                type="button"
                onClick={handleSubmit}
                className="inline-flex items-center gap-2 bg-sky-800 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-sky-900"
              >
                Guardar
              </button>
            ) : null}
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <AdminFormField
            label="Fecha"
            id="agenda-date"
            type="date"
            required
            disabled={mode === 'view'}
            value={form.date}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setForm((prev) => ({ ...prev, date: event.target.value }))
            }
          />
          <AdminFormField
            label="Duración por cita (min)"
            id="agenda-duration"
            type="number"
            required
            disabled={mode === 'view'}
            value={form.duration}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setForm((prev) => ({ ...prev, duration: event.target.value }))
            }
          />
          <AdminFormField
            label="Hora inicio"
            id="agenda-start"
            type="time"
            required
            disabled={mode === 'view'}
            value={form.startTime}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setForm((prev) => ({ ...prev, startTime: event.target.value }))
            }
          />
          <AdminFormField
            label="Hora fin"
            id="agenda-end"
            type="time"
            required
            disabled={mode === 'view'}
            value={form.endTime}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setForm((prev) => ({ ...prev, endTime: event.target.value }))
            }
          />
          <AdminFormField
            label="Estado"
            id="agenda-status"
            disabled={mode === 'view'}
            value={form.status}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              setForm((prev) => ({
                ...prev,
                status: event.target.value as FormState['status'],
              }))
            }
          >
            <option value="activo">Activa</option>
            <option value="inactivo">Inactiva</option>
          </AdminFormField>
        </div>
      </AdminModal>

      <ConfirmDeleteModal
        open={deleteOpen}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar agenda"
        description={`¿Eliminar la agenda del ${toDelete?.fecha_inicio ?? ''}? También se eliminarán sus cupos.`}
      />
    </div>
  )
}

export default MedicoAgendaModule
