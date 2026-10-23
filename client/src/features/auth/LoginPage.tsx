import InstitutionalHero from './components/InstitutionalHero'
import LoginForm from './components/LoginForm'

function LoginPage() {
  return (
    <div
      data-purpose="public-login-page"
    >
      <main
        className="QuickHelp bg-white rounded-3xl overflow-hidden portal-card-shadow grid grid-cols-1 lg:grid-cols-12 min-h-[720px]"
        data-purpose="authentication-container"
      >
        <InstitutionalHero />
        <LoginForm />
      </main>
    </div>
  )
}

export default LoginPage
