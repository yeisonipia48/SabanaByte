import type { Role } from '../../features/auth/types'

export interface LoginApiRequest {
  numero_documento: string
  password: string
}

export interface RegistroUsuarioApiRequest {
  id_rol: number
  tipo_documento: string
  numero_documento: string
  email: string
  password: string
  nombres?: string | null
  apellidos?: string | null
  fecha_nacimiento?: string | null
  telefono?: string | null
  direccion?: string | null
  tarjeta_profesional?: string | null
  especialidad?: string | null
  consultorio?: string | null
}

export interface RolApi {
  id: number
  rol: string
}

export interface UsuarioApi {
  id: number
  rol: string
  tipo_documento: string
  numero_documento: string
  email: string
  is_active: boolean
  created_at: string
}

export interface UsuarioCreadoApi {
  id: number
  id_rol: number
  tipo_documento: string
  numero_documento: string
  email: string
  is_active: boolean
  created_at: string
}

export interface PacienteApi {
  id: number
  id_usuario: number
  nombres: string
  apellidos: string
  fecha_nacimiento: string
  telefono: string
  numero_documento: string
  email: string
  direccion: string | null
}

export interface MedicoApi {
  id: number
  id_usuario: number
  nombres: string
  apellidos: string
  telefono: string
  numero_documento: string
  email: string
  tarjeta_profesional: string
  especialidad: string
  consultorio: string
}

export type RoleKind = 'admin' | 'medico' | 'paciente' | 'otro'

/**
 * Equivalente a normalize_role() de TestPhp/helpers.php.
 */
export function normalizeRole(roleName: string): RoleKind {
  const value = roleName
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  if (value === '') {
    return 'otro'
  }

  if (value.includes('admin')) {
    return 'admin'
  }

  if (value.includes('medic')) {
    return 'medico'
  }

  if (value.includes('pacient')) {
    return 'paciente'
  }

  return 'otro'
}

export function mapRoleToFrontend(roleName: string): Role {
  switch (normalizeRole(roleName)) {
    case 'medico':
      return 'Medico'
    case 'admin':
      return 'Administrador'
    default:
      return 'Paciente'
  }
}

export function mapFrontendRoleToId(role: Role, roles: RolApi[]): number | null {
  const kind = normalizeRole(role)
  const match = roles.find((candidate) => normalizeRole(candidate.rol) === kind)

  return match?.id ?? null
}
