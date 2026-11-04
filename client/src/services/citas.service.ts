import { API_CONFIG } from '../config/api'
import { httpClient } from '../lib/httpClient'
import type {
  CitaConOfertaResponseApi,
  CitaCreateApiRequest,
  CitaDetalleResponseApi,
  CitaEstadoUpdateApiRequest,
  CitaResponseApi,
  CitasQuery,
} from '../types/api/citas'

export const citasService = {
  async create(data: CitaCreateApiRequest): Promise<CitaResponseApi> {
    return httpClient.post<CitaResponseApi>(API_CONFIG.ENDPOINTS.CITAS.BASE, data)
  },

  async getAll(params?: CitasQuery): Promise<CitaDetalleResponseApi[]> {
    return httpClient.get<CitaDetalleResponseApi[]>(API_CONFIG.ENDPOINTS.CITAS.BASE, {
      query: params as Record<string, unknown> | undefined,
    })
  },

  async getById(idCita: number): Promise<CitaDetalleResponseApi> {
    return httpClient.get<CitaDetalleResponseApi>(API_CONFIG.ENDPOINTS.CITAS.BY_ID(idCita))
  },

  async cancelar(idCita: number): Promise<CitaConOfertaResponseApi> {
    return httpClient.patch<CitaConOfertaResponseApi>(API_CONFIG.ENDPOINTS.CITAS.CANCELAR(idCita))
  },

  async actualizarAsistencia(
    idCita: number,
    estado: 'confirmada' | 'atendida' | 'no_asistio',
  ): Promise<CitaConOfertaResponseApi> {
    const body: CitaEstadoUpdateApiRequest = { estado }
    return httpClient.patch<CitaConOfertaResponseApi>(API_CONFIG.ENDPOINTS.CITAS.ASISTENCIA(idCita), body)
  },

  async getJornadaMedico(idMedico: number, fecha: string): Promise<CitaDetalleResponseApi[]> {
    return httpClient.get<CitaDetalleResponseApi[]>(
      API_CONFIG.ENDPOINTS.CITAS.JORNADA_MEDICO(idMedico),
      { query: { fecha } },
    )
  },
}

export default citasService
