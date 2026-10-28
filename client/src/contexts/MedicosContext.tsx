import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useMedicos } from '../hooks/useMedicos'
import type { MedicoResponseApi } from '../types/api/medicos'

interface MedicosContextValue {
  medicos: MedicoResponseApi[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const MedicosContext = createContext<MedicosContextValue | undefined>(undefined)

export function MedicosProvider({ children }: { children: ReactNode }) {
  const { medicos, loading, error, refetch } = useMedicos()

  const value = useMemo(
    () => ({
      medicos,
      loading,
      error,
      refetch,
    }),
    [medicos, loading, error, refetch],
  )

  return <MedicosContext.Provider value={value}>{children}</MedicosContext.Provider>
}

export function useMedicosContext() {
  const context = useContext(MedicosContext)
  if (context === undefined) {
    throw new Error('useMedicosContext must be used within a MedicosProvider')
  }
  return context
}

export default MedicosContext
