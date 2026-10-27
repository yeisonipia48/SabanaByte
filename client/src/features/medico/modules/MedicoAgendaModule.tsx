import { useMemo, useState, type ChangeEvent } from 'react'
import { Edit, Eye, Trash2 } from 'lucide-react'
import AdminToolbar from '../../administrador/components/AdminToolbar'
import AdminDataTable from '../../administrador/components/AdminDataTable'
import AdminModal from '../../administrador/components/AdminModal'
import AdminFormField from '../../administrador/components/AdminFormField'
import ConfirmDeleteModal from '../../administrador/components/ConfirmDeleteModal'
import { adminService } from '../../administrador/services/adminService'
import type { Agenda, AgendaEstado } from '../../administrador/types/admin'

const ESTADOS: AgendaEstado[] = ['Disponible', 'Ocupado', 'Bloqueado']

interface FormState {
  doctorId: string
  specialtyId: string
  date: string
  time: string
  status: AgendaEstado
}

const emptyForm: FormState = {
  doctorId: '',
  specialtyId: '',
  date: '',
  time: '',
  status: 'Disponible',
}

function MedicoAgendaModule() {
  const [items, setItems] = useState<Agenda[]>(() => adminService.getAgenda())
  const [medicos] = useState(() => adminService.getMedicos())
  const [especialidades] = useState(() => adminService.getEspecialidades())
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [mode, setMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selected, setSelected] = useState<Agenda | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [toDelete, setToDelete] = useState<Agenda | null>(null)

  const filtered = useMemo(() => {
    const term = search.toLowerCase()
    if (!term) return items
    return items.filter((item) => {
      const m = medicos.find((x) => x.id === item.doctorId)
      const e = especialidades.find((x) => x.id === item.specialtyId)
      return (
        (m?.firstName.toLowerCase().includes(term) ||
          m?.lastName.toLowerCase().includes(term) ||
          e?.name.toLowerCase().includes(term) ||
          item.date.toLowerCase().includes(term) ||
          item.time.toLowerCase().includes(term) ||
          item.status.toLowerCase().includes(term)) ??
        false
      )
    })
  }, [items, medicos, especialidades, search])

  const getMedico = (id: string) => {
    const m = medicos.find((x) => x.id === id)
    return m ? `${m.firstName} ${m.lastName}` : '-'
  }
  const getEsp = (id: string) => especialidades.find((x) => x.id === id)?.name ?? '-'

  const openCreate = () => {
    setMode('create')
    setSelected(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (item: Agenda) => {
    setMode('edit')
    setSelected(item)
    setForm({ ...item })
    setModalOpen(true)
  }

  const openView = (item: Agenda) => {
    setMode('view')
    setSelected(item)
    setForm({ ...item })
    setModalOpen(true)
  }

  const handleSubmit = () => {
    if (mode === 'view') {
      setModalOpen(false)
      return
    }
    if (mode === 'create') {
      const result = adminService.addAgenda(form)
      if (!result) {
        alert('Ya existe un espacio en agenda para este médico, fecha y hora.')
        return
      }
      setItems(adminService.getAgenda())
      setModalOpen(false)
      return
    }
    if (mode === 'edit' && selected) {
      adminService.updateAgenda(selected.id, form)
      setItems(adminService.getAgenda())
      setModalOpen(false)
    }
  }

  const confirmDelete = (item: Agenda) => {
    setToDelete(item)
    setDeleteOpen(true)
  }

  const handleDelete = () => {
    if (!toDelete) return
    adminService.removeAgenda(toDelete.id)
    setItems(adminService.getAgenda())
    setDeleteOpen(false)
    setToDelete(null)
  }

  return (
    <div className="space-y-4">
      <AdminToolbar
        title="Agenda"
        searchValue={search}
        onSearchChange={setSearch}
        onCreate={openCreate}
        createLabel="Crear agenda"
      />
      <AdminDataTable
        columns={[
          { header: 'Médico', render: (row: Agenda) => getMedico(row.doctorId) },
          { header: 'Especialidad', render: (row: Agenda) => getEsp(row.specialtyId) },
          { header: 'Fecha', accessor: 'date' },
          { header: 'Hora', accessor: 'time' },
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
        emptyMessage="No hay espacios de agenda registrados"
      />

      <AdminModal
        open={modalOpen}
        title={mode === 'create' ? 'Crear agenda' : mode === 'edit' ? 'Editar agenda' : 'Ver agenda'}
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
            label="Médico"
            id="doctorId"
            required
            disabled={mode === 'view'}
            value={form.doctorId}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => {
              const doctorId = event.target.value
              const m = medicos.find((x) => x.id === doctorId)
              setForm((prev) => ({ ...prev, doctorId, specialtyId: m?.specialtyId ?? prev.specialtyId }))
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
            onChange={(event: ChangeEvent<HTMLSelectElement>) => setForm((prev) => ({ ...prev, status: event.target.value as AgendaEstado }))}
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
        description="¿Eliminar este espacio de agenda?"
      />
    </div>
  )
}

export default MedicoAgendaModule
