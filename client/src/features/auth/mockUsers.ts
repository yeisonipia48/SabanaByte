import type { Role } from './types'

export interface MockUser {
  id: string
  username: string
  password: string
  documentType: 'CC' | 'CE' | 'TI' | 'PA'
  documentNumber: string
  fullName: string
  email: string
  role: Role
  active: boolean
}

export const MOCK_USERS: MockUser[] = [
  {
    id: 'pac-001',
    username: 'paciente1',
    password: 'Paciente123*',
    documentType: 'CC',
    documentNumber: '1023456789',
    fullName: 'Ana María López Rodríguez',
    email: 'ana.lopez@correo.com',
    role: 'Paciente',
    active: true,
  },
  {
    id: 'med-001',
    username: 'medico1',
    password: 'Medico123*',
    documentType: 'CC',
    documentNumber: '1034567890',
    fullName: 'Dr. Carlos Andrés Pérez',
    email: 'carlos.perez@ips.com',
    role: 'Medico',
    active: true,
  },
  {
    id: 'adm-001',
    username: 'admin1',
    password: 'Admin123*',
    documentType: 'CC',
    documentNumber: '1045678901',
    fullName: 'Laura Jiménez Torres',
    email: 'laura.jimenez@sabanabyte.com',
    role: 'Administrador',
    active: true,
  },
]

export function findMockUser(credentials: {
  username?: string
  documentNumber?: string
  password: string
  role: Role
}): MockUser | undefined {
  const username = credentials.username?.trim().toLowerCase()
  const documentNumber = credentials.documentNumber?.trim()

  return MOCK_USERS.find((user) => {
    if (!user.active) return false
    if (user.role !== credentials.role) return false
    if (user.password !== credentials.password) return false

    if (username && user.username.toLowerCase() === username) return true
    if (documentNumber && user.documentNumber === documentNumber) return true

    return false
  })
}
