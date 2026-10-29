export interface UsuarioCreateApiRequest {
  id_rol: number
  tipo_documento: string
  numero_documento: string
  email: string
  password: string
}

export interface UsuarioUpdateApiRequest {
  id_rol?: number | null
  tipo_documento?: string | null
  numero_documento?: string | null
  email?: string | null
  password?: string | null
  is_active?: boolean | null
}

export interface UsuarioResponseApi {
  id: number
  rol: string
  tipo_documento: string
  numero_documento: string
  email: string
  is_active: boolean
  created_at: string
}

export interface UsuarioCreadoResponseApi {
  id: number
  id_rol: number
  tipo_documento: string
  numero_documento: string
  email: string
  is_active: boolean
  created_at: string
}
