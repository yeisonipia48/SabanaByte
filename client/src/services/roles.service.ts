import { API_CONFIG } from '../config/api'
import { httpClient } from '../lib/httpClient'
import type { RolApi } from '../types/api/auth'
import type { RolCreateSchema } from '../types/api/roles'

export type RolCreateApiRequest = RolCreateSchema

export const rolesService = {
  async getAll(): Promise<RolApi[]> {
    return httpClient.get<RolApi[]>(API_CONFIG.ENDPOINTS.ROLES.BASE)
  },

  async create(data: RolCreateApiRequest): Promise<RolApi> {
    return httpClient.post<RolApi>(API_CONFIG.ENDPOINTS.ROLES.BASE, data)
  },
}

export default rolesService
