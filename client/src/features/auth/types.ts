export type Role = 'Paciente' | 'Medico' | 'Administrador'

export interface LoginPayload {
  username?: string
  documentType?: string
  documentNumber: string
  password: string
  remember: boolean
}

export interface RegisterPayload {
  documentType: string
  documentNumber: string
  fullName: string
  email: string
  password: string
  confirmPassword: string
  remember: boolean
}

export interface AuthUser {
  id: string
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
