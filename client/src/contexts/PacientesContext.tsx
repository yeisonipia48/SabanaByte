import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { usePacientes } from '../hooks/usePacientes'
import type { PacienteResponseApi } from '../types/api/pacientes'

interface PacientesContextValue {
  pacientes: PacienteResponseApi[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const PacientesContext = createContext<PacientesContextValue | undefined>(undefined)

export function PacientesProvider({ children }: { children: ReactNode }) {
  const { pacientes, loading, error, refetch } = usePacientes()

  const value = useMemo(
    () => ({
      pacientes,
      loading,
      error,
      refetch,
    }),
    [pacientes, loading, error, refetch],
  )

  return <PacientesContext.Provider value={value}>{children}</PacientesContext.Provider>
}

export function usePacientesContext() {
  const context = useContext(PacientesContext)
  if (context === undefined) {
    throw new Error('usePacientesContext must be used within a PacientesProvider')
  }
  return context
}

export default PacientesContext
