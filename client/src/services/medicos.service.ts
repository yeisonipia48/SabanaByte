import { API_CONFIG } from '../config/api'
import { httpClient } from '../lib/httpClient'
import type { MedicoCreateApiRequest, MedicoResponseApi, MedicoUpdateApiRequest } from '../types/api/medicos'

export const medicosService = {
  async getAll(): Promise<MedicoResponseApi[]> {
    return httpClient.get<MedicoResponseApi[]>(API_CONFIG.ENDPOINTS.MEDICOS.BASE)
  },

  async getById(id: number): Promise<MedicoResponseApi> {
    return httpClient.get<MedicoResponseApi>(API_CONFIG.ENDPOINTS.MEDICOS.BY_ID(id))
  },

  async create(data: MedicoCreateApiRequest): Promise<MedicoResponseApi> {
    return httpClient.post<MedicoResponseApi>(API_CONFIG.ENDPOINTS.MEDICOS.BASE, data)
  },

  async update(id: number, data: MedicoUpdateApiRequest): Promise<MedicoResponseApi> {
    return httpClient.patch<MedicoResponseApi>(API_CONFIG.ENDPOINTS.MEDICOS.BY_ID(id), data)
  },

  async remove(id: number): Promise<string> {
    return httpClient.delete<string>(API_CONFIG.ENDPOINTS.MEDICOS.BY_ID(id))
  },
}

export default medicosService
