import InstitutionalHero from './components/InstitutionalHero'
import LoginForm from './components/LoginForm'
import MobileBrandBanner from './components/MobileBrandBanner'
import type { AuthUser } from './types'

interface LoginPageProps {
  onLoginSuccess: (user: AuthUser, token: string, remember: boolean) => void
}

function LoginPage({ onLoginSuccess }: LoginPageProps) {
  return (
    <div className="h-dvh overflow-hidden bg-white text-slate-800">
      <main
        className="grid h-dvh grid-cols-1 grid-rows-[auto_1fr] overflow-hidden bg-white lg:grid-cols-12 lg:grid-rows-1"
        data-purpose="public-login-page"
      >
        <MobileBrandBanner />

        <InstitutionalHero className="lg:col-span-6" />

        <section className="h-full min-h-0 overflow-hidden lg:col-span-6">
          <LoginForm onLoginSuccess={onLoginSuccess} />
        </section>
      </main>
    </div>
  )
}

export default LoginPage
