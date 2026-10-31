import type { AuthUser, LoginPayload, LoginResult, RegisterPayload, RegisterResult } from './types'
import { API_CONFIG } from '../../config/api'
import { httpClient } from '../../lib/httpClient'
import { friendlyErrorMessage } from '../../lib/apiErrors'
import type { RegistroUsuarioApiRequest, RolApi } from '../../types/api/auth'
import { normalizeRole } from '../../types/api/auth'
import {
  attemptLogin,
  createUsernameFromFullName,
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

  if (!attempt.ok || !attempt.user) {
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
  const token = createToken(authUser.role)

  return {
    ok: true,
    message: `Bienvenido(a) ${authUser.fullName}. Acceso correcto.`,
    user: authUser,
    token,
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
    const roles = await httpClient.get<RolApi[]>(API_CONFIG.ENDPOINTS.ROLES.BASE)
    const pacienteRole = roles.find(
      (candidate) => normalizeRole(candidate.rol) === 'paciente',
    )

    if (!pacienteRole) {
      return {
        ok: false,
        message:
          'El registro en línea no está disponible en este momento. Comunícate con la clínica.',
      }
    }

    const registerRequest: RegistroUsuarioApiRequest = {
      id_rol: pacienteRole.id,
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

    if (loginResult.ok && loginResult.user) {
      return {
        ok: true,
        message: `Registro exitoso. Bienvenido(a) ${loginResult.user.fullName}. Tu cuenta ha sido creada como Paciente.`,
        user: loginResult.user,
        token: loginResult.token,
      }
    }

    // Fallback if auto-login fails
    const authUser: AuthUser = {
      id: documentNumber,
      profileId: null,
      fullName,
      documentType,
      documentNumber,
      email,
      role: 'Paciente',
      username: createUsernameFromFullName(fullName),
    }

    const token = createToken('Paciente')

    return {
      ok: true,
      message: `Registro exitoso. Bienvenido(a) ${fullName}. Tu cuenta ha sido creada como Paciente.`,
      user: authUser,
      token,
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
