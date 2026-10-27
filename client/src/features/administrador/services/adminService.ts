import type {
  Agenda,
  Cita,
  Especialidad,
  ListaEspera,
  Medico,
  Paciente,
} from '../types/admin'
import {
  mockAgenda,
  mockCitas,
  mockEspecialidades,
  mockListaEspera,
  mockMedicos,
  mockPacientes,
} from '../data/mockAdminData'

let pacientes: Paciente[] = [...mockPacientes]
let medicos: Medico[] = [...mockMedicos]
let especialidades: Especialidad[] = [...mockEspecialidades]
let citas: Cita[] = [...mockCitas]
let agenda: Agenda[] = [...mockAgenda]
let listaEspera: ListaEspera[] = [...mockListaEspera]

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

export const adminService = {
  // Pacientes
  getPacientes: () => [...pacientes],
  addPaciente: (data: Omit<Paciente, 'id'>) => {
    const item: Paciente = { ...data, id: generateId('pac') }
    pacientes = [...pacientes, item]
    return item
  },
  updatePaciente: (id: string, data: Partial<Paciente>) => {
    pacientes = pacientes.map((p) => (p.id === id ? { ...p, ...data } : p))
    return pacientes.find((p) => p.id === id) ?? null
  },
  removePaciente: (id: string) => {
    pacientes = pacientes.filter((p) => p.id !== id)
  },

  // Médicos
  getMedicos: () => [...medicos],
  addMedico: (data: Omit<Medico, 'id'>) => {
    const item: Medico = { ...data, id: generateId('med') }
    medicos = [...medicos, item]
    return item
  },
  updateMedico: (id: string, data: Partial<Medico>) => {
    medicos = medicos.map((m) => (m.id === id ? { ...m, ...data } : m))
    return medicos.find((m) => m.id === id) ?? null
  },
  removeMedico: (id: string) => {
    medicos = medicos.filter((m) => m.id !== id)
  },

  // Especialidades
  getEspecialidades: () => [...especialidades],
  addEspecialidad: (data: Omit<Especialidad, 'id'>) => {
    const item: Especialidad = { ...data, id: generateId('esp') }
    especialidades = [...especialidades, item]
    return item
  },
  updateEspecialidad: (id: string, data: Partial<Especialidad>) => {
    especialidades = especialidades.map((e) => (e.id === id ? { ...e, ...data } : e))
    return especialidades.find((e) => e.id === id) ?? null
  },
  removeEspecialidad: (id: string) => {
    especialidades = especialidades.filter((e) => e.id !== id)
  },

  // Citas
  getCitas: () => [...citas],
  addCita: (data: Omit<Cita, 'id'>) => {
    const item: Cita = { ...data, id: generateId('cit') }
    citas = [...citas, item]
    return item
  },
  updateCita: (id: string, data: Partial<Cita>) => {
    citas = citas.map((c) => (c.id === id ? { ...c, ...data } : c))
    return citas.find((c) => c.id === id) ?? null
  },
  removeCita: (id: string) => {
    citas = citas.filter((c) => c.id !== id)
  },

  // Agenda
  getAgenda: () => [...agenda],
  addAgenda: (data: Omit<Agenda, 'id'>) => {
    // evitar duplicados
    const exists = agenda.some(
      (a) => a.doctorId === data.doctorId && a.date === data.date && a.time === data.time,
    )
    if (exists) return null
    const item: Agenda = { ...data, id: generateId('age') }
    agenda = [...agenda, item]
    return item
  },
  updateAgenda: (id: string, data: Partial<Agenda>) => {
    agenda = agenda.map((a) => (a.id === id ? { ...a, ...data } : a))
    return agenda.find((a) => a.id === id) ?? null
  },
  removeAgenda: (id: string) => {
    agenda = agenda.filter((a) => a.id !== id)
  },

  // Lista de espera
  getListaEspera: () => [...listaEspera],
  addListaEspera: (data: Omit<ListaEspera, 'id'>) => {
    const item: ListaEspera = { ...data, id: generateId('lst') }
    listaEspera = [...listaEspera, item]
    return item
  },
  updateListaEspera: (id: string, data: Partial<ListaEspera>) => {
    listaEspera = listaEspera.map((l) => (l.id === id ? { ...l, ...data } : l))
    return listaEspera.find((l) => l.id === id) ?? null
  },
  removeListaEspera: (id: string) => {
    listaEspera = listaEspera.filter((l) => l.id !== id)
  },
}
