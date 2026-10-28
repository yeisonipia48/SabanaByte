const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000'

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/auth/login',
      REGISTER: '/auth/register',
    },
    USUARIOS: {
      BASE: '/usuarios',
      BY_ID: (id: number) => `/usuarios/${id}`,
    },
    ROLES: {
      BASE: '/roles',
    },
    PACIENTES: {
      BASE: '/pacientes',
      BY_ID: (id: number) => `/pacientes/${id}`,
    },
    MEDICOS: {
      BASE: '/medicos',
      BY_ID: (id: number) => `/medicos/${id}`,
    },
    AGENDA: {
      BY_MEDICO: (idMedico: number) => `/agenda/${idMedico}`,
      BASE: '/agenda',
    },
  },
} as const

export default API_CONFIG
