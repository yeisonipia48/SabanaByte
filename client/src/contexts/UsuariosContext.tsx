import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useUsuarios } from '../hooks/useUsuarios'
import type { UsuarioResponseApi } from '../types/api/usuarios'

interface UsuariosContextValue {
  usuarios: UsuarioResponseApi[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const UsuariosContext = createContext<UsuariosContextValue | undefined>(undefined)

export function UsuariosProvider({ children }: { children: ReactNode }) {
  const { usuarios, loading, error, refetch } = useUsuarios()

  const value = useMemo(
    () => ({
      usuarios,
      loading,
      error,
      refetch,
    }),
    [usuarios, loading, error, refetch],
  )

  return <UsuariosContext.Provider value={value}>{children}</UsuariosContext.Provider>
}

export function useUsuariosContext() {
  const context = useContext(UsuariosContext)
  if (context === undefined) {
    throw new Error('useUsuariosContext must be used within a UsuariosProvider')
  }
  return context
}

export default UsuariosContext
