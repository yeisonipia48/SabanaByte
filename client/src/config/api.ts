const rawBaseUrl =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000'

const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '')

const rawTimeout = Number(import.meta.env.VITE_API_TIMEOUT)
const API_TIMEOUT_MS = Number.isFinite(rawTimeout) && rawTimeout > 0 ? rawTimeout : 20000

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  TIMEOUT_MS: API_TIMEOUT_MS,
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
      BASE: '/agenda',
      BY_MEDICO: (idMedico: number) => `/agenda/${idMedico}`,
      BY_ID: (id: number) => `/agenda/${id}`,
      GENERAR_CUPOS: (id: number) => `/agenda/${id}/generar-cupos`,
    },
    CUPOS: {
      DISPONIBLES: '/cupos/disponibles',
      BY_ID: (id: number) => `/cupos/${id}`,
    },
    CITAS: {
      BASE: '/citas',
      BY_ID: (id: number) => `/citas/${id}`,
      CANCELAR: (id: number) => `/citas/${id}/cancelar`,
      ASISTENCIA: (id: number) => `/citas/${id}/asistencia`,
      JORNADA_MEDICO: (idMedico: number) => `/medicos/${idMedico}/jornada`,
    },
    LISTA_ESPERA: {
      BASE: '/lista-espera',
      BY_ID: (id: number) => `/lista-espera/${id}`,
      PROCESAR_EXPIRADAS: '/lista-espera/procesar-expiradas',
      ACEPTAR: (id: number) => `/lista-espera/${id}/aceptar`,
      RECHAZAR: (id: number) => `/lista-espera/${id}/rechazar`,
    },
  },
} as const

export default API_CONFIG
