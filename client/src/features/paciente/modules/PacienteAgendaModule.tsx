import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { CalendarPlus, RefreshCw, Search } from 'lucide-react'
import AdminModal from '../../administrador/components/AdminModal'
import AdminFormField from '../../administrador/components/AdminFormField'
import { cuposService } from '../../../services/cupos.service'
import { medicosService } from '../../../services/medicos.service'
import { citasService } from '../../../services/citas.service'
import type { CupoDisponibleResponseApi } from '../../../types/api/cupos'
import type { MedicoResponseApi } from '../../../types/api/medicos'
import type { AuthUser } from '../../auth/types'

interface PacienteAgendaModuleProps {
  user: AuthUser
}

function PacienteAgendaModule({ user }: PacienteAgendaModuleProps) {
  const [slots, setSlots] = useState<CupoDisponibleResponseApi[]>([])
  const [medicos, setMedicos] = useState<MedicoResponseApi[]>([])
  const [especialidad, setEspecialidad] = useState('')
  const [medicoId, setMedicoId] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [selected, setSelected] = useState<CupoDisponibleResponseApi | null>(null)
  const [motivo, setMotivo] = useState('')
  const [booking, setBooking] = useState(false)

  const loadSlots = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await cuposService.getDisponibles({
        especialidad: especialidad || undefined,
        id_medico: medicoId ? Number(medicoId) : undefined,
        fecha_inicio: fechaInicio || undefined,
        fecha_fin: fechaFin || undefined,
      })
      setSlots(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los cupos disponibles.')
      setSlots([])
    } finally {
      setLoading(false)
    }
  }, [especialidad, fechaFin, fechaInicio, medicoId])

  useEffect(() => {
    medicosService
      .getAll()
      .then(setMedicos)
      .catch(() => setMedicos([]))
  }, [])

  useEffect(() => {
    loadSlots()
  }, [loadSlots])

  const especialidades = useMemo(
    () =>
      Array.from(new Set(medicos.map((medico) => medico.especialidad).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b),
      ),
    [medicos],
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return slots

    return slots.filter((slot) =>
      [slot.medico, slot.especialidad, slot.consultorio, slot.fecha_cupo, slot.hora_cupo]
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }, [search, slots])

  const openBooking = (slot: CupoDisponibleResponseApi) => {
    setSelected(slot)
    setMotivo('')
    setSuccess(null)
  }

  const handleBook = async () => {
    if (user.profileId === null) {
      alert('No encontramos tu perfil de paciente. Cierra sesión e ingresa de nuevo.')
      return
    }

    if (!selected) return

    setBooking(true)
    setError(null)
    try {
      await citasService.create({
        id_cupo: selected.id_cupo,
        id_paciente: user.profileId,
        motivo_consulta: motivo.trim() || null,
      })
      setSuccess(
        `Cita agendada con ${selected.medico} el ${selected.fecha_cupo} a las ${selected.hora_cupo?.slice(0, 5)}.`,
      )
      setSelected(null)
      setMotivo('')
      await loadSlots()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo agendar la cita.')
    } finally {
      setBooking(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Agendar cita</h2>
        <p className="text-xs text-slate-500">
          Elige un cupo disponible y reserva tu cita con el especialista.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <select
          value={especialidad}
          onChange={(event) => setEspecialidad(event.target.value)}
          className="border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-700/25"
          aria-label="Filtrar por especialidad"
        >
          <option value="">Todas las especialidades</option>
          {especialidades.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select
          value={medicoId}
          onChange={(event) => setMedicoId(event.target.value)}
          className="border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-700/25"
          aria-label="Filtrar por médico"
        >
          <option value="">Todos los médicos</option>
          {medicos.map((medico) => (
            <option key={medico.id} value={medico.id}>
              {medico.nombres} {medico.apellidos}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={fechaInicio}
          onChange={(event) => setFechaInicio(event.target.value)}
          className="border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-700/25"
          aria-label="Fecha inicial"
        />
        <input
          type="date"
          value={fechaFin}
          onChange={(event) => setFechaFin(event.target.value)}
          className="border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-700/25"
          aria-label="Fecha final"
        />
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            name="search"
            aria-label="Buscar cupos"
            autoComplete="off"
            spellCheck={false}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar…"
            className="w-full border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 transition-shadow focus:outline-none focus:ring-2 focus:ring-sky-700/25"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={loadSlots}
          className="inline-flex items-center gap-2 border border-slate-300 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Actualizar
        </button>
      </div>

      {loading ? (
        <div className="loading-banner animate-fade-in border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700" role="status" aria-live="polite">
          Buscando cupos disponibles…
        </div>
      ) : null}
      {error ? (
        <div className="animate-fade-up border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700" role="alert">{error}</div>
      ) : null}
      {success ? (
        <div className="animate-fade-up border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700" role="status">
          {success}
        </div>
      ) : null}

      {filtered.length === 0 && !loading ? (
        <div className="border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
          No hay cupos disponibles con los filtros seleccionados.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((slot) => (
            <article key={slot.id_cupo} className="border border-slate-200 bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {slot.fecha_cupo} · {slot.hora_cupo?.slice(0, 5)}
                  </p>
                  <p className="text-xs text-slate-500">{slot.especialidad}</p>
                </div>
                <span className="bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">
                  {slot.duracion_cita} min
                </span>
              </div>
              <dl className="mt-3 space-y-1 text-xs text-slate-600">
                <div className="flex justify-between gap-2">
                  <dt>Médico</dt>
                  <dd className="text-right font-medium text-slate-800">{slot.medico}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Consultorio</dt>
                  <dd className="text-right font-medium text-slate-800">{slot.consultorio}</dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={() => openBooking(slot)}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 bg-sky-800 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:bg-sky-900"
              >
                <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                Agendar cita
              </button>
            </article>
          ))}
        </div>
      )}

      <AdminModal
        open={selected !== null}
        title="Confirmar cita"
        onClose={() => setSelected(null)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleBook}
              disabled={booking}
              className="bg-sky-800 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-sky-900 disabled:opacity-60"
            >
              {booking ? 'Agendando...' : 'Confirmar cita'}
            </button>
          </>
        }
      >
        {selected ? (
          <div className="space-y-3">
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Médico</dt>
                <dd className="text-slate-900">{selected.medico}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Especialidad</dt>
                <dd className="text-slate-900">{selected.especialidad}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Fecha y hora</dt>
                <dd className="text-slate-900">
                  {selected.fecha_cupo} {selected.hora_cupo?.slice(0, 5)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Consultorio</dt>
                <dd className="text-slate-900">{selected.consultorio}</dd>
              </div>
            </dl>
            <AdminFormField
              label="Motivo de consulta"
              id="motivo"
              value={motivo}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setMotivo(event.target.value)}
              placeholder="Describe brevemente el motivo (opcional)"
            />
          </div>
        ) : null}
      </AdminModal>
    </div>
  )
}

export default PacienteAgendaModule
