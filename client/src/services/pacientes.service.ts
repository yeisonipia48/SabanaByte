import { API_CONFIG } from '../config/api'
import { httpClient } from '../lib/httpClient'
import type { PacienteCreateApiRequest, PacienteResponseApi, PacienteUpdateApiRequest } from '../types/api/pacientes'

export const pacientesService = {
  async getAll(): Promise<PacienteResponseApi[]> {
    return httpClient.get<PacienteResponseApi[]>(API_CONFIG.ENDPOINTS.PACIENTES.BASE)
  },

  async getById(id: number): Promise<PacienteResponseApi> {
    return httpClient.get<PacienteResponseApi>(API_CONFIG.ENDPOINTS.PACIENTES.BY_ID(id))
  },

  async create(data: PacienteCreateApiRequest): Promise<PacienteResponseApi> {
    return httpClient.post<PacienteResponseApi>(API_CONFIG.ENDPOINTS.PACIENTES.BASE, data)
  },

  async update(id: number, data: PacienteUpdateApiRequest): Promise<PacienteResponseApi> {
    return httpClient.patch<PacienteResponseApi>(API_CONFIG.ENDPOINTS.PACIENTES.BY_ID(id), data)
  },

  async remove(id: number): Promise<string> {
    return httpClient.delete<string>(API_CONFIG.ENDPOINTS.PACIENTES.BY_ID(id))
  },
}

export default pacientesService
