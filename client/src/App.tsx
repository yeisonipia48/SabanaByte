import { useEffect, useState } from 'react'
import LoginPage from './features/auth/LoginPage'
import DashboardRouter from './components/DashboardRouter'
import type { AuthUser } from './features/auth/types'
import {
  clearSession,
  getSession,
  restoreSession,
  saveSession,
  updateSessionUser,
} from './features/auth/authService'

function getInitialSession() {
  const session = getSession()
  return session?.user ?? null
}

function App() {
  const [user, setUser] = useState<AuthUser | null>(getInitialSession)
  const [checkingSession, setCheckingSession] = useState(
    () => getSession() !== null,
  )

  useEffect(() => {
    if (!getSession()) return

    let active = true

    restoreSession()
      .then((restored) => {
        if (active && restored) setUser(restored)
      })
      .catch(() => {
        // Conservamos la sesión cacheada si la API no responde
      })
      .finally(() => {
        if (active) setCheckingSession(false)
      })

    return () => {
      active = false
    }
  }, [])

  const handleLoginSuccess = (authUser: AuthUser, token: string, remember: boolean) => {
    saveSession(authUser, token, remember)
    setUser(authUser)
  }

  const handleLogout = () => {
    clearSession()
    setUser(null)
  }

  const handleUserUpdate = (updatedUser: AuthUser) => {
    updateSessionUser(updatedUser)
    setUser(updatedUser)
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-white text-slate-600 dark:bg-slate-950 dark:text-slate-300">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-sky-700 motion-reduce:animate-none dark:border-slate-800 dark:border-t-sky-500"
          aria-hidden="true"
        />
        <span className="text-sm" role="status" aria-live="polite">
          Cargando sesión…
        </span>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="animate-fade-in">
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <DashboardRouter user={user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />
    </div>
  )
}

export default App
