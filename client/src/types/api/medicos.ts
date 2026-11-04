export interface MedicoCreateApiRequest {
  id_usuario: number
  nombres: string
  apellidos: string
  telefono: string
  tarjeta_profesional: string
  especialidad: string
  consultorio: string
}

export interface MedicoUpdateApiRequest {
  nombres?: string | null
  apellidos?: string | null
  telefono?: string | null
  tarjeta_profesional?: string | null
  especialidad?: string | null
  consultorio?: string | null
}

export interface MedicoResponseApi {
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

export interface MedicoCreadoResponseApi {
  id: number
  id_usuario: number
  nombres: string
  apellidos: string
  telefono: string
  tarjeta_profesional: string
  especialidad: string
  consultorio: string
}
