import type { AuthUser, LoginPayload, LoginResult, RegisterPayload, RegisterResult } from './types'
import { API_CONFIG } from '../../config/api'
import { httpClient, HttpError } from '../../lib/httpClient'
import type { LoginApiRequest, MedicoApi, PacienteApi, RegistroUsuarioApiRequest, RolApi, UsuarioApi } from '../../types/api/auth'
import { mapRoleToFrontend } from '../../types/api/auth'

const SESSION_KEY = 'sabanaByte.session'

export interface SessionData {
  user: AuthUser
  token: string
  expiresAt: number
}

function createToken(role: string): string {
  return `sb-${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function createUsernameFromFullName(fullName: string): string {
  const normalized = fullName
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')

  if (!normalized) return `usuario${Date.now().toString().slice(-6)}`

  return normalized.length > 20 ? normalized.slice(0, 20) : normalized
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

  try {
    const loginRequest: LoginApiRequest = {
      numero_documento: documentNumber,
      password,
    }

    const loginOk = await httpClient.post<boolean>(API_CONFIG.ENDPOINTS.AUTH.LOGIN, loginRequest)

    if (!loginOk) {
      return {
        ok: false,
        message: 'Número de documento o contraseña incorrectos. Verifica tus credenciales.',
      }
    }

    // Get user information
    const usuarios = await httpClient.get<UsuarioApi[]>(API_CONFIG.ENDPOINTS.USUARIOS.BASE)
    const usuario = usuarios.find((u) => u.numero_documento === documentNumber)

    if (!usuario) {
      return {
        ok: false,
        message: 'No se encontró información del usuario. Intenta nuevamente.',
      }
    }

    // Try to get patient or doctor details for full name
    let fullName = ''
    try {
      const pacientes = await httpClient.get<PacienteApi[]>(API_CONFIG.ENDPOINTS.PACIENTES.BASE)
      const paciente = pacientes.find((p) => p.id_usuario === usuario.id || p.numero_documento === usuario.numero_documento)
      if (paciente) {
        fullName = `${paciente.nombres} ${paciente.apellidos}`.trim()
      }
    } catch {
      // ignore
    }

    if (!fullName) {
      try {
        const medicos = await httpClient.get<MedicoApi[]>(API_CONFIG.ENDPOINTS.MEDICOS.BASE)
        const medico = medicos.find((m) => m.id_usuario === usuario.id || m.numero_documento === usuario.numero_documento)
        if (medico) {
          fullName = `${medico.nombres} ${medico.apellidos}`.trim()
        }
      } catch {
        // ignore
      }
    }

    if (!fullName) {
      fullName = payload.username?.trim() || usuario.email || usuario.numero_documento
    }

    const role = mapRoleToFrontend(usuario.rol)
    const authUser: AuthUser = {
      id: String(usuario.id),
      fullName,
      documentType: usuario.tipo_documento,
      documentNumber: usuario.numero_documento,
      email: usuario.email,
      role,
      username: payload.username?.trim() || createUsernameFromFullName(fullName),
    }

    const token = createToken(role)

    return {
      ok: true,
      message: `Bienvenido(a) ${authUser.fullName}. Acceso correcto.`,
      user: authUser,
      token,
    }
  } catch (error) {
    if (error instanceof HttpError) {
      return {
        ok: false,
        message: error.message || 'Número de documento o contraseña incorrectos. Verifica tus credenciales.',
      }
    }
    return {
      ok: false,
      message: 'Error al iniciar sesión. Intenta nuevamente.',
    }
  }
}

export async function register(payload: RegisterPayload): Promise<RegisterResult> {
  const documentType = payload.documentType?.trim()
  const documentNumber = payload.documentNumber?.trim()
  const fullName = payload.fullName?.trim()
  const email = payload.email?.trim()
  const password = payload.password
  const confirmPassword = payload.confirmPassword

  if (!documentType || !documentNumber || !fullName || !email || !password || !confirmPassword) {
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

  if (password !== confirmPassword) {
    return {
      ok: false,
      message: 'Las contraseñas no coinciden. Verifica e intenta de nuevo.',
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
    // Get roles to find Paciente role id
    const roles = await httpClient.get<RolApi[]>(API_CONFIG.ENDPOINTS.ROLES.BASE)
    const pacienteRole = roles.find((r) => r.rol.trim().toLowerCase() === 'paciente')
    const idRol = pacienteRole?.id ?? 1

    const nameParts = fullName.split(/\s+/)
    const nombres = nameParts.slice(0, Math.ceil(nameParts.length / 2)).join(' ') || fullName
    const apellidos = nameParts.slice(Math.ceil(nameParts.length / 2)).join(' ') || ''

    const registerRequest: RegistroUsuarioApiRequest = {
      id_rol: idRol,
      tipo_documento: documentType,
      numero_documento: documentNumber,
      email,
      password,
      nombres,
      apellidos,
      fecha_nacimiento: null,
      telefono: null,
      direccion: null,
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
    if (error instanceof HttpError) {
      return {
        ok: false,
        message: error.message || 'No se pudo completar el registro. Intenta nuevamente.',
      }
    }
    return {
      ok: false,
      message: 'No se pudo completar el registro. Intenta nuevamente.',
    }
  }
}
