import { API_CONFIG } from '../config/api'
import { httpClient } from '../lib/httpClient'
import type { UsuarioCreateApiRequest, UsuarioResponseApi, UsuarioUpdateApiRequest } from '../types/api/usuarios'

export const usuariosService = {
  async getAll(): Promise<UsuarioResponseApi[]> {
    return httpClient.get<UsuarioResponseApi[]>(API_CONFIG.ENDPOINTS.USUARIOS.BASE)
  },

  async getById(id: number): Promise<UsuarioResponseApi> {
    return httpClient.get<UsuarioResponseApi>(API_CONFIG.ENDPOINTS.USUARIOS.BY_ID(id))
  },

  async create(data: UsuarioCreateApiRequest): Promise<UsuarioResponseApi> {
    return httpClient.post<UsuarioResponseApi>(API_CONFIG.ENDPOINTS.USUARIOS.BASE, data)
  },

  async update(id: number, data: UsuarioUpdateApiRequest): Promise<UsuarioResponseApi> {
    return httpClient.patch<UsuarioResponseApi>(API_CONFIG.ENDPOINTS.USUARIOS.BY_ID(id), data)
  },

  async remove(id: number): Promise<string> {
    return httpClient.delete<string>(API_CONFIG.ENDPOINTS.USUARIOS.BY_ID(id))
  },
}

export default usuariosService
