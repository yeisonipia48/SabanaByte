import type { AuthUser, LoginPayload, LoginResult } from './types'
import { findMockUser } from './mockUsers'

const SIMULATED_DELAY_MS = 900
const SESSION_KEY = 'sabanaByte.session'

export interface SessionData {
  user: AuthUser
  token: string
  expiresAt: number
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function createToken(role: string): string {
  return `sb-${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function saveSession(user: AuthUser, token: string, remember = false): SessionData {
  const expiresAt = remember
    ? Date.now() + 1000 * 60 * 60 * 24 * 7
    : Date.now() + 1000 * 60 * 60 * 8

  const session: SessionData = { user, token, expiresAt }

  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // Almacenamiento no disponible
  }

  return session
}

export function getSession(): SessionData | null {
  try {
    const stored = localStorage.getItem(SESSION_KEY)
    if (!stored) return null

    const parsed = JSON.parse(stored) as SessionData
    if (!parsed.user || !parsed.token || !parsed.expiresAt) return null
    if (Date.now() > parsed.expiresAt) {
      clearSession()
      return null
    }

    return parsed
  } catch {
    return null
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // Almacenamiento no disponible
  }
}

export function isAuthenticated(): boolean {
  return getSession() !== null
}

/**
 * Autenticación simulada.
 * Valida contra usuarios mock con credenciales por rol.
 * Punto de integración: reemplazar por petición HTTP real manteniendo la firma.
 */
export async function login(payload: LoginPayload): Promise<LoginResult> {
  await wait(SIMULATED_DELAY_MS)

  if (!payload.role) {
    return {
      ok: false,
      message: 'Selecciona un rol para continuar.',
    }
  }

  const username = payload.username?.trim()
  const documentNumber = payload.documentNumber?.trim()
  const password = payload.password

  if ((!username && !documentNumber) || !password) {
    return {
      ok: false,
      message: 'Ingresa tu usuario o documento y tu contraseña.',
    }
  }

  const user = findMockUser({
    username,
    documentNumber,
    password,
    role: payload.role,
  })

  if (!user) {
    return {
      ok: false,
      message: 'Usuario, contraseña o rol incorrectos. Verifica tus credenciales.',
    }
  }

  const authUser: AuthUser = {
    id: user.id,
    fullName: user.fullName,
    documentType: user.documentType,
    documentNumber: user.documentNumber,
    email: user.email,
    role: user.role,
    username: user.username,
  }

  const token = createToken(user.role)

  return {
    ok: true,
    message: `Bienvenido(a) ${user.fullName}. Acceso correcto.`,
    user: authUser,
    token,
  }
}
