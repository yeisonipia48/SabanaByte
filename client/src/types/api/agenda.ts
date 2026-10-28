export interface AgendaCreateApiRequest {
  id_medico: number
  fecha_inicio: string
  fecha_fin: string
  duracion_cita: number
  hora_inicio: string
  hora_fin: string
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
