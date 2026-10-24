import InstitutionalHero from './components/InstitutionalHero'
import LoginForm from './components/LoginForm'
import MobileBrandBanner from './components/MobileBrandBanner'
import type { AuthUser } from './types'

interface LoginPageProps {
  onLoginSuccess: (user: AuthUser, token: string, remember: boolean) => void
}

function LoginPage({ onLoginSuccess }: LoginPageProps) {
  return (
    <div className="min-h-dvh bg-white text-slate-800">
      <main
        className="grid min-h-dvh grid-cols-1 bg-white lg:h-dvh lg:grid-cols-12"
        data-purpose="public-login-page"
      >
        <MobileBrandBanner />


        <InstitutionalHero className="lg:col-span-7" />


        <section className="flex items-center justify-center p-6 lg:col-span-5">
          <div className="w-full max-w-md">
            <LoginForm onLoginSuccess={onLoginSuccess} />
          </div>
        </section>
      </main>
    </div>
  )
}

export default LoginPage
