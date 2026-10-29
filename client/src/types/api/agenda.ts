export interface AgendaCreateApiRequest {
  id_medico: number
  fecha_inicio: string
  fecha_fin: string
  duracion_cita: number
  hora_inicio: string
  hora_fin: string
}

export interface AgendaUpdateApiRequest {
  id_medico?: number | null
  fecha_inicio?: string | null
  fecha_fin?: string | null
  duracion_cita?: number | null
  hora_inicio?: string | null
  hora_fin?: string | null
  estado?: string | null
}

export interface AgendaCreateResponseApi {
  id: number
  id_medico: number
  fecha_inicio: string
  fecha_fin: string
  duracion_cita: number
  hora_inicio: string
  hora_fin: string
  estado: string
}

export interface AgendaResponseApi {
  id: number
  medico: string
  fecha_inicio: string
  fecha_fin: string
  duracion_cita: number
  hora_inicio: string
  hora_fin: string
  estado: string
}

export interface GenerarCuposResponseApi {
  agenda_id: number
  cupos_creados: number
  cupos_omitidos: number
}
