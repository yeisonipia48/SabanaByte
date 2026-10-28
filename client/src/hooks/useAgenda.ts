import { useCallback, useState } from 'react'
import { agendaService } from '../services/agenda.service'
import type { AgendaResponseApi } from '../types/api/agenda'

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar agenda')
    } finally {
      setLoading(false)
    }
  }, [])

  return { agenda, loading, error, fetchByMedico }
}

export default useAgenda
