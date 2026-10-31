import { API_CONFIG } from '../../config/api'
import { httpClient } from '../../lib/httpClient'
import { friendlyErrorMessage } from '../../lib/apiErrors'
import type { AuthUser } from './types'
import type {
  LoginApiRequest,
  MedicoApi,
  PacienteApi,
  RoleKind,
  UsuarioApi,
} from '../../types/api/auth'
import { mapRoleToFrontend, normalizeRole } from '../../types/api/auth'

export type ProfileKind = Extract<RoleKind, 'paciente' | 'medico'>

export interface AttemptLoginResult {
  ok: boolean
  message?: string
  user?: UsuarioApi
}

export function createUsernameFromFullName(fullName: string): string {
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

export function isProfileKind(kind: RoleKind): kind is ProfileKind {
  return kind === 'paciente' || kind === 'medico'
}

/**
 * Equivalente a attempt_login() de TestPhp/helpers.php.
 */
export async function attemptLogin(
  document: string,
  password: string,
): Promise<AttemptLoginResult> {
  try {
    const loginRequest: LoginApiRequest = {
      numero_documento: document,
      password,
    }

    const loginOk = await httpClient.post<boolean>(
      API_CONFIG.ENDPOINTS.AUTH.LOGIN,
      loginRequest,
    )

    if (loginOk !== true) {
      return {
        ok: false,
        message: 'Documento o contraseña incorrectos.',
      }
    }

    const usuarios = await httpClient.get<UsuarioApi[]>(
      API_CONFIG.ENDPOINTS.USUARIOS.BASE,
    )
    const user = usuarios.find(
      (candidate) => candidate.numero_documento === document,
    )

    if (!user) {
      return {
        ok: false,
        message: 'No se pudo cargar el usuario autenticado. Intenta de nuevo.',
      }
    }

    return { ok: true, user }
  } catch (error) {
    return { ok: false, message: friendlyErrorMessage(error) }
  }
}

/**
 * Equivalente a refresh_user() de TestPhp/helpers.php. Devuelve null si la API
 * falla para que el llamador conserve los datos cacheados.
 */
export async function refreshUser(current: {
  id?: string
  documentNumber?: string
}): Promise<UsuarioApi | null> {
  const id = Number(current.id ?? 0)

  if (Number.isFinite(id) && id > 0) {
    try {
      return await httpClient.get<UsuarioApi>(
        API_CONFIG.ENDPOINTS.USUARIOS.BY_ID(id),
      )
    } catch {
      // Fallback por documento
    }
  }

  const document = current.documentNumber ?? ''
  if (document !== '') {
    try {
      const usuarios = await httpClient.get<UsuarioApi[]>(
        API_CONFIG.ENDPOINTS.USUARIOS.BASE,
      )

      return (
        usuarios.find(
          (candidate) => candidate.numero_documento === document,
        ) ?? null
      )
    } catch {
      // La API no está disponible
    }
  }

  return null
}

/**
 * Equivalente a load_profile() de TestPhp/helpers.php.
 */
export async function loadProfile(
  user: UsuarioApi,
  kind: ProfileKind,
): Promise<PacienteApi | MedicoApi | null> {
  const id = Number(user.id)

  if (!Number.isFinite(id) || id <= 0) {
    return null
  }

  try {
    if (kind === 'medico') {
      const medicos = await httpClient.get<MedicoApi[]>(
        API_CONFIG.ENDPOINTS.MEDICOS.BASE,
      )

      return medicos.find((profile) => profile.id_usuario === id) ?? null
    }

    const pacientes = await httpClient.get<PacienteApi[]>(
      API_CONFIG.ENDPOINTS.PACIENTES.BASE,
    )

    return pacientes.find((profile) => profile.id_usuario === id) ?? null
  } catch {
    return null
  }
}

function profileFullName(
  profile: PacienteApi | MedicoApi | null,
): string {
  if (!profile) return ''

  return `${profile.nombres ?? ''} ${profile.apellidos ?? ''}`.trim()
}

export function toAuthUser(
  usuario: UsuarioApi,
  profile: PacienteApi | MedicoApi | null = null,
  username?: string,
): AuthUser {
  const role = mapRoleToFrontend(usuario.rol)
  const fullName =
    profileFullName(profile) ||
    username?.trim() ||
    usuario.email ||
    usuario.numero_documento

  return {
    id: String(usuario.id),
    profileId: profile?.id ?? null,
    fullName,
    documentType: usuario.tipo_documento,
    documentNumber: usuario.numero_documento,
    email: usuario.email,
    role,
    username: username?.trim() || createUsernameFromFullName(fullName),
  }
}

export function roleKindFromUser(usuario: UsuarioApi): RoleKind {
  return normalizeRole(usuario.rol)
}
