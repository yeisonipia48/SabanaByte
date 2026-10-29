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

export function mapRoleToFrontend(roleName: string): Role {
  const normalized = roleName.trim().toLowerCase()
  if (normalized === 'medico' || normalized === 'médico') {
    return 'Medico'
  }
  if (normalized === 'administrador' || normalized === 'admin') {
    return 'Administrador'
  }
  // Default to Paciente for paciente/other
  return 'Paciente'
}

export function mapFrontendRoleToId(role: Role, roles: RolApi[]): number | null {
  const normalizedRole = role.toLowerCase()
  const match = roles.find((r) => r.rol.trim().toLowerCase() === normalizedRole)
  return match?.id ?? null
}
