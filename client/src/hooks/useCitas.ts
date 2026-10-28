import { useCallback, useState } from 'react'
import { citasService } from '../services/citas.service'
import type {
  CitaConOfertaResponseApi,
  CitaCreateApiRequest,
  CitaDetalleResponseApi,
  CitaResponseApi,
  CitasQuery,
} from '../types/api/citas'

export function useCitas() {
  const [citas, setCitas] = useState<CitaDetalleResponseApi[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCitas = useCallback(async (params?: CitasQuery): Promise<CitaDetalleResponseApi[]> => {
    setLoading(true)
    setError(null)
    try {
      const data = await citasService.getAll(params)
      setCitas(data)
      return data
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar citas'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const obtenerCita = useCallback(async (idCita: number): Promise<CitaDetalleResponseApi> => {
    setLoading(true)
    setError(null)
    try {
      return await citasService.getById(idCita)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al obtener cita'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const crearCita = useCallback(async (data: CitaCreateApiRequest): Promise<CitaResponseApi> => {
    setLoading(true)
    setError(null)
    try {
      return await citasService.create(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al crear cita'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const cancelarCita = useCallback(async (idCita: number): Promise<CitaConOfertaResponseApi> => {
    setLoading(true)
    setError(null)
    try {
      const res = await citasService.cancelar(idCita)
      setCitas((prev) =>
        prev.map((c) => (c.id === idCita ? { ...c, estado: 'cancelada' } : c)),
      )
      return res
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cancelar cita'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const actualizarAsistencia = useCallback(
    async (
      idCita: number,
      estado: 'confirmada' | 'atendida' | 'no_asistio',
    ): Promise<CitaConOfertaResponseApi> => {
      setLoading(true)
      setError(null)
      try {
        const res = await citasService.actualizarAsistencia(idCita, estado)
        setCitas((prev) =>
          prev.map((c) => (c.id === idCita ? { ...c, estado } : c)),
        )
        return res
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al actualizar asistencia'
        setError(msg)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  const fetchJornada = useCallback(
    async (idMedico: number, fecha: string): Promise<CitaDetalleResponseApi[]> => {
      setLoading(true)
      setError(null)
      try {
        return await citasService.getJornadaMedico(idMedico, fecha)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al consultar jornada'
        setError(msg)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  return {
    citas,
    loading,
    error,
    fetchCitas,
    obtenerCita,
    crearCita,
    cancelarCita,
    actualizarAsistencia,
    fetchJornada,
  }
}

export default useCitas
