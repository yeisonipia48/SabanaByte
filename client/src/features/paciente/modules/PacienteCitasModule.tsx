import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { Edit, Eye, Trash2 } from 'lucide-react'
import AdminToolbar from '../../administrador/components/AdminToolbar'
import AdminDataTable from '../../administrador/components/AdminDataTable'
import AdminModal from '../../administrador/components/AdminModal'
import AdminFormField from '../../administrador/components/AdminFormField'
import ConfirmDeleteModal from '../../administrador/components/ConfirmDeleteModal'
import { adminService } from '../../administrador/services/adminService'
import type { Cita, CitaEstado, Medico, Paciente } from '../../administrador/types/admin'

const ESTADOS: CitaEstado[] = ['Programada', 'Atendida', 'Cancelada', 'No asistió']

interface FormState {
  patientId: string
  doctorId: string
  specialtyId: string
  date: string
  time: string
  status: CitaEstado
}

const emptyForm: FormState = {
  patientId: '',
  doctorId: '',
  specialtyId: '',
  date: '',
  time: '',
  status: 'Programada',
}

function PacienteCitasModule() {
  const [items, setItems] = useState<Cita[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [medicos, setMedicos] = useState<Medico[]>([])
  const [especialidades] = useState(() => adminService.getEspecialidades())
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [mode, setMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selected, setSelected] = useState<Cita | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [toDelete, setToDelete] = useState<Cita | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
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
      console.error(err)
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
      const e = especialidades.find((x) => x.id === item.specialtyId)
      return (
        (p?.firstName.toLowerCase().includes(term) ||
          p?.lastName.toLowerCase().includes(term) ||
          m?.firstName.toLowerCase().includes(term) ||
          m?.lastName.toLowerCase().includes(term) ||
          e?.name.toLowerCase().includes(term) ||
          item.date.toLowerCase().includes(term) ||
          item.time.toLowerCase().includes(term) ||
          item.status.toLowerCase().includes(term)) ??
        false
      )
    })
  }, [items, pacientes, medicos, especialidades, search])

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
    setForm({ ...item })
    setModalOpen(true)
  }

  const openView = (item: Cita) => {
    setMode('view')
    setSelected(item)
    setForm({ ...item })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (mode === 'view') {
      setModalOpen(false)
      return
    }
    try {
      if (mode === 'create') {
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
      alert(err instanceof Error ? err.message : 'Error al guardar cita')
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
      alert(err instanceof Error ? err.message : 'Error al cancelar cita')
    }
  }

  return (
    <div className="space-y-4">
      <AdminToolbar
        title="Mis Citas"
        searchValue={search}
        onSearchChange={setSearch}
        onCreate={openCreate}
        createLabel="Crear cita"
      />
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
        emptyMessage="No hay citas registradas"
      />

      <AdminModal
        open={modalOpen}
        title={mode === 'create' ? 'Crear cita' : mode === 'edit' ? 'Editar cita' : 'Ver cita'}
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
            label="Paciente"
            id="patientId"
            required
            disabled={mode === 'view'}
            value={form.patientId}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => setForm((prev) => ({ ...prev, patientId: event.target.value }))}
          >
            <option value="">Seleccionar</option>
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.firstName} {p.lastName}
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
            <option value="">Seleccionar</option>
            {medicos.map((m) => (
              <option key={m.id} value={m.id}>
                {m.firstName} {m.lastName}
              </option>
            ))}
          </AdminFormField>
          <AdminFormField
            label="Especialidad"
            id="specialtyId"
            required
            disabled={mode === 'view'}
            value={form.specialtyId}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => setForm((prev) => ({ ...prev, specialtyId: event.target.value }))}
          >
            <option value="">Seleccionar</option>
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
            onChange={(event: ChangeEvent<HTMLInputElement>) => setForm((prev) => ({ ...prev, date: event.target.value }))}
          />
          <AdminFormField
            label="Hora"
            id="time"
            type="time"
            required
            disabled={mode === 'view'}
            value={form.time}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setForm((prev) => ({ ...prev, time: event.target.value }))}
          />
          <AdminFormField
            label="Estado"
            id="status"
            required
            disabled={mode === 'view'}
            value={form.status}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => setForm((prev) => ({ ...prev, status: event.target.value as CitaEstado }))}
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
        open={deleteOpen}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        description="¿Eliminar esta cita?"
      />
    </div>
  )
}

export default PacienteCitasModule
