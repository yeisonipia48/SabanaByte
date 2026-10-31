import type {
  Agenda,
  Cita,
  DocumentType,
  Especialidad,
  ListaEspera,
  Medico,
  Paciente,
  UsuarioAdmin,
} from '../types/admin'
import {
  agendaService,
  citasService,
  cuposService,
  listaEsperaService,
  medicosService,
  pacientesService,
  rolesService,
  usuariosService,
} from '../../../services'
import { httpClient } from '../../../lib/httpClient'
import { API_CONFIG } from '../../../config/api'
import type { RegistroUsuarioApiRequest, RolApi } from '../../../types/api/auth'
import { normalizeRole } from '../../../types/api/auth'
import type { CupoDisponibleResponseApi, CuposDisponiblesQuery } from '../../../types/api/cupos'

const DEFAULT_ESPECIALIDADES: Especialidad[] = [
  { id: 'Medicina General', name: 'Medicina General', description: 'Atención primaria y diagnóstico integral' },
  { id: 'Cardiología', name: 'Cardiología', description: 'Prevención y tratamiento de enfermedades cardíacas' },
  { id: 'Pediatría', name: 'Pediatría', description: 'Cuidado y salud infantil' },
  { id: 'Dermatología', name: 'Dermatología', description: 'Cuidado y tratamiento de la piel' },
  { id: 'Neurología', name: 'Neurología', description: 'Trastornos del sistema nervioso' },
  { id: 'Ortopedia', name: 'Ortopedia', description: 'Salud ósea, articular y muscular' },
  { id: 'Oftalmología', name: 'Oftalmología', description: 'Salud visual y ocular' },
  { id: 'Ginecología', name: 'Ginecología', description: 'Salud de la mujer y maternidad' },
]

async function resolveRoleId(roleName: string): Promise<number> {
  const roles = await rolesService.getAll()
  const match = roles.find(
    (candidate) => normalizeRole(candidate.rol) === normalizeRole(roleName),
  )

  if (!match) {
    throw new Error(
      `No existe el rol ${roleName} en el sistema. Contacta al administrador.`,
    )
  }

  return match.id
}

export const adminService = {
  // ==================== PACIENTES ====================
  async getPacientes(): Promise<Paciente[]> {
    const apiData = await pacientesService.getAll()
    return apiData.map((p) => ({
      id: String(p.id),
      documentType: 'CC',
      documentNumber: p.numero_documento,
      email: p.email,
      firstName: p.nombres,
      lastName: p.apellidos,
      birthDate: p.fecha_nacimiento,
      phone: p.telefono,
      address: p.direccion ?? '',
      eps: 'Compensar',
      bloodType: 'O+',
    }))
  },

  async addPaciente(data: Omit<Paciente, 'id'>): Promise<Paciente> {
    const password = data.password?.trim() ?? ''
    if (!password) {
      throw new Error('La contraseña es obligatoria para crear el paciente.')
    }

    const payload: RegistroUsuarioApiRequest = {
      id_rol: await resolveRoleId('paciente'),
      tipo_documento: data.documentType,
      numero_documento: data.documentNumber.trim(),
      email: data.email.trim(),
      password,
      nombres: data.firstName.trim(),
      apellidos: data.lastName.trim(),
      fecha_nacimiento: data.birthDate || '2000-01-01',
      telefono: data.phone?.trim() || '0000000000',
      direccion: data.address?.trim() || null,
    }

    await httpClient.post(API_CONFIG.ENDPOINTS.AUTH.REGISTER, payload)

    // Consultar el paciente recién creado en PostgreSQL
    const all = await pacientesService.getAll()
    const created = all.find((p) => p.numero_documento === payload.numero_documento)
    if (created) {
      return {
        id: String(created.id),
        documentType: data.documentType,
        documentNumber: created.numero_documento,
        email: created.email,
        firstName: created.nombres,
        lastName: created.apellidos,
        birthDate: created.fecha_nacimiento,
        phone: created.telefono,
        address: created.direccion ?? '',
        eps: data.eps || 'Compensar',
        bloodType: data.bloodType || 'O+',
      }
    }

    return {
      id: String(Date.now()),
      ...data,
    }
  },

  async updatePaciente(id: string, data: Partial<Paciente>): Promise<void> {
    await pacientesService.update(Number(id), {
      nombres: data.firstName ?? null,
      apellidos: data.lastName ?? null,
      fecha_nacimiento: data.birthDate ?? null,
      telefono: data.phone ?? null,
      direccion: data.address ?? null,
    })
  },

  async removePaciente(id: string): Promise<void> {
    await pacientesService.remove(Number(id))
  },

  // ==================== MÉDICOS ====================
  async getMedicos(): Promise<Medico[]> {
    const apiData = await medicosService.getAll()
    return apiData.map((m) => ({
      id: String(m.id),
      documentType: 'CC',
      documentNumber: m.numero_documento,
      email: m.email,
      firstName: m.nombres,
      lastName: m.apellidos,
      specialtyId: m.especialidad,
      phone: m.telefono,
      tarjetaProfesional: m.tarjeta_profesional,
      consultorio: m.consultorio,
    }))
  },

  async addMedico(data: Omit<Medico, 'id'>): Promise<Medico> {
    const password = data.password?.trim() ?? ''
    if (!password) {
      throw new Error('La contraseña es obligatoria para crear el médico.')
    }

    const payload: RegistroUsuarioApiRequest = {
      id_rol: await resolveRoleId('medico'),
      tipo_documento: data.documentType,
      numero_documento: data.documentNumber.trim(),
      email: data.email.trim(),
      password,
      nombres: data.firstName.trim(),
      apellidos: data.lastName.trim(),
      telefono: data.phone?.trim() || '0000000000',
      tarjeta_profesional: data.tarjetaProfesional?.trim() || `TP-${Date.now().toString().slice(-6)}`,
      especialidad: data.specialtyId?.trim() || 'Medicina General',
      consultorio: data.consultorio?.trim() || 'Consultorio 101',
    }

    await httpClient.post(API_CONFIG.ENDPOINTS.AUTH.REGISTER, payload)

    const all = await medicosService.getAll()
    const created = all.find((m) => m.numero_documento === payload.numero_documento)
    if (created) {
      return {
        id: String(created.id),
        documentType: data.documentType,
        documentNumber: created.numero_documento,
        email: created.email,
        firstName: created.nombres,
        lastName: created.apellidos,
        specialtyId: created.especialidad,
        phone: created.telefono,
        tarjetaProfesional: created.tarjeta_profesional,
        consultorio: created.consultorio,
      }
    }

    return {
      id: String(Date.now()),
      ...data,
    }
  },

  async updateMedico(id: string, data: Partial<Medico>): Promise<void> {
    await medicosService.update(Number(id), {
      nombres: data.firstName ?? null,
      apellidos: data.lastName ?? null,
      telefono: data.phone ?? null,
      tarjeta_profesional: data.tarjetaProfesional ?? null,
      especialidad: data.specialtyId ?? null,
      consultorio: data.consultorio ?? null,
    })
  },

  async removeMedico(id: string): Promise<void> {
    await medicosService.remove(Number(id))
  },

  // ==================== CITAS ====================
  async getCitas(): Promise<Cita[]> {
    const apiData = await citasService.getAll()
    return apiData.map((c) => ({
      id: String(c.id),
      patientId: String(c.id_paciente),
      doctorId: String(c.id_medico),
      specialtyId: c.especialidad,
      date: c.fecha_cupo,
      time: c.hora_cupo?.slice(0, 5) ?? '',
      status:
        c.estado === 'atendida'
          ? 'Atendida'
          : c.estado === 'cancelada'
            ? 'Cancelada'
            : c.estado === 'no_asistio'
              ? 'No asistió'
              : 'Programada',
      idCupo: String(c.id_cupo),
      motivoConsulta: c.motivo_consulta ?? undefined,
    }))
  },

  async getCuposDisponibles(params?: CuposDisponiblesQuery): Promise<CupoDisponibleResponseApi[]> {
    return cuposService.getDisponibles(params)
  },

  async addCita(data: Omit<Cita, 'id'>): Promise<Cita> {
    if (!data.idCupo) {
      throw new Error('Debes seleccionar un cupo disponible para agendar la cita.')
    }

    const created = await citasService.create({
      id_cupo: Number(data.idCupo),
      id_paciente: Number(data.patientId),
      motivo_consulta: data.motivoConsulta?.trim() || null,
    })

    return {
      id: String(created.id),
      patientId: String(created.id_paciente),
      doctorId: data.doctorId,
      specialtyId: data.specialtyId,
      date: data.date,
      time: data.time,
      status: 'Programada',
      idCupo: String(created.id_cupo),
      motivoConsulta: created.motivo_consulta ?? undefined,
    }
  },

  async updateCita(id: string, data: Partial<Cita>): Promise<void> {
    if (data.status === 'Cancelada') {
      await citasService.cancelar(Number(id))
      return
    }

    const estadoMap: Record<string, 'confirmada' | 'atendida' | 'no_asistio'> = {
      Programada: 'confirmada',
      Atendida: 'atendida',
      'No asistió': 'no_asistio',
    }

    const estadoBackend = data.status ? estadoMap[data.status] : undefined
    if (estadoBackend) {
      await citasService.actualizarAsistencia(Number(id), estadoBackend)
    }
  },

  async removeCita(id: string): Promise<void> {
    await citasService.cancelar(Number(id))
  },

  // ==================== AGENDA ====================
  async getAgenda(): Promise<Agenda[]> {
    const medicos = await medicosService.getAll()
    const allAgendas: Agenda[] = []

    for (const m of medicos) {
      try {
        const agendasMedico = await agendaService.getByMedico(m.id)
        for (const ag of agendasMedico) {
          allAgendas.push({
            id: String(ag.id),
            doctorId: String(m.id),
            specialtyId: m.especialidad,
            date: ag.fecha_inicio,
            time: ag.hora_inicio?.slice(0, 5) ?? '',
            status: ag.estado === 'activo' ? 'Disponible' : 'Ocupado',
            duracionMinutos: ag.duracion_cita,
          })
        }
      } catch {
        // Ignorar si el médico aún no tiene agendas
      }
    }

    return allAgendas
  },

  async addAgenda(data: Omit<Agenda, 'id'>): Promise<Agenda> {
    const horaInicio = data.time ? data.time.slice(0, 5) : '08:00'
    const [h, m] = horaInicio.split(':').map(Number)
    const horaFin = `${String(Math.min(23, (h || 8) + 4)).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`

    const created = await agendaService.create({
      id_medico: Number(data.doctorId),
      fecha_inicio: data.date,
      fecha_fin: data.date,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      duracion_cita: data.duracionMinutos || 30,
    })

    // Generar cupos en PostgreSQL automáticamente
    try {
      await agendaService.generarCupos(created.id)
    } catch {
      // Cupos ya generados o procesados
    }

    return {
      id: String(created.id),
      doctorId: String(created.id_medico),
      specialtyId: data.specialtyId,
      date: created.fecha_inicio,
      time: created.hora_inicio?.slice(0, 5) ?? horaInicio,
      status: 'Disponible',
      duracionMinutos: created.duracion_cita,
    }
  },

  async updateAgenda(id: string, data: Partial<Agenda>): Promise<void> {
    await agendaService.update(Number(id), {
      fecha_inicio: data.date ?? null,
      hora_inicio: data.time ?? null,
      estado: data.status === 'Disponible' ? 'activo' : 'inactivo',
    })
  },

  async removeAgenda(id: string): Promise<void> {
    await agendaService.remove(Number(id))
  },

  // ==================== LISTA DE ESPERA ====================
  async getListaEspera(): Promise<ListaEspera[]> {
    const apiData = await listaEsperaService.getAll()
    return apiData.map((l) => ({
      id: String(l.id),
      patientId: String(l.id_paciente),
      doctorId: l.id_medico ? String(l.id_medico) : '',
      specialtyId: l.especialidad ?? l.especialidad_ofrecida ?? '',
      date: l.fecha_cupo ?? l.fecha_solicitud?.slice(0, 10) ?? '',
      time: l.hora_cupo?.slice(0, 5) ?? '',
      status:
        l.estado === 'aceptada'
          ? 'Atendido'
          : l.estado === 'cancelada'
            ? 'Cancelado'
            : 'En espera',
    }))
  },

  async addListaEspera(data: Omit<ListaEspera, 'id'>): Promise<ListaEspera> {
    const created = await listaEsperaService.create({
      id_paciente: Number(data.patientId),
      id_medico: data.doctorId ? Number(data.doctorId) : null,
      prioridad: 1,
    })

    return {
      id: String(created.id),
      patientId: String(created.id_paciente),
      doctorId: created.id_medico ? String(created.id_medico) : '',
      specialtyId: data.specialtyId,
      date: created.fecha_solicitud?.slice(0, 10) ?? '',
      time: '',
      status: 'En espera',
    }
  },

  async updateListaEspera(id: string, data: Partial<ListaEspera>): Promise<void> {
    if (data.status === 'Cancelado') {
      await listaEsperaService.cancelar(Number(id))
    } else if (data.status === 'Atendido') {
      await listaEsperaService.aceptarOferta(Number(id))
    }
  },

  async removeListaEspera(id: string): Promise<void> {
    await listaEsperaService.cancelar(Number(id))
  },

  // ==================== USUARIOS ====================
  async getUsuarios(): Promise<UsuarioAdmin[]> {
    const apiData = await usuariosService.getAll()
    return apiData.map((u) => ({
      id: String(u.id),
      rol: u.rol,
      documentType: (u.tipo_documento as DocumentType) || 'CC',
      documentNumber: u.numero_documento,
      email: u.email,
      isActive: u.is_active,
      createdAt: u.created_at,
    }))
  },

  async addUsuario(data: {
    id_rol: number
    tipo_documento: string
    numero_documento: string
    email: string
    password?: string
  }): Promise<void> {
    const password = data.password?.trim() ?? ''
    if (!password) {
      throw new Error('La contraseña es obligatoria para crear el usuario.')
    }

    await usuariosService.create({
      id_rol: data.id_rol,
      tipo_documento: data.tipo_documento,
      numero_documento: data.numero_documento.trim(),
      email: data.email.trim(),
      password,
    })
  },

  async updateUsuario(
    id: string,
    data: { id_rol?: number; email?: string; is_active?: boolean },
  ): Promise<void> {
    await usuariosService.update(Number(id), {
      id_rol: data.id_rol ?? null,
      email: data.email ?? null,
      is_active: data.is_active ?? null,
    })
  },

  async removeUsuario(id: string): Promise<void> {
    await usuariosService.remove(Number(id))
  },

  async getRoles(): Promise<RolApi[]> {
    return rolesService.getAll()
  },

  // ==================== ESPECIALIDADES ====================
  getEspecialidades(): Especialidad[] {
    return DEFAULT_ESPECIALIDADES
  },
}

export default adminService
