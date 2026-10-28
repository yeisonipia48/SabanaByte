import { API_CONFIG } from '../config/api'
import { httpClient } from '../lib/httpClient'
import type {
  AgendaCreateApiRequest,
  AgendaCreateResponseApi,
  AgendaResponseApi,
  AgendaUpdateApiRequest,
  GenerarCuposResponseApi,
} from '../types/api/agenda'

export const agendaService = {
  async getByMedico(idMedico: number): Promise<AgendaResponseApi[]> {
    return httpClient.get<AgendaResponseApi[]>(API_CONFIG.ENDPOINTS.AGENDA.BY_MEDICO(idMedico))
  },

  async create(data: AgendaCreateApiRequest): Promise<AgendaCreateResponseApi> {
    return httpClient.post<AgendaCreateResponseApi>(API_CONFIG.ENDPOINTS.AGENDA.BASE, data)
  },

  async update(idAgenda: number, data: AgendaUpdateApiRequest): Promise<AgendaCreateResponseApi> {
    return httpClient.patch<AgendaCreateResponseApi>(API_CONFIG.ENDPOINTS.AGENDA.BY_ID(idAgenda), data)
  },

  async remove(idAgenda: number): Promise<string> {
    return httpClient.delete<string>(API_CONFIG.ENDPOINTS.AGENDA.BY_ID(idAgenda))
  },

  async generarCupos(idAgenda: number): Promise<GenerarCuposResponseApi> {
    return httpClient.post<GenerarCuposResponseApi>(API_CONFIG.ENDPOINTS.AGENDA.GENERAR_CUPOS(idAgenda))
  },
}

export default agendaService
