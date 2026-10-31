import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from 'react'
import { Edit, Eye, Trash2 } from 'lucide-react'
import AdminToolbar from '../components/AdminToolbar'
import AdminDataTable from '../components/AdminDataTable'
import AdminModal from '../components/AdminModal'
import AdminFormField from '../components/AdminFormField'
import AdminFeedback, { type AdminFeedbackType } from '../components/AdminFeedback'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import { adminService } from '../services/adminService'
import { friendlyErrorMessage } from '../../../lib/apiErrors'
import type { DocumentType, Medico } from '../types/admin'

const DOCUMENT_TYPES: DocumentType[] = ['CC', 'TI', 'CE', 'PA']

interface FormState {
  documentType: DocumentType
  documentNumber: string
  email: string
  password: string
  firstName: string
  lastName: string
  specialtyId: string
  phone: string
  tarjetaProfesional: string
  consultorio: string
}

const emptyForm: FormState = {
  documentType: 'CC',
  documentNumber: '',
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  specialtyId: '',
  phone: '',
  tarjetaProfesional: '',
  consultorio: '',
}

function MedicosModule() {
  const [items, setItems] = useState<Medico[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [especialidades] = useState(() => adminService.getEspecialidades())
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [mode, setMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selected, setSelected] = useState<Medico | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [toDelete, setToDelete] = useState<Medico | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: AdminFeedbackType; message: string } | null>(null)
  const deferredSearch = useDeferredValue(search)

  const loadMedicos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminService.getMedicos()
      setItems(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar médicos de la base de datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMedicos()
  }, [loadMedicos])

  useEffect(() => {
    if (feedback?.type !== 'success') return
    const timeout = setTimeout(() => setFeedback(null), 4000)
    return () => clearTimeout(timeout)
  }, [feedback])

  const filtered = useMemo(() => {
    const term = deferredSearch.toLowerCase()
    if (!term) return items
    return items.filter((item) => {
      return (
        item.firstName.toLowerCase().includes(term) ||
        item.lastName.toLowerCase().includes(term) ||
        item.documentNumber.toLowerCase().includes(term) ||
        item.email.toLowerCase().includes(term) ||
        item.specialtyId.toLowerCase().includes(term)
      )
    })
  }, [items, deferredSearch])

  const getSpecialtyName = (id: string) =>
    especialidades.find((e) => e.id === id)?.name ?? id

  const openCreate = () => {
    setMode('create')
    setSelected(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (item: Medico) => {
    setMode('edit')
    setSelected(item)
    setForm({
      documentType: item.documentType,
      documentNumber: item.documentNumber,
      email: item.email,
      password: '',
      firstName: item.firstName,
      lastName: item.lastName,
      specialtyId: item.specialtyId,
      phone: item.phone || '',
      tarjetaProfesional: item.tarjetaProfesional || '',
      consultorio: item.consultorio || '',
    })
    setModalOpen(true)
  }

  const openView = (item: Medico) => {
    setMode('view')
    setSelected(item)
    setForm({
      documentType: item.documentType,
      documentNumber: item.documentNumber,
      email: item.email,
      password: item.password || '',
      firstName: item.firstName,
      lastName: item.lastName,
      specialtyId: item.specialtyId,
      phone: item.phone || '',
      tarjetaProfesional: item.tarjetaProfesional || '',
      consultorio: item.consultorio || '',
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (mode === 'view' || saving) {
      setModalOpen(false)
      return
    }

    setSaving(true)
    setFeedback(null)

    try {
      if (mode === 'create') {
        const created = await adminService.addMedico(form)
        setItems((previous) => [created, ...previous])
        setModalOpen(false)
        setFeedback({ type: 'success', message: 'Médico creado correctamente.' })
        return
      }

      if (mode === 'edit' && selected) {
        const payload: Partial<Medico> = { ...form }
        if (!payload.password) delete payload.password
        await adminService.updateMedico(selected.id, payload)
        const updated: Medico = {
          ...selected,
          documentType: form.documentType,
          documentNumber: form.documentNumber,
          email: form.email,
          firstName: form.firstName,
          lastName: form.lastName,
          specialtyId: form.specialtyId,
          phone: form.phone,
          tarjetaProfesional: form.tarjetaProfesional,
          consultorio: form.consultorio,
        }
        setItems((previous) =>
          previous.map((item) => (item.id === selected.id ? updated : item)),
        )
        setModalOpen(false)
        setFeedback({ type: 'success', message: 'Médico actualizado correctamente.' })
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: friendlyErrorMessage(err, 'No pudimos guardar el médico. Intenta de nuevo.'),
      })
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = (item: Medico) => {
    setDeleteError(null)
    setToDelete(item)
    setDeleteOpen(true)
  }

  const closeDelete = () => {
    if (deleting) return
    setDeleteOpen(false)
    setToDelete(null)
    setDeleteError(null)
  }

  const handleDelete = async () => {
    if (!toDelete || deleting) return

    const target = toDelete
    setDeleting(true)
    setDeleteError(null)
    setItems((previous) => previous.filter((item) => item.id !== target.id))

    try {
      await adminService.removeMedico(target.id)
      setDeleteOpen(false)
      setToDelete(null)
      setFeedback({
        type: 'success',
        message: `Médico ${target.firstName} ${target.lastName} eliminado.`,
      })
    } catch (err) {
      setItems((previous) => [target, ...previous])
      setDeleteError(
        friendlyErrorMessage(err, 'No pudimos eliminar el médico. Intenta de nuevo.'),
      )
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <AdminToolbar
        title="Médicos"
        searchValue={search}
        onSearchChange={setSearch}
        onCreate={openCreate}
        createLabel="Crear médico"
      />
      {loading && (
        <div className="loading-banner animate-fade-in rounded border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700" role="status" aria-live="polite">
          Cargando médicos desde la base de datos…
        </div>
      )}
      {error && (
        <div className="animate-fade-up rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}
      {feedback ? (
        <AdminFeedback
          type={feedback.type}
          message={feedback.message}
          onDismiss={() => setFeedback(null)}
        />
      ) : null}
      <AdminDataTable
        loading={loading}
        getRowKey={(row) => row.id}
        columns={[
          {
            header: 'Documento',
            render: (row: Medico) => `${row.documentType} ${row.documentNumber}`,
          },
          { header: 'Nombres', accessor: 'firstName' },
          { header: 'Apellidos', accessor: 'lastName' },
          { header: 'Correo', accessor: 'email' },
          { header: 'Teléfono', accessor: 'phone' },
          {
            header: 'Especialidad',
            render: (row: Medico) => getSpecialtyName(row.specialtyId),
          },
          { header: 'T. Profesional', accessor: 'tarjetaProfesional' },
          { header: 'Consultorio', accessor: 'consultorio' },
          {
            header: 'Acciones',
            render: (row: Medico) => (
              <div className="flex flex-wrap items-center gap-1">
                <button
                  type="button"
                  onClick={() => openView(row)}
                  className="inline-flex items-center gap-1 border border-slate-300 px-2 py-1 text-xs text-slate-700 transition-colors hover:bg-slate-50 active:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Eye className="h-3 w-3" aria-hidden="true" />
                  Ver
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(row)}
                  className="inline-flex items-center gap-1 border border-sky-300 px-2 py-1 text-xs text-sky-700 transition-colors hover:bg-sky-50 active:bg-sky-100 dark:border-sky-900/60 dark:text-sky-300 dark:hover:bg-sky-950/40"
                >
                  <Edit className="h-3 w-3" aria-hidden="true" />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => confirmDelete(row)}
                  className="inline-flex items-center gap-1 border border-rose-300 px-2 py-1 text-xs text-rose-700 transition-colors hover:bg-rose-50 active:bg-rose-100 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/40"
                >
                  <Trash2 className="h-3 w-3" aria-hidden="true" />
                  Eliminar
                </button>
              </div>
            ),
          },
        ]}
        data={filtered}
        emptyMessage="No hay médicos registrados."
      />

      <AdminModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          mode === 'create'
            ? 'Crear médico'
            : mode === 'edit'
              ? 'Editar médico'
              : 'Detalle del médico'
        }
        footer={
          <>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cerrar
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
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
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
            onChange={(event: ChangeEvent<HTMLInputElement>) => setForm((prev) => ({ ...prev, documentNumber: event.target.value }))}
          />
          <AdminFormField
            label="Correo electrónico"
            id="email"
            type="email"
            required
            disabled={mode === 'view'}
            value={form.email}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setForm((prev) => ({ ...prev, email: event.target.value }))}
          />
          <AdminFormField
            label={mode === 'edit' ? 'Contraseña (opcional)' : 'Contraseña'}
            id="password"
            type="password"
            required={mode === 'create'}
            disabled={mode === 'view'}
            value={form.password}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setForm((prev) => ({ ...prev, password: event.target.value }))}
          />
          <AdminFormField
            label="Nombres"
            id="firstName"
            required
            disabled={mode === 'view'}
            value={form.firstName}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setForm((prev) => ({ ...prev, firstName: event.target.value }))}
          />
          <AdminFormField
            label="Apellidos"
            id="lastName"
            required
            disabled={mode === 'view'}
            value={form.lastName}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setForm((prev) => ({ ...prev, lastName: event.target.value }))}
          />
          <AdminFormField
            label="Teléfono"
            id="phone"
            required
            disabled={mode === 'view'}
            value={form.phone}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
          />
          <AdminFormField
            label="Especialidad"
            id="specialtyId"
            required
            disabled={mode === 'view'}
            value={form.specialtyId}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => setForm((prev) => ({ ...prev, specialtyId: event.target.value }))}
          >
            <option value="">Seleccionar especialidad</option>
            {especialidades.map((esp) => (
              <option key={esp.id} value={esp.id}>
                {esp.name}
              </option>
            ))}
          </AdminFormField>
          <AdminFormField
            label="Tarjeta Profesional"
            id="tarjetaProfesional"
            required
            disabled={mode === 'view'}
            value={form.tarjetaProfesional}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setForm((prev) => ({ ...prev, tarjetaProfesional: event.target.value }))}
          />
          <AdminFormField
            label="Consultorio"
            id="consultorio"
            required
            disabled={mode === 'view'}
            value={form.consultorio}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setForm((prev) => ({ ...prev, consultorio: event.target.value }))}
          />
        </div>
      </AdminModal>

      <ConfirmDeleteModal
        open={deleteOpen}
        onCancel={closeDelete}
        onConfirm={handleDelete}
        title="Eliminar médico"
        description={`¿Estás seguro de que deseas eliminar al médico ${toDelete ? `${toDelete.firstName} ${toDelete.lastName}` : ''}?`}
        error={deleteError}
        loading={deleting}
      />
    </div>
  )
}

export default MedicosModule