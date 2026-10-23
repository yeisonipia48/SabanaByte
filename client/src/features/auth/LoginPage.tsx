import InstitutionalHero from './components/InstitutionalHero'
import LoginForm from './components/LoginForm'

function LoginPage() {
  return (
    <div
      className="min-h-screen bg-slate-100/90 text-slate-800 flex items-center justify-center p-3 sm:p-6 md:p-8"
      data-purpose="public-login-page"
    >
      <main
        className="w-full max-w-[1140px] bg-white rounded-3xl overflow-hidden portal-card-shadow grid grid-cols-1 lg:grid-cols-12 min-h-[720px]"
        data-purpose="authentication-container"
      >
        <InstitutionalHero />
        <LoginForm />
      </main>
    </div>
  )
}

export default LoginPage
