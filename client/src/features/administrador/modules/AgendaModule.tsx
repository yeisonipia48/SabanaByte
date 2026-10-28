import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { Edit, Eye, Trash2 } from 'lucide-react'
import AdminToolbar from '../components/AdminToolbar'
import AdminDataTable from '../components/AdminDataTable'
import AdminModal from '../components/AdminModal'
import AdminFormField from '../components/AdminFormField'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import { adminService } from '../services/adminService'
import type { Agenda, AgendaEstado, Medico } from '../types/admin'

const ESTADOS: AgendaEstado[] = ['Disponible', 'Ocupado', 'Bloqueado']

interface FormState {
  doctorId: string
  specialtyId: string
  date: string
  time: string
  status: AgendaEstado
  duracionMinutos: number
}

const emptyForm: FormState = {
  doctorId: '',
  specialtyId: '',
  date: '',
  time: '',
  status: 'Disponible',
  duracionMinutos: 30,
}

function AgendaModule() {
  const [items, setItems] = useState<Agenda[]>([])
  const [medicos, setMedicos] = useState<Medico[]>([])
  const [especialidades] = useState(() => adminService.getEspecialidades())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [mode, setMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selected, setSelected] = useState<Agenda | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [toDelete, setToDelete] = useState<Agenda | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [agendaData, medicosData] = await Promise.all([
        adminService.getAgenda(),
        adminService.getMedicos(),
      ])
      setItems(agendaData)
      setMedicos(medicosData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar agendas médicas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filtered = useMemo(() => {
    const term = search.toLowerCase()
    if (!term) return items
    return items.filter((item) => {
      const m = medicos.find((x) => x.id === item.doctorId)
      return (
        m?.firstName.toLowerCase().includes(term) ||
        m?.lastName.toLowerCase().includes(term) ||
        item.date.includes(term) ||
        item.status.toLowerCase().includes(term)
      )
    })
  }, [items, medicos, search])

  const getMedico = (id: string) => {
    const m = medicos.find((x) => x.id === id)
    return m ? `${m.firstName} ${m.lastName}` : `Médico #${id}`
  }
  const getEsp = (id: string) => especialidades.find((x) => x.id === id)?.name ?? id

  const openCreate = () => {
    setMode('create')
    setSelected(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (item: Agenda) => {
    setMode('edit')
    setSelected(item)
    setForm({
      doctorId: item.doctorId,
      specialtyId: item.specialtyId,
      date: item.date,
      time: item.time,
      status: item.status,
      duracionMinutos: item.duracionMinutos || 30,
    })
    setModalOpen(true)
  }

  const openView = (item: Agenda) => {
    setMode('view')
    setSelected(item)
    setForm({
      doctorId: item.doctorId,
      specialtyId: item.specialtyId,
      date: item.date,
      time: item.time,
      status: item.status,
      duracionMinutos: item.duracionMinutos || 30,
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (mode === 'view') {
      setModalOpen(false)
      return
    }
    try {
      if (mode === 'create') {
        if (!form.doctorId) {
          alert('Por favor selecciona un médico.')
          return
        }
        if (!form.date) {
          alert('Por favor selecciona la fecha de la agenda.')
          return
        }
        await adminService.addAgenda(form)
        await loadData()
        setModalOpen(false)
        return
      }
      if (mode === 'edit' && selected) {
        await adminService.updateAgenda(selected.id, form)
        await loadData()
        setModalOpen(false)
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al guardar la agenda en la base de datos')
    }
  }

  const confirmDelete = (item: Agenda) => {
    setToDelete(item)
    setDeleteOpen(true)
  }

  const handleDelete = async () => {
    if (!toDelete) return
    try {
      await adminService.removeAgenda(toDelete.id)
      await loadData()
      setDeleteOpen(false)
      setToDelete(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar la agenda de la base de datos')
    }
  }

  return (
    <div className="space-y-4">
      <AdminToolbar
        title="Agenda Médica"
        searchValue={search}
        onSearchChange={setSearch}
        onCreate={openCreate}
        createLabel="Crear agenda"
      />
      {loading && (
        <div className="rounded border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700">
          Cargando agendas médicas y cupos desde la base de datos...
        </div>
      )}
      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <AdminDataTable
        columns={[
          { header: 'Médico', render: (row: Agenda) => getMedico(row.doctorId) },
          { header: 'Especialidad', render: (row: Agenda) => getEsp(row.specialtyId) },
          { header: 'Fecha', accessor: 'date' },
          { header: 'Hora inicio', accessor: 'time' },
          {
            header: 'Duración cita',
            render: (row: Agenda) => `${row.duracionMinutos || 30} min`,
          },
          { header: 'Estado', accessor: 'status' },
          {
            header: 'Acciones',
            render: (row: Agenda) => (
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => openView(row)}
                  className="inline-flex items-center gap-1 border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                >
                  <Eye className="h-3 w-3" />
                  Ver
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(row)}
                  className="inline-flex items-center gap-1 border border-sky-300 px-2 py-1 text-xs text-sky-700 hover:bg-sky-50"
                >
                  <Edit className="h-3 w-3" />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => confirmDelete(row)}
                  className="inline-flex items-center gap-1 border border-rose-300 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                >
                  <Trash2 className="h-3 w-3" />
                  Eliminar
                </button>
              </div>
            ),
          },
        ]}
        data={filtered}
        emptyMessage="No hay agendas médicas registradas."
      />

      <AdminModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          mode === 'create'
            ? 'Crear agenda médica'
            : mode === 'edit'
              ? 'Editar agenda médica'
              : 'Detalle de la agenda'
        }
        footer={
          <>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {mode === 'view' ? 'Cerrar' : 'Cancelar'}
            </button>
            {mode !== 'view' ? (
              <button
                type="button"
                onClick={handleSubmit}
                className="inline-flex items-center gap-2 bg-sky-800 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-sky-900"
              >
                Guardar y generar cupos
              </button>
            ) : null}
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <AdminFormField
            label="Médico"
            id="doctorId"
            required
            disabled={mode === 'view'}
            value={form.doctorId}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => {
              const doctorId = event.target.value
              const m = medicos.find((x) => x.id === doctorId)
              setForm((prev) => ({
                ...prev,
                doctorId,
                specialtyId: m?.specialtyId ?? prev.specialtyId,
              }))
            }}
          >
            <option value="">Seleccionar médico</option>
            {medicos.map((m) => (
              <option key={m.id} value={m.id}>
                {m.firstName} {m.lastName} ({m.specialtyId})
              </option>
            ))}
          </AdminFormField>
          <AdminFormField
            label="Especialidad"
            id="specialtyId"
            required
            disabled={mode === 'view'}
            value={form.specialtyId}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              setForm((prev) => ({ ...prev, specialtyId: event.target.value }))
            }
          >
            <option value="">Seleccionar especialidad</option>
            {especialidades.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </AdminFormField>
          <AdminFormField
            label="Fecha"
            id="date"
            type="date"
            required
            disabled={mode === 'view'}
            value={form.date}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setForm((prev) => ({ ...prev, date: event.target.value }))
            }
          />
          <AdminFormField
            label="Hora de inicio"
            id="time"
            type="time"
            required
            disabled={mode === 'view'}
            value={form.time}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setForm((prev) => ({ ...prev, time: event.target.value }))
            }
          />
          <AdminFormField
            label="Duración por cita (minutos)"
            id="duracionMinutos"
            type="number"
            required
            disabled={mode === 'view'}
            value={String(form.duracionMinutos || 30)}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setForm((prev) => ({ ...prev, duracionMinutos: Number(event.target.value) || 30 }))
            }
          />
          <AdminFormField
            label="Estado"
            id="status"
            required
            disabled={mode === 'view'}
            value={form.status}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              setForm((prev) => ({ ...prev, status: event.target.value as AgendaEstado }))
            }
          >
            {ESTADOS.map((estado) => (
              <option key={estado} value={estado}>
                {estado}
              </option>
            ))}
          </AdminFormField>
        </div>
      </AdminModal>

      <ConfirmDeleteModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar agenda médica"
        message={`¿Estás seguro de que deseas eliminar este espacio de agenda para el médico ${toDelete ? getMedico(toDelete.doctorId) : ''}?`}
      />
    </div>
  )
}

export default AgendaModule
