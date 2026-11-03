import { API_CONFIG } from '../config/api'
import { httpClient } from '../lib/httpClient'
import type {
  NotificacionApi,
  NotificacionesNoLeidasApi,
} from '../types/api/auth'

export const notificacionesService = {
  async getAll(soloNoLeidas = false): Promise<NotificacionApi[]> {
    return httpClient.get<NotificacionApi[]>(API_CONFIG.ENDPOINTS.NOTIFICACIONES.BASE, {
      query: soloNoLeidas ? { solo_no_leidas: true } : undefined,
    })
  },

  async contarNoLeidas(): Promise<NotificacionesNoLeidasApi> {
    return httpClient.get<NotificacionesNoLeidasApi>(
      API_CONFIG.ENDPOINTS.NOTIFICACIONES.NO_LEIDAS,
    )
  },

  async marcarLeida(id: number): Promise<NotificacionApi> {
    return httpClient.patch<NotificacionApi>(
      API_CONFIG.ENDPOINTS.NOTIFICACIONES.MARCAR_LEIDA(id),
    )
  },
}

export default notificacionesService
