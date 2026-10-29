export interface ListaEsperaCreateApiRequest {
  id_paciente: number
  id_medico?: number | null
  prioridad?: number
}

export interface ListaEsperaResponseApi {
  id: number
  id_paciente: number
  id_medico: number | null
  prioridad: number
  id_cupo_ofrecido: number | null
  fecha_solicitud: string
  fecha_oferta: string | null
  fecha_expiracion: string | null
  estado: string
  created_at: string
}

export interface ListaEsperaDetalleResponseApi extends ListaEsperaResponseApi {
  paciente: string
  numero_documento: string
  email: string
  medico: string | null
  especialidad: string | null
  medico_ofrecido: string | null
  especialidad_ofrecida: string | null
  fecha_cupo: string | null
  hora_cupo: string | null
}

export interface ProcesarExpiradasResponseApi {
  ofertas_expiradas: number
  nuevas_ofertas: number
}

export interface ListaEsperaQuery {
  id_medico?: number | null
  estado?: string | null
}
