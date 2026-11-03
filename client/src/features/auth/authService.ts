import type { AuthUser, LoginPayload, LoginResult, RegisterPayload, RegisterResult } from './types'
import { API_CONFIG } from '../../config/api'
import { httpClient } from '../../lib/httpClient'
import { clearAuthToken, setAuthToken } from '../../lib/authToken'
import { friendlyErrorMessage } from '../../lib/apiErrors'
import type { RegistroUsuarioApiRequest } from '../../types/api/auth'
import {
  attemptLogin,
  isProfileKind,
  loadProfile,
  refreshUser,
  roleKindFromUser,
  toAuthUser,
} from './authApi'

const SESSION_KEY = 'sabanaByte.session'

export interface SessionData {
  user: AuthUser
  token: string
  expiresAt: number
}

export function saveSession(user: AuthUser, token: string, remember = false): SessionData {
  const expiresAt = remember
    ? Date.now() + 1000 * 60 * 60 * 24 * 7
    : Date.now() + 1000 * 60 * 60 * 8

  const session: SessionData = { user, token, expiresAt }
  setAuthToken(token)

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

    setAuthToken(parsed.token)
    return parsed
  } catch {
    return null
  }
}

export function clearSession(): void {
  clearAuthToken()

  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // Almacenamiento no disponible
  }
}

/**
 * Actualiza los datos del usuario en la sesión actual conservando token y expiración.
 */
export function updateSessionUser(user: AuthUser): SessionData | null {
  const session = getSession()
  if (!session) return null

  const updated: SessionData = { ...session, user }

  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(updated))
  } catch {
    // Almacenamiento no disponible
  }

  return updated
}

export function isAuthenticated(): boolean {
  return getSession() !== null
}

/**
 * Equivalente a refresh_user() + load_profile() de TestPhp. Refresca los datos
 * de la sesión sin cerrarla si la API falla.
 */
export async function restoreSession(): Promise<AuthUser | null> {
  const session = getSession()
  if (!session) return null

  const usuario = await refreshUser({
    id: session.user.id,
    documentNumber: session.user.documentNumber,
  })

  if (!usuario) {
    return session.user
  }

  const kind = roleKindFromUser(usuario)
  const profile = isProfileKind(kind) ? await loadProfile(usuario, kind) : null
  const user = toAuthUser(usuario, profile, session.user.username)

  try {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ ...session, user } satisfies SessionData),
    )
  } catch {
    // Almacenamiento no disponible
  }

  return user
}

/**
 * Autenticación contra API.
 */
export async function login(payload: LoginPayload): Promise<LoginResult> {
  const documentNumber = payload.documentNumber?.trim()
  const password = payload.password

  if (!documentNumber || !password) {
    return {
      ok: false,
      message: 'Ingresa tu número de documento y tu contraseña.',
    }
  }

  const attempt = await attemptLogin(documentNumber, password)

  if (!attempt.ok || !attempt.user || !attempt.token) {
    return {
      ok: false,
      message:
        attempt.message ??
        'Número de documento o contraseña incorrectos. Verifica tus credenciales.',
    }
  }

  const kind = roleKindFromUser(attempt.user)
  const profile = isProfileKind(kind)
    ? await loadProfile(attempt.user, kind)
    : null
  const authUser = toAuthUser(attempt.user, profile, payload.username)

  return {
    ok: true,
    message: `Bienvenido(a) ${authUser.fullName}. Acceso correcto.`,
    user: authUser,
    token: attempt.token,
  }
}

export async function register(payload: RegisterPayload): Promise<RegisterResult> {
  const documentType = payload.documentType?.trim()
  const documentNumber = payload.documentNumber?.trim()
  const nombres = payload.nombres?.trim()
  const apellidos = payload.apellidos?.trim()
  const email = payload.email?.trim()
  const birthDate = payload.birthDate?.trim()
  const phone = payload.phone?.trim()
  const address = payload.address?.trim() ?? ''
  const password = payload.password
  const fullName = `${nombres ?? ''} ${apellidos ?? ''}`.trim()

  if (
    !documentType ||
    !documentNumber ||
    !nombres ||
    !apellidos ||
    !email ||
    !birthDate ||
    !phone ||
    !password
  ) {
    return {
      ok: false,
      message: 'Completa todos los campos obligatorios para registrarte.',
    }
  }

  if (password.length < 6) {
    return {
      ok: false,
      message: 'La contraseña debe tener al menos 6 caracteres.',
    }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return {
      ok: false,
      message: 'Ingresa un correo electrónico válido.',
    }
  }

  try {
    const registerRequest: RegistroUsuarioApiRequest = {
      tipo_documento: documentType,
      numero_documento: documentNumber,
      email,
      password,
      nombres,
      apellidos,
      fecha_nacimiento: birthDate,
      telefono: phone,
      direccion: address !== '' ? address : null,
    }

    await httpClient.post(API_CONFIG.ENDPOINTS.AUTH.REGISTER, registerRequest)

    // Auto-login after registration
    const loginResult = await login({
      documentNumber,
      password,
      remember: payload.remember,
    })

    if (loginResult.ok && loginResult.user && loginResult.token) {
      return {
        ok: true,
        message: `Registro exitoso. Bienvenido(a) ${loginResult.user.fullName}. Tu cuenta ha sido creada como Paciente.`,
        user: loginResult.user,
        token: loginResult.token,
      }
    }

    return {
      ok: false,
      message: `Tu cuenta fue creada, ${fullName}, pero no pudimos iniciar sesión automáticamente. Ingresa con tu documento y contraseña.`,
    }
  } catch (error) {
    return {
      ok: false,
      message: friendlyErrorMessage(
        error,
        'No se pudo completar el registro. Intenta nuevamente.',
      ),
    }
  }
}
