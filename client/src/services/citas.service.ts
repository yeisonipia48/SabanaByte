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

function buildQueryString(params?: Record<string, unknown>): string {
  if (!params) return ''
  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value))
    }
  }
  const qs = searchParams.toString()
  return qs ? `?${qs}` : ''
}

export const citasService = {
  async create(data: CitaCreateApiRequest): Promise<CitaResponseApi> {
    return httpClient.post<CitaResponseApi>(API_CONFIG.ENDPOINTS.CITAS.BASE, data)
  },

  async getAll(params?: CitasQuery): Promise<CitaDetalleResponseApi[]> {
    const qs = buildQueryString(params as Record<string, unknown>)
    return httpClient.get<CitaDetalleResponseApi[]>(`${API_CONFIG.ENDPOINTS.CITAS.BASE}${qs}`)
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
    const qs = buildQueryString({ fecha })
    return httpClient.get<CitaDetalleResponseApi[]>(`${API_CONFIG.ENDPOINTS.CITAS.JORNADA_MEDICO(idMedico)}${qs}`)
  },
}

export default citasService
