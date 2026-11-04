import type {
  Agenda,
  Cita,
  Especialidad,
  ListaEspera,
  Medico,
  Paciente,
} from '../types/admin'

export const mockPacientes: Paciente[] = [
  {
    id: 'pac-001',
    documentType: 'CC',
    documentNumber: '1023456789',
    email: 'paciente1@correo.com',
    password: 'Paciente123*',
    firstName: 'Ana',
    lastName: 'Martínez',
    birthDate: '1995-04-12',
    phone: '3001234567',
    address: 'Calle 45 #23-10',
    eps: 'Sanitas',
    bloodType: 'O+',
  },
]

export const mockEspecialidades: Especialidad[] = [
  {
    id: 'esp-001',
    name: 'Medicina General',
    description: 'Atención primaria y consulta general',
  },
  {
    id: 'esp-002',
    name: 'Pediatría',
    description: 'Atención integral a niños y adolescentes',
  },
]

export const mockMedicos: Medico[] = [
  {
    id: 'med-001',
    documentType: 'CC',
    documentNumber: '1098765432',
    email: 'medico1@correo.com',
    password: 'Medico123*',
    firstName: 'Carlos',
    lastName: 'Gómez',
    specialtyId: 'esp-001',
  },
]

export const mockCitas: Cita[] = []
export const mockAgenda: Agenda[] = []
export const mockListaEspera: ListaEspera[] = []
