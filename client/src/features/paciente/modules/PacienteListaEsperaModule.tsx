import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { Edit, Eye, Trash2 } from 'lucide-react'
import AdminToolbar from '../../administrador/components/AdminToolbar'
import AdminDataTable from '../../administrador/components/AdminDataTable'
import AdminModal from '../../administrador/components/AdminModal'
import AdminFormField from '../../administrador/components/AdminFormField'
import ConfirmDeleteModal from '../../administrador/components/ConfirmDeleteModal'
import { adminService } from '../../administrador/services/adminService'
import type { Especialidad, ListaEspera, ListaEsperaEstado, Medico, Paciente } from '../../administrador/types/admin'

const ESTADOS: ListaEsperaEstado[] = ['En espera', 'Atendido', 'Cancelado']

interface FormState {
  patientId: string
  doctorId: string
  specialtyId: string
  date: string
  time: string
  status: ListaEsperaEstado
}

const emptyForm: FormState = {
  patientId: '',
  doctorId: '',
  specialtyId: '',
  date: '',
  time: '',
  status: 'En espera',
}

function PacienteListaEsperaModule() {
  const [items, setItems] = useState<ListaEspera[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [medicos, setMedicos] = useState<Medico[]>([])
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([])
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [mode, setMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selected, setSelected] = useState<ListaEspera | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [toDelete, setToDelete] = useState<ListaEspera | null>(null)

  const loadData = useCallback(async () => {
    const [esperaData, pacData, medData] = await Promise.all([
      adminService.getListaEspera(),
      adminService.getPacientes(),
      adminService.getMedicos(),
    ])
    setItems(esperaData)
    setPacientes(pacData)
    setMedicos(medData)
    setEspecialidades(adminService.getEspecialidades())
  }, [])

  useEffect(() => {
    loadData().catch(() => {
      setItems([])
      setPacientes([])
      setMedicos([])
    })
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
    return p ? `${p.firstName} ${p.lastName}` : '-'
  }
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

  const openEdit = (item: ListaEspera) => {
    setMode('edit')
    setSelected(item)
    setForm({ ...item })
    setModalOpen(true)
  }

  const openView = (item: ListaEspera) => {
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
        await adminService.addListaEspera(form)
        await loadData()
        setModalOpen(false)
        return
      }
      if (mode === 'edit' && selected) {
        await adminService.updateListaEspera(selected.id, form)
        await loadData()
        setModalOpen(false)
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo guardar la solicitud.')
    }
  }

  const confirmDelete = (item: ListaEspera) => {
    setToDelete(item)
    setDeleteOpen(true)
  }

  const handleDelete = async () => {
    if (!toDelete) return
    try {
      await adminService.removeListaEspera(toDelete.id)
      await loadData()
      setDeleteOpen(false)
      setToDelete(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo cancelar la solicitud.')
    }
  }

  return (
    <div className="space-y-4">
      <AdminToolbar
        title="Lista de Espera"
        searchValue={search}
        onSearchChange={setSearch}
        onCreate={openCreate}
        createLabel="Crear registro"
      />
      <AdminDataTable
        columns={[
          { header: 'Paciente', render: (row: ListaEspera) => getPaciente(row.patientId) },
          { header: 'Médico', render: (row: ListaEspera) => getMedico(row.doctorId) },
          { header: 'Especialidad', render: (row: ListaEspera) => getEsp(row.specialtyId) },
          { header: 'Fecha', accessor: 'date' },
          { header: 'Hora', accessor: 'time' },
          { header: 'Estado', accessor: 'status' },
          {
            header: 'Acciones',
            render: (row: ListaEspera) => (
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
        emptyMessage="No hay registros en lista de espera"
      />

      <AdminModal
        open={modalOpen}
        title={
          mode === 'create'
            ? 'Crear lista de espera'
            : mode === 'edit'
              ? 'Editar lista de espera'
              : 'Ver lista de espera'
        }
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
            onChange={(event: ChangeEvent<HTMLSelectElement>) => setForm((prev) => ({ ...prev, status: event.target.value as ListaEsperaEstado }))}
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
        description="¿Eliminar este registro de lista de espera?"
      />
    </div>
  )
}

export default PacienteListaEsperaModule
