import { useRef, useState, type FormEvent } from 'react'
import {
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Eye,
  EyeOff,
  IdCard,
  Loader2,
  Lock,
  LogIn,
  Mail,
  UserPlus,
  UserRound,
} from 'lucide-react'
import { login, register } from '../authService'
import type { AuthUser } from '../types'
import BrandLogo from './BrandLogo'

const DOCUMENT_TYPES = [
  { value: 'CC', label: 'CC - Cédula de Ciudadanía' },
  { value: 'TI', label: 'TI - Tarjeta de Identidad' },
  { value: 'CE', label: 'CE - Cédula de Extranjería' },
  { value: 'PA', label: 'PA - Pasaporte' },
] as const

const DEFAULT_DOCUMENT_TYPE = 'CC'
const REMEMBER_KEY = 'sabanaByte.login.remember'

interface FormErrors {
  documentNumber?: string
  password?: string
  fullName?: string
  email?: string
  confirmPassword?: string
}

interface RememberedCredentials {
  documentType: string
  documentNumber: string
  remember: boolean
}

function readRememberedCredentials(): RememberedCredentials {
  const fallback: RememberedCredentials = {
    documentType: DEFAULT_DOCUMENT_TYPE,
    documentNumber: '',
    remember: false,
  }

  try {
    const stored = localStorage.getItem(REMEMBER_KEY)
    if (!stored) return fallback

    const parsed: unknown = JSON.parse(stored)
    if (typeof parsed !== 'object' || parsed === null) return fallback

    const record = parsed as Record<string, unknown>
    const documentType =
      typeof record.documentType === 'string' &&
      DOCUMENT_TYPES.some((type) => type.value === record.documentType)
        ? record.documentType
        : DEFAULT_DOCUMENT_TYPE
    const documentNumber =
      typeof record.documentNumber === 'string' ? record.documentNumber : ''

    return { documentType, documentNumber, remember: documentNumber.length > 0 }
  } catch {
    return fallback
  }
}

function persistRememberedCredentials(
  documentType: string,
  documentNumber: string,
) {
  try {
    localStorage.setItem(
      REMEMBER_KEY,
      JSON.stringify({ documentType, documentNumber }),
    )
  } catch {
    // Almacenamiento no disponible
  }
}

function clearRememberedCredentials() {
  try {
    localStorage.removeItem(REMEMBER_KEY)
  } catch {
    // Almacenamiento no disponible
  }
}

function validateLoginForm(
  documentNumber: string,
  password: string,
): FormErrors {
  const errors: FormErrors = {}
  const trimmedDocumentNumber = documentNumber.trim()

  if (!trimmedDocumentNumber) {
    errors.documentNumber = 'Ingresa tu número de documento.'
  }

  if (!password) {
    errors.password = 'Ingresa tu contraseña.'
  } else if (password.length < 6) {
    errors.password = 'La contraseña debe tener al menos 6 caracteres.'
  }

  return errors
}

function validateRegisterForm(
  documentNumber: string,
  fullName: string,
  email: string,
  password: string,
  confirmPassword: string,
): FormErrors {
  const errors: FormErrors = {}
  const trimmedDocumentNumber = documentNumber.trim()
  const trimmedFullName = fullName.trim()
  const trimmedEmail = email.trim()

  if (!trimmedDocumentNumber) {
    errors.documentNumber = 'Ingresa tu número de documento.'
  }

  if (!trimmedFullName) {
    errors.fullName = 'Ingresa tu nombre completo.'
  }

  if (!trimmedEmail) {
    errors.email = 'Ingresa tu correo electrónico.'
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      errors.email = 'Ingresa un correo electrónico válido.'
    }
  }

  if (!password) {
    errors.password = 'Ingresa tu contraseña.'
  } else if (password.length < 6) {
    errors.password = 'La contraseña debe tener al menos 6 caracteres.'
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Confirma tu contraseña.'
  } else if (password && confirmPassword && password !== confirmPassword) {
    errors.confirmPassword = 'Las contraseñas no coinciden.'
  }

  return errors
}

const baseFieldClasses =
  'w-full border bg-white py-1.5 pl-10 text-xs text-slate-900 placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 sm:py-2 sm:text-sm dark:bg-zinc-950/60 dark:text-zinc-100 dark:placeholder-zinc-500'

function fieldClasses(hasError: boolean, spacing = 'pr-4') {
  const stateClasses = hasError
    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/25 dark:border-rose-500/70 dark:focus:border-rose-500'
    : 'border-slate-300 focus:border-sky-700 focus:ring-sky-700/25 dark:border-zinc-700 dark:focus:border-sky-700'

  return `${baseFieldClasses} ${spacing} ${stateClasses}`
}

interface LoginFormProps {
  onLoginSuccess: (user: AuthUser, token: string, remember: boolean) => void
}

type AuthMode = 'login' | 'register'

function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [remembered] = useState(readRememberedCredentials)
  const [mode, setMode] = useState<AuthMode>('login')
  const [docType, setDocType] = useState(remembered.documentType)
  const [documentNumber, setDocumentNumber] = useState(remembered.documentNumber)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [remember, setRemember] = useState(remembered.remember)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const documentNumberRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const fullNameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const confirmPasswordRef = useRef<HTMLInputElement>(null)

  function clearMessages() {
    setSubmitError(null)
    setSuccessMessage(null)
  }

  function handleDocumentNumberChange(value: string) {
    setDocumentNumber(value)
    setErrors((previous) => {
      const next = { ...previous }
      if (next.documentNumber) delete next.documentNumber
      return next
    })
    clearMessages()
  }

  function handleFullNameChange(value: string) {
    setFullName(value)
    setErrors((previous) => {
      const next = { ...previous }
      if (next.fullName) delete next.fullName
      return next
    })
    clearMessages()
  }

  function handleEmailChange(value: string) {
    setEmail(value)
    setErrors((previous) => {
      const next = { ...previous }
      if (next.email) delete next.email
      return next
    })
    clearMessages()
  }

  function handlePasswordChange(value: string) {
    setPassword(value)
    setErrors((previous) => {
      const next = { ...previous }
      if (next.password) delete next.password
      if (next.confirmPassword) delete next.confirmPassword
      return next
    })
    clearMessages()
  }

  function handleConfirmPasswordChange(value: string) {
    setConfirmPassword(value)
    setErrors((previous) => {
      const next = { ...previous }
      if (next.confirmPassword) delete next.confirmPassword
      return next
    })
    clearMessages()
  }

  function handleRememberChange(checked: boolean) {
    setRemember(checked)
    if (!checked) clearRememberedCredentials()
  }

  function switchToLogin() {
    setMode('login')
    setErrors({})
    setSubmitError(null)
    setSuccessMessage(null)
    setConfirmPassword('')
    setShowConfirmPassword(false)
    setIsSubmitting(false)
  }

  function switchToRegister() {
    setMode('register')
    setErrors({})
    setSubmitError(null)
    setSuccessMessage(null)
    setIsSubmitting(false)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return

    setSubmitError(null)
    setSuccessMessage(null)

    if (mode === 'login') {
      const nextErrors = validateLoginForm(documentNumber, password)
      setErrors(nextErrors)

      if (nextErrors.documentNumber) {
        documentNumberRef.current?.focus()
        return
      }
      if (nextErrors.password) {
        passwordRef.current?.focus()
        return
      }

      setIsSubmitting(true)

      try {
        const result = await login({
          documentType: docType,
          documentNumber: documentNumber.trim(),
          password,
          remember,
        })

        if (result.ok && result.user && result.token) {
          setSuccessMessage(result.message)
          setPassword('')
          if (remember) {
            persistRememberedCredentials(docType, documentNumber.trim())
          } else {
            clearRememberedCredentials()
          }
          onLoginSuccess(result.user, result.token, remember)
        } else {
          setSubmitError(result.message)
        }
      } catch {
        setSubmitError(
          'Ocurrió un error inesperado. Intenta de nuevo en unos segundos.',
        )
      } finally {
        setIsSubmitting(false)
      }

      return
    }

    const nextErrors = validateRegisterForm(documentNumber, fullName, email, password, confirmPassword)
    setErrors(nextErrors)

    if (nextErrors.documentNumber) {
      documentNumberRef.current?.focus()
      return
    }
    if (nextErrors.fullName) {
      fullNameRef.current?.focus()
      return
    }
    if (nextErrors.email) {
      emailRef.current?.focus()
      return
    }
    if (nextErrors.password) {
      passwordRef.current?.focus()
      return
    }
    if (nextErrors.confirmPassword) {
      confirmPasswordRef.current?.focus()
      return
    }

    setIsSubmitting(true)

    try {
      const result = await register({
        documentType: docType,
        documentNumber: documentNumber.trim(),
        fullName,
        email,
        password,
        confirmPassword,
        remember,
      })

      if (result.ok && result.user && result.token) {
        setSuccessMessage(result.message)
        setPassword('')
        setConfirmPassword('')
        if (remember) {
          persistRememberedCredentials(docType, documentNumber.trim())
        } else {
          clearRememberedCredentials()
        }
        onLoginSuccess(result.user, result.token, remember)
      } else {
        setSubmitError(result.message)
      }
    } catch {
      setSubmitError(
        'Ocurrió un error inesperado. Intenta de nuevo en unos segundos.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section
      className="flex h-full min-h-0 flex-col bg-white dark:bg-zinc-950"
      data-purpose="login-form-wrapper"
    >
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[580px] flex-col justify-center overflow-hidden px-4 sm:px-6 lg:px-10 xl:px-12">
        <div className="w-full">
          <header className="mb-2 flex items-center justify-between gap-3 sm:mb-3 lg:mb-3">
            <BrandLogo />
          </header>

          <div className="mb-2 sm:mb-3 lg:mb-3">
            <h2 className="text-[22px] font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-zinc-100">
              {mode === 'login' ? 'Bienvenido a tu Portal SabanaByte' : 'Crea tu cuenta en SabanaByte'}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:mt-1.5 sm:text-sm dark:text-zinc-400">
              {mode === 'login'
                ? 'Ingresa tu número de documento y contraseña para acceder a tu portal.'
                : 'Regístrate como Paciente para agendar y gestionar tus citas médicas.'}
            </p>
          </div>

          <div
            id="login-panel"
            role="tabpanel"
            className="rounded-[30px] border border-t-4 border-sky-800 bg-white p-4 sm:p-5 lg:p-5 dark:border-zinc-800 dark:border-t-sky-900 dark:bg-zinc-900/60"
          >
            <form
              className="space-y-2 sm:space-y-2.5 lg:space-y-2.5"
              data-purpose="auth-form"
              noValidate
              aria-busy={isSubmitting}
              onSubmit={handleSubmit}
            >
              <div>
                <label
                  className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300"
                  htmlFor="doc-type"
                >
                  Tipo de Documento
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 dark:text-zinc-500">
                    <IdCard className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <select
                    className="w-full appearance-none border border-slate-300 bg-white bg-none py-1.5 pl-10 pr-10 text-xs text-slate-900 transition-colors focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700/25 sm:py-2 sm:text-sm dark:border-zinc-700 dark:bg-zinc-950/60 dark:text-zinc-100 dark:focus:border-sky-700"
                    id="doc-type"
                    value={docType}
                    onChange={(event) => {
                      setDocType(event.target.value)
                      setSubmitError(null)
                      setSuccessMessage(null)
                    }}
                  >
                    {DOCUMENT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 dark:text-zinc-500">
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  </div>
                </div>
              </div>

              <div>
                <label
                  className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300"
                  htmlFor="documentNumber"
                >
                  Número de documento <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 dark:text-zinc-500">
                    <IdCard className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <input
                    ref={documentNumberRef}
                    className={fieldClasses(Boolean(errors.documentNumber))}
                    id="documentNumber"
                    type="text"
                    inputMode="numeric"
                    autoComplete={mode === 'login' ? 'username' : 'off'}
                    required
                    placeholder="Ej. 1023456789"
                    value={documentNumber}
                    onChange={(event) =>
                      handleDocumentNumberChange(event.target.value)
                    }
                    aria-invalid={Boolean(errors.documentNumber)}
                    aria-describedby={
                      errors.documentNumber ? 'documentNumber-error' : undefined
                    }
                  />
                </div>
                {errors.documentNumber && (
                  <p
                    className="mt-1.5 text-[11px] font-medium text-rose-600 dark:text-rose-400"
                    id="documentNumber-error"
                  >
                    {errors.documentNumber}
                  </p>
                )}
              </div>

              {mode === 'register' && (
                <>
                  <div>
                    <label
                      className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300"
                      htmlFor="fullName"
                    >
                      Nombre completo <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 dark:text-zinc-500">
                        <UserRound className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <input
                        ref={fullNameRef}
                        className={fieldClasses(Boolean(errors.fullName))}
                        id="fullName"
                        type="text"
                        autoComplete="name"
                        required
                        placeholder="Ej. Ana María López Rodríguez"
                        value={fullName}
                        onChange={(event) => handleFullNameChange(event.target.value)}
                        aria-invalid={Boolean(errors.fullName)}
                        aria-describedby={errors.fullName ? 'fullName-error' : undefined}
                      />
                    </div>
                    {errors.fullName && (
                      <p
                        className="mt-1.5 text-[11px] font-medium text-rose-600 dark:text-rose-400"
                        id="fullName-error"
                      >
                        {errors.fullName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300"
                      htmlFor="email"
                    >
                      Correo electrónico <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 dark:text-zinc-500">
                        <Mail className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <input
                        ref={emailRef}
                        className={fieldClasses(Boolean(errors.email))}
                        id="email"
                        type="email"
                        autoComplete="email"
                        required
                        placeholder="Ej. ana.lopez@correo.com"
                        value={email}
                        onChange={(event) => handleEmailChange(event.target.value)}
                        aria-invalid={Boolean(errors.email)}
                        aria-describedby={errors.email ? 'email-error' : undefined}
                      />
                    </div>
                    {errors.email && (
                      <p
                        className="mt-1.5 text-[11px] font-medium text-rose-600 dark:text-rose-400"
                        id="email-error"
                      >
                        {errors.email}
                      </p>
                    )}
                  </div>
                </>
              )}

              <div>
                <label
                  className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300"
                  htmlFor="password"
                >
                  Contraseña <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 dark:text-zinc-500">
                    <Lock className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <input
                    ref={passwordRef}
                    className={fieldClasses(Boolean(errors.password), 'pr-10')}
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    required
                    placeholder={mode === 'login' ? 'Introduce tu contraseña' : 'Crea una contraseña'}
                    value={password}
                    onChange={(event) =>
                      handlePasswordChange(event.target.value)
                    }
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={
                      errors.password ? 'password-error' : undefined
                    }
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-sky-700"
                    aria-label={
                      showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                    }
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((visible) => !visible)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p
                    className="mt-1.5 text-[11px] font-medium text-rose-600 dark:text-rose-400"
                    id="password-error"
                  >
                    {errors.password}
                  </p>
                )}
              </div>

              {mode === 'register' && (
                <div>
                  <label
                    className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300"
                    htmlFor="confirmPassword"
                  >
                    Confirmar contraseña <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 dark:text-zinc-500">
                      <Lock className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <input
                      ref={confirmPasswordRef}
                      className={fieldClasses(Boolean(errors.confirmPassword), 'pr-10')}
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      placeholder="Repite tu contraseña"
                      value={confirmPassword}
                      onChange={(event) => handleConfirmPasswordChange(event.target.value)}
                      aria-invalid={Boolean(errors.confirmPassword)}
                      aria-describedby={
                        errors.confirmPassword ? 'confirmPassword-error' : undefined
                      }
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-sky-700 dark:text-zinc-500 dark:hover:text-zinc-300"
                      aria-label={
                        showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                      }
                      aria-pressed={showConfirmPassword}
                      onClick={() => setShowConfirmPassword((visible) => !visible)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p
                      className="mt-1.5 text-[11px] font-medium text-rose-600 dark:text-rose-400"
                      id="confirmPassword-error"
                    >
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                <label
                  className="flex cursor-pointer select-none items-center gap-2"
                  htmlFor="remember-document"
                >
                  <input
                    className="h-4 w-4 rounded-none border-slate-300 text-sky-700 focus:ring-sky-600 dark:border-zinc-700 dark:bg-zinc-900"
                    id="remember-document"
                    type="checkbox"
                    checked={remember}
                    onChange={(event) =>
                      handleRememberChange(event.target.checked)
                    }
                  />
                  <span className="text-xs text-slate-600 dark:text-zinc-400">
                    Recordar en este dispositivo
                  </span>
                </label>
              </div>

              <div className="space-y-3" aria-live="polite">
                {submitError && (
                  <div
                    className="flex items-start gap-2 border border-rose-200 border-l-4 border-l-rose-600 bg-rose-50 px-3 py-2.5 text-xs text-rose-700 dark:border-rose-900/60 dark:border-l-rose-800 dark:bg-rose-950/25 dark:text-rose-300"
                    role="alert"
                  >
                    <CircleAlert
                      className="mt-0.5 h-4 w-4 shrink-0"
                      aria-hidden="true"
                    />
                    <p className="leading-relaxed">{submitError}</p>
                  </div>
                )}
                {successMessage && (
                  <div
                    className="flex items-start gap-2 border border-emerald-200 border-l-4 border-l-emerald-600 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-800 dark:border-emerald-900/60 dark:border-l-emerald-800 dark:bg-emerald-950/25 dark:text-emerald-300"
                    role="status"
                  >
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0"
                      aria-hidden="true"
                    />
                    <p className="leading-relaxed">{successMessage}</p>
                  </div>
                )}
              </div>

              <div className="pt-1">
                <button
                  className="flex w-full items-center justify-center gap-2 bg-sky-800 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-sky-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-800 disabled:cursor-not-allowed disabled:bg-sky-800/70 disabled:hover:bg-sky-800/70 sm:py-2.5 sm:text-[13px] dark:bg-sky-900 dark:hover:bg-sky-800 dark:disabled:bg-sky-900/60 dark:disabled:hover:bg-sky-900/60"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : mode === 'login' ? (
                    <LogIn className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <UserPlus className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span>
                    {isSubmitting
                      ? mode === 'login'
                        ? 'Ingresando…'
                        : 'Registrando…'
                      : mode === 'login'
                        ? 'Ingresar al Portal'
                        : 'Registrarme como Paciente'}
                  </span>
                </button>
              </div>
            </form>
          </div>

          <div className="mt-2 text-center text-xs text-slate-600 sm:mt-2.5 dark:text-zinc-400">
            {mode === 'login' ? (
              <p>
                ¿No tienes cuenta?{' '}
                <button
                  type="button"
                  className="font-semibold text-sky-800 underline-offset-2 hover:text-sky-900 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-800 dark:text-sky-300 dark:hover:text-sky-200"
                  onClick={switchToRegister}
                >
                  Registrarte
                </button>
              </p>
            ) : (
              <p>
                ¿Ya tienes cuenta?{' '}
                <button
                  type="button"
                  className="font-semibold text-sky-800 underline-offset-2 hover:text-sky-900 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-800 dark:text-sky-300 dark:hover:text-sky-200"
                  onClick={switchToLogin}
                >
                  Iniciar sesión
                </button>
              </p>
            )}
          </div>

        
        </div>
      </div>
    </section>
  )
}

export default LoginForm
