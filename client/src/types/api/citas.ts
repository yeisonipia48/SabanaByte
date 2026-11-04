export interface CitaCreateApiRequest {
  id_cupo: number
  id_paciente: number
  motivo_consulta?: string | null
}

export interface CitaResponseApi {
  id: number
  id_cupo: number
  id_paciente: number
  motivo_consulta: string | null
  estado: string
  created_at: string
  updated_at: string
}

export interface CitaDetalleResponseApi extends CitaResponseApi {
  paciente: string
  numero_documento: string
  email: string
  id_medico: number
  medico: string
  especialidad: string
  consultorio: string
  fecha_cupo: string
  hora_cupo: string
}

export interface CitaEstadoUpdateApiRequest {
  estado: 'confirmada' | 'atendida' | 'no_asistio'
}

export interface OfertaCupoResponseApi {
  id_lista_espera: number
  id_paciente: number
  paciente: string
  id_cupo: number
  id_medico: number
  medico: string
  fecha_cupo: string
  hora_cupo: string
  fecha_expiracion: string
}

export interface CitaConOfertaResponseApi {
  cita: CitaResponseApi
  oferta: OfertaCupoResponseApi | null
}

export interface CitasQuery {
  id_paciente?: number | null
  id_medico?: number | null
  estado?: string | null
  fecha?: string | null
  fecha_inicio?: string | null
  fecha_fin?: string | null
}
