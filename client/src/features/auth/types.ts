export type Role = 'afiliado' | 'empresa' | 'medico'

export interface LoginPayload {

  documentType: string
  documentNumber: string
  password: string
  remember: boolean
}

export interface LoginResult {
  ok: boolean
  message: string
}
