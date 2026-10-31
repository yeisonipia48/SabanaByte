import { API_CONFIG } from '../config/api'
import { httpClient } from '../lib/httpClient'
import type {
  CupoDetalleResponseApi,
  CupoDisponibleResponseApi,
  CupoResponseApi,
  CuposDisponiblesQuery,
  CupoUpdateApiRequest,
} from '../types/api/cupos'

export const cuposService = {
  async getDisponibles(params?: CuposDisponiblesQuery): Promise<CupoDisponibleResponseApi[]> {
    return httpClient.get<CupoDisponibleResponseApi[]>(
      API_CONFIG.ENDPOINTS.CUPOS.DISPONIBLES,
      { query: params as Record<string, unknown> | undefined },
    )
  },

  async getById(idCupo: number): Promise<CupoDetalleResponseApi> {
    return httpClient.get<CupoDetalleResponseApi>(API_CONFIG.ENDPOINTS.CUPOS.BY_ID(idCupo))
  },

  async updateEstado(idCupo: number, data: CupoUpdateApiRequest): Promise<CupoResponseApi> {
    return httpClient.patch<CupoResponseApi>(API_CONFIG.ENDPOINTS.CUPOS.BY_ID(idCupo), data)
  },
}

export default cuposService
