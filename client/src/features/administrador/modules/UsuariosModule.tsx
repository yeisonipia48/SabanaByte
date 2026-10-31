import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { Edit, Eye, Trash2, UserCheck, UserX } from 'lucide-react'
import AdminToolbar from '../components/AdminToolbar'
import AdminDataTable from '../components/AdminDataTable'
import AdminModal from '../components/AdminModal'
import AdminFormField from '../components/AdminFormField'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import { adminService } from '../services/adminService'
import type { DocumentType, UsuarioAdmin } from '../types/admin'
import type { RolApi } from '../../../types/api/auth'
import { normalizeRole } from '../../../types/api/auth'

const DOCUMENT_TYPES: DocumentType[] = ['CC', 'TI', 'CE', 'PA']

function roleIdFor(roleName: string, roles: RolApi[]): number {
  return (
    roles.find(
      (candidate) => normalizeRole(candidate.rol) === normalizeRole(roleName),
    )?.id ?? roles[0]?.id ?? 0
  )
}

interface FormState {
  idRol: number
  documentType: DocumentType
  documentNumber: string
  email: string
  password: string
  isActive: boolean
}

const emptyForm: FormState = {
  idRol: 0,
  documentType: 'CC',
  documentNumber: '',
  email: '',
  password: '',
  isActive: true,
}

function UsuariosModule() {
  const [items, setItems] = useState<UsuarioAdmin[]>([])
  const [roles, setRoles] = useState<RolApi[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [mode, setMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selected, setSelected] = useState<UsuarioAdmin | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [toDelete, setToDelete] = useState<UsuarioAdmin | null>(null)

  const loadUsuarios = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [data, roleData] = await Promise.all([
        adminService.getUsuarios(),
        adminService.getRoles(),
      ])
      setItems(data)
      setRoles(roleData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar usuarios de la base de datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsuarios()
  }, [loadUsuarios])

  const filtered = useMemo(() => {
    const term = search.toLowerCase()
    if (!term) return items
    return items.filter((item) => {
      return (
        item.documentNumber.toLowerCase().includes(term) ||
        item.email.toLowerCase().includes(term) ||
        item.rol.toLowerCase().includes(term)
      )
    })
  }, [items, search])

  const openCreate = () => {
    setMode('create')
    setSelected(null)
    setForm({
      ...emptyForm,
      idRol: roleIdFor('paciente', roles),
    })
    setModalOpen(true)
  }

  const openEdit = (item: UsuarioAdmin) => {
    setMode('edit')
    setSelected(item)
    setForm({
      idRol: roleIdFor(item.rol, roles),
      documentType: item.documentType,
      documentNumber: item.documentNumber,
      email: item.email,
      password: '',
      isActive: item.isActive,
    })
    setModalOpen(true)
  }

  const openView = (item: UsuarioAdmin) => {
    setMode('view')
    setSelected(item)
    setForm({
      idRol: roleIdFor(item.rol, roles),
      documentType: item.documentType,
      documentNumber: item.documentNumber,
      email: item.email,
      password: '',
      isActive: item.isActive,
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
        if (!form.documentNumber.trim()) {
          alert('Ingresa el número de documento.')
          return
        }
        if (!form.email.trim()) {
          alert('Ingresa el correo electrónico.')
          return
        }
        if (form.idRol <= 0) {
          alert('Selecciona un rol válido.')
          return
        }
        if (!form.password.trim()) {
          alert('Ingresa una contraseña.')
          return
        }
        await adminService.addUsuario({
          id_rol: form.idRol,
          tipo_documento: form.documentType,
          numero_documento: form.documentNumber,
          email: form.email,
          password: form.password,
        })
        await loadUsuarios()
        setModalOpen(false)
        return
      }
      if (mode === 'edit' && selected) {
        await adminService.updateUsuario(selected.id, {
          id_rol: form.idRol,
          email: form.email,
          is_active: form.isActive,
        })
        await loadUsuarios()
        setModalOpen(false)
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al guardar el usuario en la base de datos')
    }
  }

  const confirmDelete = (item: UsuarioAdmin) => {
    setToDelete(item)
    setDeleteOpen(true)
  }

  const handleDelete = async () => {
    if (!toDelete) return
    try {
      await adminService.removeUsuario(toDelete.id)
      await loadUsuarios()
      setDeleteOpen(false)
      setToDelete(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar el usuario de la base de datos')
    }
  }

  return (
    <div className="space-y-4">
      <AdminToolbar
        title="Usuarios del Sistema"
        searchValue={search}
        onSearchChange={setSearch}
        onCreate={openCreate}
        createLabel="Crear usuario"
      />
      {loading && (
        <div className="loading-banner animate-fade-in rounded border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700" role="status" aria-live="polite">
          Cargando usuarios desde la base de datos…
        </div>
      )}
      {error && (
        <div className="animate-fade-up rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}
      <AdminDataTable
        loading={loading}
        columns={[
          {
            header: 'Documento',
            render: (row: UsuarioAdmin) => `${row.documentType} ${row.documentNumber}`,
          },
          { header: 'Correo', accessor: 'email' },
          {
            header: 'Rol',
            render: (row: UsuarioAdmin) => (
              <span className="capitalize font-semibold text-slate-800">{row.rol}</span>
            ),
          },
          {
            header: 'Estado',
            render: (row: UsuarioAdmin) => (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium ${row.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  }`}
              >
                {row.isActive ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                {row.isActive ? 'Activo' : 'Inactivo'}
              </span>
            ),
          },
          {
            header: 'Fecha Registro',
            render: (row: UsuarioAdmin) => row.createdAt?.slice(0, 10) ?? '-',
          },
          {
            header: 'Acciones',
            render: (row: UsuarioAdmin) => (
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
        emptyMessage="No hay usuarios registrados."
      />

      <AdminModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          mode === 'create'
            ? 'Crear usuario del sistema'
            : mode === 'edit'
              ? 'Editar usuario'
              : 'Detalle del usuario'
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
            disabled={mode !== 'create'}
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
            disabled={mode !== 'create'}
            value={form.documentNumber}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setForm((prev) => ({ ...prev, documentNumber: event.target.value }))
            }
          />
          <AdminFormField
            label="Correo electrónico"
            id="email"
            type="email"
            required
            disabled={mode === 'view'}
            value={form.email}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setForm((prev) => ({ ...prev, email: event.target.value }))
            }
          />
          {mode === 'create' && (
            <AdminFormField
              label="Contraseña"
              id="password"
              type="password"
              required
              value={form.password}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setForm((prev) => ({ ...prev, password: event.target.value }))
              }
            />
          )}
          <AdminFormField
            label="Rol del usuario"
            id="rol"
            required
            disabled={mode === 'view'}
            value={String(form.idRol)}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              setForm((prev) => ({ ...prev, idRol: Number(event.target.value) }))
            }
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.rol}
              </option>
            ))}
          </AdminFormField>
          {mode === 'edit' && (
            <AdminFormField
              label="Estado"
              id="isActive"
              value={form.isActive ? '1' : '0'}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                setForm((prev) => ({ ...prev, isActive: event.target.value === '1' }))
              }
            >
              <option value="1">Activo</option>
              <option value="0">Inactivo</option>
            </AdminFormField>
          )}
        </div>
      </AdminModal>

      <ConfirmDeleteModal
        open={deleteOpen}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar usuario"
        description={`¿Estás seguro de que deseas eliminar al usuario con documento ${toDelete ? toDelete.documentNumber : ''}?`}
      />
    </div>
  )
}

export default UsuariosModule
