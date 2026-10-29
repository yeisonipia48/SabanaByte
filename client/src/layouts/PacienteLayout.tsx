import { useEffect, useState, type ReactNode } from 'react'
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import type { AuthUser } from '../features/auth/types'
import BrandLogo from '../features/auth/components/BrandLogo'
import ThemeToggle from '../components/ThemeToggle'

export type PacienteModuleKey = 'inicio' | 'citas' | 'agenda' | 'lista-espera' | 'perfil'

interface NavItem {
  key: PacienteModuleKey
  label: string
  icon: ReactNode
}

interface PacienteLayoutProps {
  user: AuthUser
  onLogout: () => void
  activeModule: PacienteModuleKey
  onModuleChange: (key: PacienteModuleKey) => void
  navItems: NavItem[]
  children: ReactNode
}

const SIDEBAR_KEY = 'sabanaByte.paciente.sidebarCollapsed'

function PacienteLayout({
  user,
  onLogout,
  activeModule,
  onModuleChange,
  navItems,
  children,
}: PacienteLayoutProps) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_KEY)
      return stored === 'true'
    } catch {
      return false
    }
  })
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, collapsed ? 'true' : 'false')
    } catch {
      // ignore
    }
  }, [collapsed])

  const toggleCollapsed = () => setCollapsed((value) => !value)

  const initials =
    user.fullName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || user.username.charAt(0).toUpperCase()

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-200">
      <header className="shrink-0 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-2 px-3 py-2 sm:px-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex items-center justify-center border border-slate-300 p-1.5 text-slate-600 lg:hidden dark:border-slate-700 dark:text-slate-300"
              aria-label="Abrir menú"
            >
              <Menu className="h-4 w-4" aria-hidden="true" />
            </button>
            <BrandLogo />

          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="hidden text-right sm:block">
              <p className="max-w-[200px] truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                {user.fullName}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {user.role} | {user.username}
              </p>
            </div>
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 border border-slate-300 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              aria-label="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Cerrar sesión</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside
          className={`hidden border-r border-slate-200 bg-white transition-[width] duration-200 lg:flex lg:flex-col dark:border-slate-800 dark:bg-slate-900 ${collapsed ? 'w-16' : 'w-64'
            }`}
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-2 py-2 dark:border-slate-800">
            {!collapsed ? (
              <p className="px-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Menú
              </p>
            ) : null}
            <button
              type="button"
              onClick={toggleCollapsed}
              className="inline-flex items-center justify-center border border-slate-300 p-1.5 text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
              aria-expanded={!collapsed}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
              ) : (
                <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
          <nav className="flex flex-1 flex-col py-1">
            {navItems.map((item) => {
              const isActive = activeModule === item.key
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onModuleChange(item.key)}
                  className={`group relative flex items-center gap-2 px-2 py-2 text-left text-sm transition-colors ${isActive
                      ? 'border-l-4 border-sky-700 bg-sky-50 font-semibold text-sky-900 dark:border-sky-500 dark:bg-sky-950/40 dark:text-sky-200'
                      : 'border-l-4 border-transparent text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                    } ${collapsed ? 'justify-center px-0' : 'pl-3 pr-2'}`}
                  title={collapsed ? item.label : undefined}
                  aria-label={item.label}
                >
                  <span className="flex h-8 w-8 items-center justify-center text-slate-600 group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-slate-100">
                    {item.icon}
                  </span>
                  {!collapsed ? <span className="truncate">{item.label}</span> : null}
                </button>
              )
            })}
          </nav>
          <div className="border-t border-slate-200 p-2 dark:border-slate-800">
            <button
              type="button"
              onClick={() => onModuleChange('perfil')}
              className={`flex w-full items-center gap-2 rounded-[50px] border px-2 py-1.5 text-left text-sm transition-colors ${activeModule === 'perfil'
                  ? 'border-sky-700 bg-sky-50 font-semibold text-sky-900 dark:border-sky-500 dark:bg-sky-950/40 dark:text-sky-200'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                } ${collapsed ? 'justify-center px-0' : 'pl-3 pr-2'}`}
              title={collapsed ? 'Mi perfil' : undefined}
              aria-label="Mi perfil"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-700 text-xs font-semibold text-white">
                {initials}
              </span>
              {!collapsed ? <span className="truncate">Mi perfil</span> : null}
            </button>
          </div>
        </aside>

        {mobileOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-slate-900/40"
              aria-hidden="true"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="relative flex h-full w-72 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-800">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Menú
                </p>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex items-center justify-center border border-slate-300 p-1.5 text-slate-600 dark:border-slate-700 dark:text-slate-300"
                  aria-label="Cerrar menú"
                >
                  <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <nav className="flex flex-1 flex-col py-1">
                {navItems.map((item) => {
                  const isActive = activeModule === item.key
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        onModuleChange(item.key)
                        setMobileOpen(false)
                      }}
                      className={`flex items-center gap-2 border-l-4 px-3 py-2 text-left text-sm ${isActive
                          ? 'border-sky-700 bg-sky-50 font-semibold text-sky-900 dark:border-sky-500 dark:bg-sky-950/40 dark:text-sky-200'
                          : 'border-transparent text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
                        }`}
                    >
                      <span className="flex h-8 w-8 items-center justify-center text-slate-600 dark:text-slate-400">
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </button>
                  )
                })}
              </nav>
              <div className=" p-2 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    onModuleChange('perfil')
                    setMobileOpen(false)
                  }}
                  className={`flex w-full items-center gap-2 rounded-[50px] border px-3 py-1.5 text-left text-sm transition-colors ${activeModule === 'perfil'
                      ? 'border-sky-700 bg-sky-50 font-semibold text-sky-900 dark:border-sky-500 dark:bg-sky-950/40 dark:text-sky-200'
                      : 'border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  aria-label="Mi perfil"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-700 text-xs font-semibold text-white">
                    {initials}
                  </span>
                  <span className="truncate">Mi perfil</span>
                </button>
              </div>
            </aside>
          </div>
        ) : null}

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4">

            {children}

          </div>
        </main>
      </div>
    </div>
  )
}

export default PacienteLayout
