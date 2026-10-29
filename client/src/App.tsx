import { useState } from 'react'
import LoginPage from './features/auth/LoginPage'
import DashboardRouter from './components/DashboardRouter'
import type { AuthUser } from './features/auth/types'
import { clearSession, getSession, saveSession, updateSessionUser } from './features/auth/authService'

function getInitialSession() {
  const session = getSession()
  return session?.user ?? null
}

function App() {
  const [user, setUser] = useState<AuthUser | null>(getInitialSession)
  const [checkingSession] = useState(false)

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
      <div className="flex min-h-dvh items-center justify-center bg-white text-slate-600">
        <span className="text-sm">Cargando sesión...</span>
      </div>
    )
  }

  if (!user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />
  }

  return <DashboardRouter user={user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />
}

export default App
