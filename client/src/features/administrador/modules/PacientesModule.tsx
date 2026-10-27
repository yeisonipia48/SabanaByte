import { useMemo, useState } from 'react'
import { Edit, Eye, Trash2 } from 'lucide-react'
import AdminToolbar from '../components/AdminToolbar'
import AdminDataTable from '../components/AdminDataTable'
import AdminModal from '../components/AdminModal'
import AdminFormField from '../components/AdminFormField'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import { adminService } from '../services/adminService'
import type { DocumentType, Paciente } from '../types/admin'

const DOCUMENT_TYPES: DocumentType[] = ['CC', 'TI', 'CE', 'PA']
const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

interface FormState {
  documentType: DocumentType
  documentNumber: string
  email: string
  password: string
  firstName: string
  lastName: string
  birthDate: string
  phone: string
  address: string
  eps: string
  bloodType: Paciente['bloodType']
}

const emptyForm: FormState = {
  documentType: 'CC',
  documentNumber: '',
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  birthDate: '',
  phone: '',
  address: '',
  eps: '',
  bloodType: 'O+',
}

function PacientesModule() {
  const [items, setItems] = useState<Paciente[]>(() => adminService.getPacientes())
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [mode, setMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selected, setSelected] = useState<Paciente | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [toDelete, setToDelete] = useState<Paciente | null>(null)

  const filtered = useMemo(() => {
    const term = search.toLowerCase()
    if (!term) return items
    return items.filter((item) => {
      return (
        item.firstName.toLowerCase().includes(term) ||
        item.lastName.toLowerCase().includes(term) ||
        item.documentNumber.toLowerCase().includes(term) ||
        item.email.toLowerCase().includes(term)
      )
    })
  }, [items, search])

  const openCreate = () => {
    setMode('create')
    setSelected(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (item: Paciente) => {
    setMode('edit')
    setSelected(item)
    setForm({
      documentType: item.documentType,
      documentNumber: item.documentNumber,
      email: item.email,
      password: '',
      firstName: item.firstName,
      lastName: item.lastName,
      birthDate: item.birthDate,
      phone: item.phone,
      address: item.address,
      eps: item.eps,
      bloodType: item.bloodType,
    })
    setModalOpen(true)
  }

  const openView = (item: Paciente) => {
    setMode('view')
    setSelected(item)
    setForm({
      documentType: item.documentType,
      documentNumber: item.documentNumber,
      email: item.email,
      password: item.password,
      firstName: item.firstName,
      lastName: item.lastName,
      birthDate: item.birthDate,
      phone: item.phone,
      address: item.address,
      eps: item.eps,
      bloodType: item.bloodType,
    })
    setModalOpen(true)
  }

  const handleSubmit = () => {
    if (mode === 'view') {
      setModalOpen(false)
      return
    }
    if (mode === 'create') {
      const created = adminService.addPaciente(form)
      setItems(adminService.getPacientes())
      setModalOpen(false)
      return
    }
    if (mode === 'edit' && selected) {
      const payload: Partial<Paciente> = { ...form }
      if (!payload.password) {
        delete payload.password
      }
      adminService.updatePaciente(selected.id, payload)
      setItems(adminService.getPacientes())
      setModalOpen(false)
    }
  }

  const confirmDelete = (item: Paciente) => {
    setToDelete(item)
    setDeleteOpen(true)
  }

  const handleDelete = () => {
    if (!toDelete) return
    adminService.removePaciente(toDelete.id)
    setItems(adminService.getPacientes())
    setDeleteOpen(false)
    setToDelete(null)
  }

  return (
    <div className="space-y-4">
      <AdminToolbar
        title="Pacientes"
        searchValue={search}
        onSearchChange={setSearch}
        onCreate={openCreate}
        createLabel="Crear paciente"
      />
      <AdminDataTable
        columns={[
          {
            header: 'Documento',
            render: (row: Paciente) => `${row.documentType} ${row.documentNumber}`,
          },
          { header: 'Nombres', accessor: 'firstName' },
          { header: 'Apellidos', accessor: 'lastName' },
          { header: 'Correo', accessor: 'email' },
          { header: 'Teléfono', accessor: 'phone' },
          { header: 'EPS', accessor: 'eps' },
          {
            header: 'Acciones',
            render: (row: Paciente) => (
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
        emptyMessage="No hay pacientes registrados"
      />

      <AdminModal
        open={modalOpen}
        title={
          mode === 'create'
            ? 'Crear paciente'
            : mode === 'edit'
              ? 'Editar paciente'
              : 'Ver paciente'
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
            label="Tipo de documento"
            id="docType"
            required
            disabled={mode === 'view'}
            value={form.documentType}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, documentType: event.target.value as DocumentType }))
            }
          >
            {DOCUMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </AdminFormField>
          <AdminFormField
            label="Número de documento"
            id="docNumber"
            required
            disabled={mode === 'view'}
            value={form.documentNumber}
            onChange={(event) => setForm((prev) => ({ ...prev, documentNumber: event.target.value }))}
          />
          <AdminFormField
            label="Correo electrónico"
            id="email"
            type="email"
            required
            disabled={mode === 'view'}
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
          />
          <AdminFormField
            label={mode === 'edit' ? 'Contraseña (opcional)' : 'Contraseña'}
            id="password"
            type="password"
            required={mode === 'create'}
            disabled={mode === 'view'}
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
          />
          <AdminFormField
            label="Nombres"
            id="firstName"
            required
            disabled={mode === 'view'}
            value={form.firstName}
            onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))}
          />
          <AdminFormField
            label="Apellidos"
            id="lastName"
            required
            disabled={mode === 'view'}
            value={form.lastName}
            onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))}
          />
          <AdminFormField
            label="Fecha de nacimiento"
            id="birthDate"
            type="date"
            required
            disabled={mode === 'view'}
            value={form.birthDate}
            onChange={(event) => setForm((prev) => ({ ...prev, birthDate: event.target.value }))}
          />
          <AdminFormField
            label="Teléfono"
            id="phone"
            required
            disabled={mode === 'view'}
            value={form.phone}
            onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
          />
          <AdminFormField
            label="Dirección"
            id="address"
            required
            disabled={mode === 'view'}
            value={form.address}
            onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
          />
          <AdminFormField
            label="EPS"
            id="eps"
            required
            disabled={mode === 'view'}
            value={form.eps}
            onChange={(event) => setForm((prev) => ({ ...prev, eps: event.target.value }))}
          />
          <AdminFormField
            label="Grupo sanguíneo"
            id="bloodType"
            required
            disabled={mode === 'view'}
            value={form.bloodType}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, bloodType: event.target.value as Paciente['bloodType'] }))
            }
          >
            {BLOOD_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </AdminFormField>
        </div>
      </AdminModal>

      <ConfirmDeleteModal
        open={deleteOpen}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        description={`¿Eliminar a ${toDelete?.firstName ?? ''} ${toDelete?.lastName ?? ''}?`}
      />
    </div>
  )
}

export default PacientesModule
