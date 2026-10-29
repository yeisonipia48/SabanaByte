import { useMemo, useState, type ChangeEvent } from 'react'
import { Edit, Eye, Trash2 } from 'lucide-react'
import AdminToolbar from '../components/AdminToolbar'
import AdminDataTable from '../components/AdminDataTable'
import AdminModal from '../components/AdminModal'
import AdminFormField from '../components/AdminFormField'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import { adminService } from '../services/adminService'
import type { Especialidad } from '../types/admin'

interface FormState {
  name: string
  description: string
}

const emptyForm: FormState = {
  name: '',
  description: '',
}

function EspecialidadesModule() {
  const [items, setItems] = useState<Especialidad[]>(() => adminService.getEspecialidades())
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [mode, setMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selected, setSelected] = useState<Especialidad | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [toDelete, setToDelete] = useState<Especialidad | null>(null)

  const filtered = useMemo(() => {
    const term = search.toLowerCase()
    if (!term) return items
    return items.filter((item) => {
      return item.name.toLowerCase().includes(term) || item.description.toLowerCase().includes(term)
    })
  }, [items, search])

  const openCreate = () => {
    setMode('create')
    setSelected(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (item: Especialidad) => {
    setMode('edit')
    setSelected(item)
    setForm({ name: item.name, description: item.description })
    setModalOpen(true)
  }

  const openView = (item: Especialidad) => {
    setMode('view')
    setSelected(item)
    setForm({ name: item.name, description: item.description })
    setModalOpen(true)
  }

  const handleSubmit = () => {
    if (mode === 'view') {
      setModalOpen(false)
      return
    }
    if (mode === 'create') {
      setItems((prev) => [
        ...prev,
        {
          id: `especialidad-${Date.now()}`,
          name: form.name.trim(),
          description: form.description.trim(),
        },
      ])
      setModalOpen(false)
      return
    }
    if (mode === 'edit' && selected) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === selected.id
            ? { ...item, name: form.name.trim(), description: form.description.trim() }
            : item,
        ),
      )
      setModalOpen(false)
    }
  }

  const confirmDelete = (item: Especialidad) => {
    setToDelete(item)
    setDeleteOpen(true)
  }

  const handleDelete = () => {
    if (!toDelete) return
    setItems((prev) => prev.filter((item) => item.id !== toDelete.id))
    setDeleteOpen(false)
    setToDelete(null)
  }

  return (
    <div className="space-y-4">
      <AdminToolbar
        title="Especialidades"
        searchValue={search}
        onSearchChange={setSearch}
        onCreate={openCreate}
        createLabel="Crear especialidad"
      />
      <AdminDataTable
        columns={[
          { header: 'Nombre', accessor: 'name' },
          { header: 'Descripción', accessor: 'description' },
          {
            header: 'Acciones',
            render: (row: Especialidad) => (
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
        emptyMessage="No hay especialidades registradas"
      />

      <AdminModal
        open={modalOpen}
        title={
          mode === 'create'
            ? 'Crear especialidad'
            : mode === 'edit'
              ? 'Editar especialidad'
              : 'Ver especialidad'
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
        <div className="grid gap-3">
          <AdminFormField
            label="Nombre de la especialidad"
            id="name"
            required
            disabled={mode === 'view'}
            value={form.name}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setForm((prev) => ({ ...prev, name: event.target.value }))
            }
          />
          <AdminFormField
            label="Descripción"
            id="description"
            required
            disabled={mode === 'view'}
            value={form.description}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setForm((prev) => ({ ...prev, description: event.target.value }))
            }
          />
        </div>
      </AdminModal>

      <ConfirmDeleteModal
        open={deleteOpen}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        description={`¿Eliminar la especialidad "${toDelete?.name ?? ''}"?`}
      />
    </div>
  )
}

export default EspecialidadesModule
