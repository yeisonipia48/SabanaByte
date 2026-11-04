import { useCallback, useState } from 'react'
import { cuposService } from '../services/cupos.service'
import type {
  CupoDetalleResponseApi,
  CupoDisponibleResponseApi,
  CupoResponseApi,
  CuposDisponiblesQuery,
  CupoUpdateApiRequest,
} from '../types/api/cupos'

export function useCupos() {
  const [cupos, setCupos] = useState<CupoDisponibleResponseApi[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDisponibles = useCallback(async (params?: CuposDisponiblesQuery): Promise<CupoDisponibleResponseApi[]> => {
    setLoading(true)
    setError(null)
    try {
      const data = await cuposService.getDisponibles(params)
      setCupos(data)
      return data
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cargar cupos disponibles'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const obtenerDetalle = useCallback(async (idCupo: number): Promise<CupoDetalleResponseApi> => {
    setLoading(true)
    setError(null)
    try {
      return await cuposService.getById(idCupo)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al obtener detalle del cupo'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const actualizarEstado = useCallback(
    async (idCupo: number, data: CupoUpdateApiRequest): Promise<CupoResponseApi> => {
      setLoading(true)
      setError(null)
      try {
        const res = await cuposService.updateEstado(idCupo, data)
        setCupos((prev) => prev.filter((c) => c.id_cupo !== idCupo))
        return res
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al actualizar estado del cupo'
        setError(msg)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  return {
    cupos,
    loading,
    error,
    fetchDisponibles,
    obtenerDetalle,
    actualizarEstado,
  }
}

export default useCupos
