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
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <BrandLogo />
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-slate-900">
                SabanaByte - Portal Transaccional
              </p>
              <p className="text-xs text-slate-500">Módulo por rol</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-900">
                {user.fullName}
              </p>
              <p className="text-xs text-slate-500">
                {user.role} | {user.username}
              </p>
            </div>
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-2 border border-slate-300 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[260px_1fr]">
        <aside className="border border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
            <Menu className="h-4 w-4 text-slate-500" aria-hidden="true" />
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Menú
            </p>
          </div>
          <nav className="flex flex-col">
            {navItems.map((item) => (
              <button
                key={item.label}
                className={`border-b border-slate-100 px-4 py-2.5 text-left text-sm transition-colors last:border-b-0 ${
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

        <main className="space-y-6">
          <div className="border border-slate-200 bg-white px-6 py-5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {title}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            <div className="mt-4 border-l-4 border-sky-700 bg-sky-50 px-4 py-3 text-sm text-sky-900">
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
