import { LogOut, Menu } from 'lucide-react'
import type { AuthUser } from '../features/auth/types'
import type { ReactNode } from 'react'
import BrandLogo from '../features/auth/components/BrandLogo'

interface DashboardLayoutProps {
  user: AuthUser
  onLogout: () => void
  title: string
  subtitle: string
  navItems: Array<{ label: string; active?: boolean }>
  children: ReactNode
}

function DashboardLayout({
  user,
  onLogout,
  title,
  subtitle,
  navItems,
  children,
}: DashboardLayoutProps) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-slate-50 text-slate-900">
      <header className="shrink-0 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2 sm:gap-4 sm:px-6 sm:py-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <BrandLogo />
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-slate-900">
                SabanaByte - Portal Transaccional
              </p>
              <p className="text-xs text-slate-500">Módulo por rol</p>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="hidden text-right sm:block">
              <p className="max-w-[200px] truncate text-sm font-semibold text-slate-900">
                {user.fullName}
              </p>
              <p className="text-xs text-slate-500">
                {user.role} | {user.username}
              </p>
            </div>
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 border border-slate-300 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 sm:gap-2 sm:px-3 sm:py-2 sm:text-xs"
              aria-label="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Cerrar sesión</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-3 px-3 py-3 sm:gap-6 sm:px-6 sm:py-6 lg:grid lg:grid-cols-[260px_1fr] lg:gap-6">
        <aside className="border border-slate-200 bg-white lg:h-full lg:overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2 lg:px-4 lg:py-3">
            <Menu className="h-4 w-4 text-slate-500" aria-hidden="true" />
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600 lg:text-xs">
              Menú
            </p>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-2 py-1.5 lg:flex-col lg:gap-0 lg:overflow-visible lg:px-0 lg:py-0">
            {navItems.map((item) => (
              <button
                key={item.label}
                className={`shrink-0 border-b-0 px-3 py-1.5 text-left text-xs transition-colors lg:w-full lg:border-b lg:border-slate-100 lg:px-4 lg:py-2.5 lg:text-sm last:lg:border-b-0 ${
                  item.active
                    ? 'bg-sky-50 font-semibold text-sky-900'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex min-h-0 flex-1 flex-col space-y-3 overflow-y-auto sm:space-y-6 lg:overflow-y-auto">
          <div className="border border-slate-200 bg-white px-4 py-4 sm:px-6 sm:py-5">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              {title}
            </h1>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">{subtitle}</p>
            <div className="mt-3 border-l-4 border-sky-700 bg-sky-50 px-3 py-2.5 text-xs text-sky-900 sm:mt-4 sm:px-4 sm:py-3 sm:text-sm">
              Bienvenido(a) <strong>{user.fullName}</strong>, has ingresado como{' '}
              <strong>{user.role}</strong>.
            </div>
          </div>
          {children}
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
