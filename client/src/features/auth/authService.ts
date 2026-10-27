import type { AuthUser, LoginPayload, LoginResult, RegisterPayload, RegisterResult } from './types'
import { findMockUser, MOCK_USERS, type MockUser } from './mockUsers'

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

function createUsernameFromFullName(fullName: string): string {
  const normalized = fullName
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')

  if (!normalized) return `paciente${Date.now().toString().slice(-6)}`

  return normalized.length > 20 ? normalized.slice(0, 20) : normalized
}

function generatePatientId(): string {
  const existingPatientIds = MOCK_USERS.filter((user) => user.role === 'Paciente').map(
    (user) => user.id,
  )
  let counter = existingPatientIds.length + 1
  let candidate = `pac-${String(counter).padStart(3, '0')}`

  while (MOCK_USERS.some((user) => user.id === candidate)) {
    counter += 1
    candidate = `pac-${String(counter).padStart(3, '0')}`
  }

  return candidate
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
 * Valida contra usuarios mock por número de documento y contraseña.
 * El rol se infiere desde el registro del usuario.
 * Punto de integración: reemplazar por petición HTTP real manteniendo la firma.
 */
export async function login(payload: LoginPayload): Promise<LoginResult> {
  await wait(SIMULATED_DELAY_MS)

  const username = payload.username?.trim()
  const documentNumber = payload.documentNumber?.trim()
  const password = payload.password

  if (!documentNumber || !password) {
    return {
      ok: false,
      message: 'Ingresa tu número de documento y tu contraseña.',
    }
  }

  const user = findMockUser({
    username,
    documentNumber,
    password,
  })

  if (!user) {
    return {
      ok: false,
      message: 'Número de documento o contraseña incorrectos. Verifica tus credenciales.',
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

export async function register(payload: RegisterPayload): Promise<RegisterResult> {
  await wait(SIMULATED_DELAY_MS)

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

  const documentExists = MOCK_USERS.some(
    (user) => user.documentType === documentType && user.documentNumber === documentNumber,
  )

  if (documentExists) {
    return {
      ok: false,
      message: 'Ya existe una cuenta registrada con este tipo y número de documento.',
    }
  }

  const emailExists = MOCK_USERS.some((user) => user.email.toLowerCase() === email.toLowerCase())
  if (emailExists) {
    return {
      ok: false,
      message: 'Ya existe una cuenta registrada con este correo electrónico.',
    }
  }

  const username = createUsernameFromFullName(fullName)
  const newUser: MockUser = {
    id: generatePatientId(),
    username,
    password,
    documentType: documentType as MockUser['documentType'],
    documentNumber,
    fullName,
    email,
    role: 'Paciente',
    active: true,
  }

  MOCK_USERS.push(newUser)

  const authUser: AuthUser = {
    id: newUser.id,
    fullName: newUser.fullName,
    documentType: newUser.documentType,
    documentNumber: newUser.documentNumber,
    email: newUser.email,
    role: newUser.role,
    username: newUser.username,
  }

  const token = createToken(newUser.role)

  return {
    ok: true,
    message: `Registro exitoso. Bienvenido(a) ${newUser.fullName}. Tu cuenta ha sido creada como Paciente.`,
    user: authUser,
    token,
  }
}
