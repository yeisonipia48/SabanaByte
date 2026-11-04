export type Role = 'Paciente' | 'Medico' | 'Administrador'

export interface LoginPayload {
  username?: string
  documentNumber: string
  password: string
  remember: boolean
}

export interface RegisterPayload {
  documentType: string
  documentNumber: string
  nombres: string
  apellidos: string
  email: string
  birthDate: string
  phone: string
  address?: string
  password: string
  remember: boolean
}

export interface AuthUser {
  id: string
  profileId: number | null
  fullName: string
  documentType: string
  documentNumber: string
  email: string
  role: Role
  username: string
}

export interface LoginResult {
  ok: boolean
  message: string
  user?: AuthUser
  token?: string
}

export interface RegisterResult {
  ok: boolean
  message: string
  user?: AuthUser
  token?: string
}
