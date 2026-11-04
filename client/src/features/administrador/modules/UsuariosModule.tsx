import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { Edit, Eye, Trash2, UserCheck, UserX } from 'lucide-react'
import AdminToolbar from '../components/AdminToolbar'
import AdminDataTable from '../components/AdminDataTable'
import AdminModal from '../components/AdminModal'
import AdminFormField from '../components/AdminFormField'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import { adminService } from '../services/adminService'
import type { DocumentType, Especialidad, UsuarioAdmin } from '../types/admin'
import type { RolApi } from '../../../types/api/auth'
import { normalizeRole } from '../../../types/api/auth'

const DOCUMENT_TYPES: DocumentType[] = ['CC', 'TI', 'CE', 'PA']
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function roleIdFor(roleName: string, roles: RolApi[]): number {
  return (
    roles.find(
      (candidate) => normalizeRole(candidate.rol) === normalizeRole(roleName),
    )?.id ?? 0
  )
}

interface FormState {
  idRol: number
  documentType: DocumentType
  documentNumber: string
  email: string
  password: string
  isActive: boolean
  firstName: string
  lastName: string
  birthDate: string
  phone: string
  address: string
  tarjetaProfesional: string
  especialidad: string
  consultorio: string
}

const emptyForm: FormState = {
  idRol: 0,
  documentType: 'CC',
  documentNumber: '',
  email: '',
  password: '',
  isActive: true,
  firstName: '',
  lastName: '',
  birthDate: '',
  phone: '',
  address: '',
  tarjetaProfesional: '',
  especialidad: '',
  consultorio: '',
}

function UsuariosModule() {
  const [items, setItems] = useState<UsuarioAdmin[]>([])
  const [roles, setRoles] = useState<RolApi[]>([])
  const [especialidades] = useState<Especialidad[]>(() => adminService.getEspecialidades())
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

  const selectedRole = roles.find((role) => role.id === form.idRol)
  const roleKind = selectedRole ? normalizeRole(selectedRole.rol) : 'otro'

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
      ...emptyForm,
      idRol: roleIdFor(item.rol, roles),
      documentType: item.documentType,
      documentNumber: item.documentNumber,
      email: item.email,
      isActive: item.isActive,
    })
    setModalOpen(true)
  }

  const openView = (item: UsuarioAdmin) => {
    setMode('view')
    setSelected(item)
    setForm({
      ...emptyForm,
      idRol: roleIdFor(item.rol, roles),
      documentType: item.documentType,
      documentNumber: item.documentNumber,
      email: item.email,
      isActive: item.isActive,
    })
    setModalOpen(true)
  }

  const validateForm = (): string | null => {
    if (mode === 'create') {
      if (!form.documentNumber.trim()) return 'Ingresa el número de documento.'
      if (form.idRol <= 0) return 'Selecciona un rol válido.'
      if (!form.password.trim()) return 'Ingresa una contraseña.'
      if (form.password.length < 6) {
        return 'La contraseña debe tener al menos 6 caracteres.'
      }

      if (roleKind === 'paciente') {
        if (!form.firstName.trim() || !form.lastName.trim()) {
          return 'Ingresa nombres y apellidos del paciente.'
        }
        if (!form.birthDate) return 'Ingresa la fecha de nacimiento del paciente.'
        if (!form.phone.trim()) return 'Ingresa el teléfono del paciente.'
      }

      if (roleKind === 'medico') {
        if (!form.firstName.trim() || !form.lastName.trim()) {
          return 'Ingresa nombres y apellidos del médico.'
        }
        if (!form.phone.trim()) return 'Ingresa el teléfono del médico.'
        if (!form.tarjetaProfesional.trim()) {
          return 'Ingresa la tarjeta profesional del médico.'
        }
        if (!form.especialidad) return 'Selecciona la especialidad del médico.'
        if (!form.consultorio.trim()) return 'Ingresa el consultorio del médico.'
      }
    }

    if (!form.email.trim()) return 'Ingresa el correo electrónico.'
    if (!EMAIL_PATTERN.test(form.email.trim())) {
      return 'Ingresa un correo electrónico válido.'
    }

    return null
  }

  const handleSubmit = async () => {
    if (mode === 'view') {
      setModalOpen(false)
      return
    }

    const validation = validateForm()
    if (validation) {
      alert(validation)
      return
    }

    try {
      if (mode === 'create') {
        await adminService.addUsuario({
          id_rol: form.idRol,
          rol: selectedRole?.rol ?? '',
          tipo_documento: form.documentType,
          numero_documento: form.documentNumber,
          email: form.email,
          password: form.password,
          nombres: form.firstName,
          apellidos: form.lastName,
          fecha_nacimiento: form.birthDate,
          telefono: form.phone,
          direccion: form.address,
          tarjeta_profesional: form.tarjetaProfesional,
          especialidad: form.especialidad,
          consultorio: form.consultorio,
        })
        await loadUsuarios()
        setModalOpen(false)
        return
      }
      if (mode === 'edit' && selected) {
        await adminService.updateUsuario(selected.id, {
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
        <div className="loading-banner animate-fade-in border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300" role="status" aria-live="polite">
          Cargando usuarios desde la base de datos…
        </div>
      )}
      {error && (
        <div className="animate-fade-up border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300" role="alert">
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
              <span className="capitalize font-semibold text-slate-800 dark:text-slate-200">{row.rol}</span>
            ),
          },
          {
            header: 'Estado',
            render: (row: UsuarioAdmin) => (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium ${row.isActive ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300'
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
                  className="inline-flex items-center gap-1 border border-slate-300 dark:border-slate-700 px-2 py-1 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
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
              className="border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
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
            disabled={mode !== 'create'}
            value={String(form.idRol)}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              setForm((prev) => ({ ...prev, idRol: Number(event.target.value) }))
            }
          >
            <option value={0} disabled>
              Seleccionar rol
            </option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.rol}
              </option>
            ))}
          </AdminFormField>
          {mode === 'edit' ? (
            <div className="sm:col-span-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                El rol no se puede cambiar después de crear el usuario porque su perfil
                asociado quedaría incompleto.
              </p>
            </div>
          ) : null}
          {mode === 'create' && roleKind === 'paciente' ? (
            <>
              <AdminFormField
                label="Nombres"
                id="firstName"
                required
                value={form.firstName}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setForm((prev) => ({ ...prev, firstName: event.target.value }))
                }
              />
              <AdminFormField
                label="Apellidos"
                id="lastName"
                required
                value={form.lastName}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setForm((prev) => ({ ...prev, lastName: event.target.value }))
                }
              />
              <AdminFormField
                label="Fecha de nacimiento"
                id="birthDate"
                type="date"
                required
                value={form.birthDate}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setForm((prev) => ({ ...prev, birthDate: event.target.value }))
                }
              />
              <AdminFormField
                label="Teléfono"
                id="phone"
                type="tel"
                required
                value={form.phone}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setForm((prev) => ({ ...prev, phone: event.target.value }))
                }
              />
              <div className="sm:col-span-2">
                <AdminFormField
                  label="Dirección"
                  id="address"
                  value={form.address}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setForm((prev) => ({ ...prev, address: event.target.value }))
                  }
                />
              </div>
            </>
          ) : null}
          {mode === 'create' && roleKind === 'medico' ? (
            <>
              <AdminFormField
                label="Nombres"
                id="firstName"
                required
                value={form.firstName}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setForm((prev) => ({ ...prev, firstName: event.target.value }))
                }
              />
              <AdminFormField
                label="Apellidos"
                id="lastName"
                required
                value={form.lastName}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setForm((prev) => ({ ...prev, lastName: event.target.value }))
                }
              />
              <AdminFormField
                label="Teléfono"
                id="phone"
                type="tel"
                required
                value={form.phone}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setForm((prev) => ({ ...prev, phone: event.target.value }))
                }
              />
              <AdminFormField
                label="Tarjeta profesional"
                id="tarjetaProfesional"
                required
                value={form.tarjetaProfesional}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setForm((prev) => ({ ...prev, tarjetaProfesional: event.target.value }))
                }
              />
              <AdminFormField
                label="Especialidad"
                id="especialidad"
                required
                value={form.especialidad}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  setForm((prev) => ({ ...prev, especialidad: event.target.value }))
                }
              >
                <option value="">Seleccionar especialidad</option>
                {especialidades.map((especialidad) => (
                  <option key={especialidad.id} value={especialidad.name}>
                    {especialidad.name}
                  </option>
                ))}
              </AdminFormField>
              <AdminFormField
                label="Consultorio"
                id="consultorio"
                required
                value={form.consultorio}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setForm((prev) => ({ ...prev, consultorio: event.target.value }))
                }
              />
            </>
          ) : null}
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
