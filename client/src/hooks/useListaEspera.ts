import { useCallback, useState } from 'react'
import { listaEsperaService } from '../services/listaEspera.service'
import type { CitaResponseApi } from '../types/api/citas'
import type {
  ListaEsperaCreateApiRequest,
  ListaEsperaDetalleResponseApi,
  ListaEsperaQuery,
  ListaEsperaResponseApi,
  ProcesarExpiradasResponseApi,
} from '../types/api/listaEspera'

export function useListaEspera() {
  const [solicitudes, setSolicitudes] = useState<ListaEsperaDetalleResponseApi[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSolicitudes = useCallback(
    async (params?: ListaEsperaQuery): Promise<ListaEsperaDetalleResponseApi[]> => {
      setLoading(true)
      setError(null)
      try {
        const data = await listaEsperaService.getAll(params)
        setSolicitudes(data)
        return data
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al cargar lista de espera'
        setError(msg)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  const obtenerSolicitud = useCallback(
    async (idEntrada: number): Promise<ListaEsperaDetalleResponseApi> => {
      setLoading(true)
      setError(null)
      try {
        return await listaEsperaService.getById(idEntrada)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al consultar solicitud de espera'
        setError(msg)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  const crearSolicitud = useCallback(
    async (data: ListaEsperaCreateApiRequest): Promise<ListaEsperaResponseApi> => {
      setLoading(true)
      setError(null)
      try {
        const res = await listaEsperaService.create(data)
        return res
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al crear solicitud en lista de espera'
        setError(msg)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  const cancelarSolicitud = useCallback(
    async (idEntrada: number): Promise<ListaEsperaResponseApi> => {
      setLoading(true)
      setError(null)
      try {
        const res = await listaEsperaService.cancelar(idEntrada)
        setSolicitudes((prev) =>
          prev.map((s) => (s.id === idEntrada ? { ...s, estado: 'cancelada' } : s)),
        )
        return res
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al cancelar solicitud de espera'
        setError(msg)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  const procesarExpiradas = useCallback(async (): Promise<ProcesarExpiradasResponseApi> => {
    setLoading(true)
    setError(null)
    try {
      return await listaEsperaService.procesarExpiradas()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al procesar ofertas expiradas'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const aceptarOferta = useCallback(async (idEntrada: number): Promise<CitaResponseApi> => {
    setLoading(true)
    setError(null)
    try {
      const res = await listaEsperaService.aceptarOferta(idEntrada)
      setSolicitudes((prev) =>
        prev.map((s) => (s.id === idEntrada ? { ...s, estado: 'aceptada' } : s)),
      )
      return res
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al aceptar oferta de cupo'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const rechazarOferta = useCallback(
    async (idEntrada: number): Promise<ListaEsperaResponseApi> => {
      setLoading(true)
      setError(null)
      try {
        const res = await listaEsperaService.rechazarOferta(idEntrada)
        setSolicitudes((prev) =>
          prev.map((s) => (s.id === idEntrada ? { ...s, estado: 'rechazada' } : s)),
        )
        return res
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error al rechazar oferta de cupo'
        setError(msg)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  return {
    solicitudes,
    loading,
    error,
    fetchSolicitudes,
    obtenerSolicitud,
    crearSolicitud,
    cancelarSolicitud,
    procesarExpiradas,
    aceptarOferta,
    rechazarOferta,
  }
}

export default useListaEspera
