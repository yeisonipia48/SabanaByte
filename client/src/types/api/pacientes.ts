export interface PacienteCreateApiRequest {
  id_usuario: number
  nombres: string
  apellidos: string
  fecha_nacimiento: string
  telefono: string
  direccion?: string | null
}

export interface PacienteUpdateApiRequest {
  nombres?: string | null
  apellidos?: string | null
  fecha_nacimiento?: string | null
  telefono?: string | null
  direccion?: string | null
}

export interface PacienteResponseApi {
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

export interface PacienteCreadoResponseApi {
  id: number
  id_usuario: number
  nombres: string
  apellidos: string
  fecha_nacimiento: string
  telefono: string
  direccion: string | null
}
