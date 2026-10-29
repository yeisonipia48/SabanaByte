import { useCallback, useState } from 'react'
import { medicosService } from '../services/medicos.service'
import type { MedicoResponseApi } from '../types/api/medicos'

export function useMedicos() {
  const [medicos, setMedicos] = useState<MedicoResponseApi[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMedicos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await medicosService.getAll()
      setMedicos(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar médicos')
    } finally {
      setLoading(false)
    }
  }, [])

  return { medicos, loading, error, refetch: fetchMedicos }
}

export default useMedicos
