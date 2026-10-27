export type DocumentType = 'CC' | 'TI' | 'CE' | 'PA'

export type AdminModuleKey =
  | 'inicio'
  | 'pacientes'
  | 'medicos'
  | 'especialidades'
  | 'citas'
  | 'agenda'
  | 'lista-espera'

export interface Paciente {
  id: string
  documentType: DocumentType
  documentNumber: string
  email: string
  password: string
  firstName: string
  lastName: string
  birthDate: string
  phone: string
  address: string
  eps: string
  bloodType: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'
}

export interface Especialidad {
  id: string
  name: string
  description: string
}

export interface Medico {
  id: string
  documentType: DocumentType
  documentNumber: string
  email: string
  password: string
  firstName: string
  lastName: string
  specialtyId: string
}

export type CitaEstado = 'Programada' | 'Atendida' | 'Cancelada' | 'No asistió'
export type AgendaEstado = 'Disponible' | 'Ocupado' | 'Bloqueado'
export type ListaEsperaEstado = 'En espera' | 'Atendido' | 'Cancelado'

export interface Cita {
  id: string
  patientId: string
  doctorId: string
  specialtyId: string
  date: string
  time: string
  status: CitaEstado
}

export interface Agenda {
  id: string
  doctorId: string
  specialtyId: string
  date: string
  time: string
  status: AgendaEstado
}

export interface ListaEspera {
  id: string
  patientId: string
  doctorId: string
  specialtyId: string
  date: string
  time: string
  status: ListaEsperaEstado
}
