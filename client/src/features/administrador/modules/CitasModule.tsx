import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { Edit, Eye, Trash2 } from 'lucide-react'
import AdminToolbar from '../components/AdminToolbar'
import AdminDataTable from '../components/AdminDataTable'
import AdminModal from '../components/AdminModal'
import AdminFormField from '../components/AdminFormField'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import { adminService } from '../services/adminService'
import type { Cita, CitaEstado, Medico, Paciente } from '../types/admin'

const ESTADOS: CitaEstado[] = ['Programada', 'Atendida', 'Cancelada', 'No asistió']

interface FormState {
  patientId: string
  doctorId: string
  specialtyId: string
  date: string
  time: string
  status: CitaEstado
  motivoConsulta: string
}

const emptyForm: FormState = {
  patientId: '',
  doctorId: '',
  specialtyId: '',
  date: '',
  time: '',
  status: 'Programada',
  motivoConsulta: '',
}

function CitasModule() {
  const [items, setItems] = useState<Cita[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [medicos, setMedicos] = useState<Medico[]>([])
  const [especialidades] = useState(() => adminService.getEspecialidades())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [mode, setMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selected, setSelected] = useState<Cita | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [toDelete, setToDelete] = useState<Cita | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [citasData, pacData, medData] = await Promise.all([
        adminService.getCitas(),
        adminService.getPacientes(),
        adminService.getMedicos(),
      ])
      setItems(citasData)
      setPacientes(pacData)
      setMedicos(medData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar citas de la base de datos')
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
      const p = pacientes.find((x) => x.id === item.patientId)
      const m = medicos.find((x) => x.id === item.doctorId)
      return (
        p?.firstName.toLowerCase().includes(term) ||
        p?.lastName.toLowerCase().includes(term) ||
        m?.firstName.toLowerCase().includes(term) ||
        m?.lastName.toLowerCase().includes(term) ||
        item.date.includes(term) ||
        item.status.toLowerCase().includes(term)
      )
    })
  }, [items, pacientes, medicos, search])

  const getPaciente = (id: string) => {
    const p = pacientes.find((x) => x.id === id)
    return p ? `${p.firstName} ${p.lastName}` : `Paciente #${id}`
  }
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

  const openEdit = (item: Cita) => {
    setMode('edit')
    setSelected(item)
    setForm({
      patientId: item.patientId,
      doctorId: item.doctorId,
      specialtyId: item.specialtyId,
      date: item.date,
      time: item.time,
      status: item.status,
      motivoConsulta: item.motivoConsulta || '',
    })
    setModalOpen(true)
  }

  const openView = (item: Cita) => {
    setMode('view')
    setSelected(item)
    setForm({
      patientId: item.patientId,
      doctorId: item.doctorId,
      specialtyId: item.specialtyId,
      date: item.date,
      time: item.time,
      status: item.status,
      motivoConsulta: item.motivoConsulta || '',
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
        if (!form.patientId) {
          alert('Por favor selecciona un paciente.')
          return
        }
        if (!form.doctorId) {
          alert('Por favor selecciona un médico.')
          return
        }
        if (!form.date) {
          alert('Por favor selecciona la fecha de la cita.')
          return
        }
        await adminService.addCita(form)
        await loadData()
        setModalOpen(false)
        return
      }
      if (mode === 'edit' && selected) {
        await adminService.updateCita(selected.id, form)
        await loadData()
        setModalOpen(false)
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al guardar la cita en la base de datos')
    }
  }

  const confirmDelete = (item: Cita) => {
    setToDelete(item)
    setDeleteOpen(true)
  }

  const handleDelete = async () => {
    if (!toDelete) return
    try {
      await adminService.removeCita(toDelete.id)
      await loadData()
      setDeleteOpen(false)
      setToDelete(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al cancelar la cita en la base de datos')
    }
  }

  return (
    <div className="space-y-4">
      <AdminToolbar
        title="Citas"
        searchValue={search}
        onSearchChange={setSearch}
        onCreate={openCreate}
        createLabel="Crear cita"
      />
      {loading && (
        <div className="rounded border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700">
          Cargando citas y disponibilidad desde la base de datos...
        </div>
      )}
      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <AdminDataTable
        columns={[
          { header: 'Paciente', render: (row: Cita) => getPaciente(row.patientId) },
          { header: 'Médico', render: (row: Cita) => getMedico(row.doctorId) },
          { header: 'Especialidad', render: (row: Cita) => getEsp(row.specialtyId) },
          { header: 'Fecha', accessor: 'date' },
          { header: 'Hora', accessor: 'time' },
          { header: 'Estado', accessor: 'status' },
          {
            header: 'Acciones',
            render: (row: Cita) => (
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
                  Cancelar
                </button>
              </div>
            ),
          },
        ]}
        data={filtered}
        emptyMessage="No hay citas registradas."
      />

      <AdminModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          mode === 'create'
            ? 'Crear cita médica'
            : mode === 'edit'
              ? 'Editar estado de cita'
              : 'Detalle de la cita'
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
                Guardar cita
              </button>
            ) : null}
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <AdminFormField
            label="Paciente"
            id="patientId"
            required
            disabled={mode === 'view'}
            value={form.patientId}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              setForm((prev) => ({ ...prev, patientId: event.target.value }))
            }
          >
            <option value="">Seleccionar paciente</option>
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.firstName} {p.lastName} ({p.documentNumber})
              </option>
            ))}
          </AdminFormField>
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
            label="Fecha de la cita"
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
            label="Hora de la cita"
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
            label="Estado"
            id="status"
            required
            disabled={mode === 'view'}
            value={form.status}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              setForm((prev) => ({ ...prev, status: event.target.value as CitaEstado }))
            }
          >
            {ESTADOS.map((estado) => (
              <option key={estado} value={estado}>
                {estado}
              </option>
            ))}
          </AdminFormField>
          <div className="sm:col-span-2">
            <AdminFormField
              label="Motivo de consulta (opcional)"
              id="motivoConsulta"
              disabled={mode === 'view'}
              value={form.motivoConsulta}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setForm((prev) => ({ ...prev, motivoConsulta: event.target.value }))
              }
            />
          </div>
        </div>
      </AdminModal>

      <ConfirmDeleteModal
        open={deleteOpen}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Cancelar cita"
        description={`¿Estás seguro de que deseas cancelar la cita del paciente ${toDelete ? getPaciente(toDelete.patientId) : ''}? El cupo se liberará en el sistema.`}
      />
    </div>
  )
}

export default CitasModule
