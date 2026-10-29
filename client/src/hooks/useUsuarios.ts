import { useCallback, useState } from 'react'
import { usuariosService } from '../services/usuarios.service'
import type { UsuarioResponseApi } from '../types/api/usuarios'

export function useUsuarios() {
  const [usuarios, setUsuarios] = useState<UsuarioResponseApi[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUsuarios = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await usuariosService.getAll()
      setUsuarios(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }, [])

  return { usuarios, loading, error, refetch: fetchUsuarios }
}

export default useUsuarios
