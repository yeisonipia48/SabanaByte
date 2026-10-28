import { useCallback, useState } from 'react'
import { agendaService } from '../services/agenda.service'
import type {
  AgendaCreateApiRequest,
  AgendaCreateResponseApi,
  AgendaResponseApi,
  AgendaUpdateApiRequest,
  GenerarCuposResponseApi,
} from '../types/api/agenda'

export function useAgenda() {
  const [agenda, setAgenda] = useState<AgendaResponseApi[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchByMedico = useCallback(async (idMedico: number) => {
    setLoading(true)
    setError(null)
    try {
      const data = await agendaService.getByMedico(idMedico)
      setAgenda(data)
      return data
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar agenda'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const crearAgenda = useCallback(async (data: AgendaCreateApiRequest): Promise<AgendaCreateResponseApi> => {
    setLoading(true)
    setError(null)
    try {
      return await agendaService.create(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al crear agenda'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const actualizarAgenda = useCallback(
    async (idAgenda: number, data: AgendaUpdateApiRequest): Promise<AgendaCreateResponseApi> => {
      setLoading(true)
      setError(null)
      try {
        return await agendaService.update(idAgenda, data)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al actualizar agenda'
        setError(msg)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  const eliminarAgenda = useCallback(async (idAgenda: number): Promise<string> => {
    setLoading(true)
    setError(null)
    try {
      const res = await agendaService.remove(idAgenda)
      setAgenda((prev) => prev.filter((a) => a.id !== idAgenda))
      return res
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar agenda'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const generarCupos = useCallback(async (idAgenda: number): Promise<GenerarCuposResponseApi> => {
    setLoading(true)
    setError(null)
    try {
      return await agendaService.generarCupos(idAgenda)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al generar cupos'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    agenda,
    loading,
    error,
    fetchByMedico,
    crearAgenda,
    actualizarAgenda,
    eliminarAgenda,
    generarCupos,
  }
}

export default useAgenda
