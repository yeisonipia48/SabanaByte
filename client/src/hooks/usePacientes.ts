import { useCallback, useState } from 'react'
import { pacientesService } from '../services/pacientes.service'
import type { PacienteResponseApi } from '../types/api/pacientes'

export function usePacientes() {
  const [pacientes, setPacientes] = useState<PacienteResponseApi[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPacientes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await pacientesService.getAll()
      setPacientes(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar pacientes')
    } finally {
      setLoading(false)
    }
  }, [])

  return { pacientes, loading, error, refetch: fetchPacientes }
}

export default usePacientes
