import ThemeToggle from '../../components/ThemeToggle'
import InstitutionalHero from './components/InstitutionalHero'
import LoginForm from './components/LoginForm'
import MobileBrandBanner from './components/MobileBrandBanner'
import type { AuthUser } from './types'

interface LoginPageProps {
  onLoginSuccess: (user: AuthUser, token: string, remember: boolean) => void
}

function LoginPage({ onLoginSuccess }: LoginPageProps) {
  return (
    <div className="h-dvh overflow-hidden bg-white text-slate-800 dark:bg-zinc-950 dark:text-zinc-200">
      <main
        className="grid h-dvh grid-cols-1 grid-rows-[auto_1fr] overflow-hidden bg-white lg:grid-cols-12 lg:grid-rows-1 dark:bg-zinc-950"
        data-purpose="public-login-page"
      >
        <MobileBrandBanner />

        <InstitutionalHero className="lg:col-span-5" />

        <section className="flex h-full min-h-0 flex-col overflow-hidden lg:col-span-7">
          <div className="flex shrink-0 justify-end px-4 py-2 sm:px-6 lg:px-10 xl:px-12">
            <ThemeToggle />
          </div>
          <div className="min-h-0 flex-1">
            <LoginForm onLoginSuccess={onLoginSuccess} />
          </div>
        </section>
      </main>
    </div>
  )
}

export default LoginPage
