export type Role = 'afiliado' | 'empresa' | 'medico'

export interface LoginPayload {
  role: Role
  documentType: string
  documentNumber: string
  password: string
  remember: boolean
}

export interface LoginResult {
  ok: boolean
  message: string
}
