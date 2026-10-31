import { useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Save, UserRound } from 'lucide-react'
import type { AuthUser } from '../auth/types'
import AdminFormField from '../administrador/components/AdminFormField'
import { usuariosService } from '../../services/usuarios.service'
import { pacientesService } from '../../services/pacientes.service'
import { medicosService } from '../../services/medicos.service'
import type { UsuarioResponseApi } from '../../types/api/usuarios'

interface PerfilModuleProps {
  user: AuthUser
  onUserUpdate: (user: AuthUser) => void
}

interface PerfilFormState {
  email: string
  nombres: string
  apellidos: string
  telefono: string
  direccion: string
  fechaNacimiento: string
  especialidad: string
  consultorio: string
  tarjetaProfesional: string
}

const emptyForm: PerfilFormState = {
  email: '',
  nombres: '',
  apellidos: '',
  telefono: '',
  direccion: '',
  fechaNacimiento: '',
  especialidad: '',
  consultorio: '',
  tarjetaProfesional: '',
}

function PerfilModule({ user, onUserUpdate }: PerfilModuleProps) {
  const [usuario, setUsuario] = useState<UsuarioResponseApi | null>(null)
  const [perfilId, setPerfilId] = useState<number | null>(null)
  const [form, setForm] = useState<PerfilFormState>(emptyForm)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadPerfil = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const numericId = Number(user.id)
      const u =
        Number.isFinite(numericId) && numericId > 0
          ? await usuariosService.getById(numericId).catch(() => null)
          : null
      setUsuario(u)

      const nextForm: PerfilFormState = {
        ...emptyForm,
        email: u?.email ?? user.email,
        nombres: '',
        apellidos: '',
      }

      if (user.role === 'Paciente') {
        const p =
          (user.profileId !== null
            ? await pacientesService.getById(user.profileId).catch(() => null)
            : null) ??
          (await pacientesService.getAll()).find(
            (x) => String(x.id_usuario) === user.id,
          ) ??
          null
        if (p) {
          setPerfilId(p.id)
          nextForm.nombres = p.nombres
          nextForm.apellidos = p.apellidos
          nextForm.telefono = p.telefono ?? ''
          nextForm.direccion = p.direccion ?? ''
          nextForm.fechaNacimiento = p.fecha_nacimiento ? p.fecha_nacimiento.slice(0, 10) : ''
        } else {
          setPerfilId(null)
        }
      } else if (user.role === 'Medico') {
        const m =
          (user.profileId !== null
            ? await medicosService.getById(user.profileId).catch(() => null)
            : null) ??
          (await medicosService.getAll()).find(
            (x) => String(x.id_usuario) === user.id,
          ) ??
          null
        if (m) {
          setPerfilId(m.id)
          nextForm.nombres = m.nombres
          nextForm.apellidos = m.apellidos
          nextForm.telefono = m.telefono ?? ''
          nextForm.especialidad = m.especialidad ?? ''
          nextForm.consultorio = m.consultorio ?? ''
          nextForm.tarjetaProfesional = m.tarjeta_profesional ?? ''
        } else {
          setPerfilId(null)
        }
      }

      setForm(nextForm)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar tu perfil.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadPerfil()
  }, [loadPerfil])

  const handleChange =
    (field: keyof PerfilFormState) => (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value
      setForm((prev) => ({ ...prev, [field]: value }))
    }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (!usuario) {
      setError('No se encontró tu usuario en el sistema.')
      return
    }

    const email = form.email.trim()
    if (!email) {
      setError('El correo electrónico es obligatorio.')
      return
    }

    setSaving(true)
    try {
      await usuariosService.update(usuario.id, { email })

      let fullName = user.fullName

      if (user.role === 'Paciente' && perfilId !== null) {
        await pacientesService.update(perfilId, {
          nombres: form.nombres.trim(),
          apellidos: form.apellidos.trim(),
          telefono: form.telefono.trim(),
          direccion: form.direccion.trim() || null,
          fecha_nacimiento: form.fechaNacimiento || null,
        })
        fullName = `${form.nombres.trim()} ${form.apellidos.trim()}`.trim() || user.fullName
      } else if (user.role === 'Medico' && perfilId !== null) {
        await medicosService.update(perfilId, {
          nombres: form.nombres.trim(),
          apellidos: form.apellidos.trim(),
          telefono: form.telefono.trim(),
          especialidad: form.especialidad.trim(),
          consultorio: form.consultorio.trim(),
          tarjeta_profesional: form.tarjetaProfesional.trim(),
        })
        fullName = `${form.nombres.trim()} ${form.apellidos.trim()}`.trim() || user.fullName
      }

      onUserUpdate({ ...user, email, fullName })
      setSuccess('Perfil actualizado correctamente.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar los cambios.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="border border-slate-200 bg-white px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center border border-slate-200 text-sky-700">
            <UserRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Mi perfil</h1>
            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
              Consulta y actualiza tus datos de contacto
            </p>
          </div>
        </div>
      </div>

      <div className="border border-slate-200 bg-white px-4 py-4 sm:px-6 sm:py-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-600">
          Datos de la cuenta
        </h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Nombre</dt>
            <dd className="mt-0.5 text-sm text-slate-900">{user.fullName}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Rol</dt>
            <dd className="mt-0.5 text-sm text-slate-900">{user.role}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Documento
            </dt>
            <dd className="mt-0.5 text-sm text-slate-900">
              {user.documentType} {user.documentNumber}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Usuario
            </dt>
            <dd className="mt-0.5 text-sm text-slate-900">{user.username}</dd>
          </div>
        </dl>
      </div>

      <form
        onSubmit={handleSubmit}
        className="border border-slate-200 bg-white px-4 py-4 sm:px-6 sm:py-5"
      >
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-600">
          Datos de contacto
        </h2>

        {loading ? (
          <p className="animate-fade-in mt-3 text-sm text-slate-500" role="status" aria-live="polite">Cargando información…</p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <AdminFormField
              label="Correo electrónico"
              id="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange('email')}
            />

            {user.role !== 'Administrador' ? (
              <>
                <AdminFormField
                  label="Nombres"
                  id="nombres"
                  required
                  value={form.nombres}
                  onChange={handleChange('nombres')}
                />
                <AdminFormField
                  label="Apellidos"
                  id="apellidos"
                  required
                  value={form.apellidos}
                  onChange={handleChange('apellidos')}
                />
                <AdminFormField
                  label="Teléfono"
                  id="telefono"
                  type="tel"
                  value={form.telefono}
                  onChange={handleChange('telefono')}
                />
              </>
            ) : null}

            {user.role === 'Paciente' ? (
              <>
                <AdminFormField
                  label="Fecha de nacimiento"
                  id="fechaNacimiento"
                  type="date"
                  value={form.fechaNacimiento}
                  onChange={handleChange('fechaNacimiento')}
                />
                <AdminFormField
                  label="Dirección"
                  id="direccion"
                  value={form.direccion}
                  onChange={handleChange('direccion')}
                />
              </>
            ) : null}

            {user.role === 'Medico' ? (
              <>
                <AdminFormField
                  label="Especialidad"
                  id="especialidad"
                  value={form.especialidad}
                  onChange={handleChange('especialidad')}
                />
                <AdminFormField
                  label="Consultorio"
                  id="consultorio"
                  value={form.consultorio}
                  onChange={handleChange('consultorio')}
                />
                <AdminFormField
                  label="Tarjeta profesional"
                  id="tarjetaProfesional"
                  value={form.tarjetaProfesional}
                  onChange={handleChange('tarjetaProfesional')}
                />
              </>
            ) : null}
          </div>
        )}

        {error ? (
          <p className="mt-3 border-l-4 border-rose-500 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="mt-3 border-l-4 border-emerald-500 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            {success}
          </p>
        ) : null}

        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={saving || loading}
            className="inline-flex items-center gap-2 border border-sky-700 bg-sky-700 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default PerfilModule
