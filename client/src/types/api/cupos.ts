export interface CupoResponseApi {
  id: number
  id_agenda_medica: number
  fecha_cupo: string
  hora_cupo: string
  estado: string
}

export interface CupoDisponibleResponseApi {
  id_cupo: number
  fecha_cupo: string
  hora_cupo: string
  duracion_cita: number
  id_medico: number
  medico: string
  especialidad: string
  consultorio: string
}

export interface CupoDetalleResponseApi {
  id_cupo: number
  fecha_cupo: string
  hora_cupo: string
  estado_cupo: string
  duracion_cita: number
  estado_agenda: string
  id_medico: number
  medico: string
  especialidad: string
  consultorio: string
}

export interface CupoUpdateApiRequest {
  estado: string
}

export interface CuposDisponiblesQuery {
  especialidad?: string | null
  id_medico?: number | null
  fecha_inicio?: string | null
  fecha_fin?: string | null
}
