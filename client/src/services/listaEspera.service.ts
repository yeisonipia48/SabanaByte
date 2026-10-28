import { API_CONFIG } from '../config/api'
import { httpClient } from '../lib/httpClient'
import type { CitaResponseApi } from '../types/api/citas'
import type {
  ListaEsperaCreateApiRequest,
  ListaEsperaDetalleResponseApi,
  ListaEsperaQuery,
  ListaEsperaResponseApi,
  ProcesarExpiradasResponseApi,
} from '../types/api/listaEspera'

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

export const listaEsperaService = {
  async create(data: ListaEsperaCreateApiRequest): Promise<ListaEsperaResponseApi> {
    return httpClient.post<ListaEsperaResponseApi>(API_CONFIG.ENDPOINTS.LISTA_ESPERA.BASE, data)
  },

  async getAll(params?: ListaEsperaQuery): Promise<ListaEsperaDetalleResponseApi[]> {
    const qs = buildQueryString(params as Record<string, unknown>)
    return httpClient.get<ListaEsperaDetalleResponseApi[]>(`${API_CONFIG.ENDPOINTS.LISTA_ESPERA.BASE}${qs}`)
  },

  async getById(idEntrada: number): Promise<ListaEsperaDetalleResponseApi> {
    return httpClient.get<ListaEsperaDetalleResponseApi>(API_CONFIG.ENDPOINTS.LISTA_ESPERA.BY_ID(idEntrada))
  },

  async cancelar(idEntrada: number): Promise<ListaEsperaResponseApi> {
    return httpClient.delete<ListaEsperaResponseApi>(API_CONFIG.ENDPOINTS.LISTA_ESPERA.BY_ID(idEntrada))
  },

  async procesarExpiradas(): Promise<ProcesarExpiradasResponseApi> {
    return httpClient.post<ProcesarExpiradasResponseApi>(API_CONFIG.ENDPOINTS.LISTA_ESPERA.PROCESAR_EXPIRADAS)
  },

  async aceptarOferta(idEntrada: number): Promise<CitaResponseApi> {
    return httpClient.post<CitaResponseApi>(API_CONFIG.ENDPOINTS.LISTA_ESPERA.ACEPTAR(idEntrada))
  },

  async rechazarOferta(idEntrada: number): Promise<ListaEsperaResponseApi> {
    return httpClient.post<ListaEsperaResponseApi>(API_CONFIG.ENDPOINTS.LISTA_ESPERA.RECHAZAR(idEntrada))
  },
}

export default listaEsperaService
