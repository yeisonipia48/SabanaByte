import { API_CONFIG } from '../config/api'
import { httpClient } from '../lib/httpClient'
import type { AgendaCreateApiRequest, AgendaCreateResponseApi, AgendaResponseApi } from '../types/api/agenda'

export const agendaService = {
  async getByMedico(idMedico: number): Promise<AgendaResponseApi[]> {
    return httpClient.get<AgendaResponseApi[]>(API_CONFIG.ENDPOINTS.AGENDA.BY_MEDICO(idMedico))
  },

  async create(data: AgendaCreateApiRequest): Promise<AgendaCreateResponseApi> {
    return httpClient.post<AgendaCreateResponseApi>(API_CONFIG.ENDPOINTS.AGENDA.BASE, data)
  },
}

export default agendaService
