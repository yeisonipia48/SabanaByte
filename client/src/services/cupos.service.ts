import { API_CONFIG } from '../config/api'
import { httpClient } from '../lib/httpClient'
import type {
  CupoDetalleResponseApi,
  CupoDisponibleResponseApi,
  CupoResponseApi,
  CuposDisponiblesQuery,
  CupoUpdateApiRequest,
} from '../types/api/cupos'

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

export const cuposService = {
  async getDisponibles(params?: CuposDisponiblesQuery): Promise<CupoDisponibleResponseApi[]> {
    const qs = buildQueryString(params as Record<string, unknown>)
    return httpClient.get<CupoDisponibleResponseApi[]>(`${API_CONFIG.ENDPOINTS.CUPOS.DISPONIBLES}${qs}`)
  },

  async getById(idCupo: number): Promise<CupoDetalleResponseApi> {
    return httpClient.get<CupoDetalleResponseApi>(API_CONFIG.ENDPOINTS.CUPOS.BY_ID(idCupo))
  },

  async updateEstado(idCupo: number, data: CupoUpdateApiRequest): Promise<CupoResponseApi> {
    return httpClient.patch<CupoResponseApi>(API_CONFIG.ENDPOINTS.CUPOS.BY_ID(idCupo), data)
  },
}

export default cuposService
