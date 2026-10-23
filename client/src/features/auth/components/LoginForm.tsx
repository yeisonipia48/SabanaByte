import { useRef, useState, type FormEvent } from 'react'
import {
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Eye,
  EyeOff,
  Hash,
  IdCard,
  Info,
  Loader2,
  Lock,
  LogIn,

  Smartphone,

} from 'lucide-react'
import { login } from '../authService'
import type { Role } from '../types'
import BrandLogo from './BrandLogo'
import RoleTabs from './RoleTabs'

const DOCUMENT_TYPES = [
  { value: 'CC', label: 'CC - Cédula de Ciudadanía' },
  { value: 'TI', label: 'TI - Tarjeta de Identidad' },
  { value: 'CE', label: 'CE - Cédula de Extranjería' },
  { value: 'PA', label: 'PA - Pasaporte' },
  { value: 'RC', label: 'RC - Registro Civil' },
  { value: 'PPT', label: 'PPT - Permiso por Protección Temporal' },
] as const

const DEFAULT_DOCUMENT_TYPE = 'CC'
const REMEMBER_KEY = 'sabanaByte.login.remember'
const DOCUMENT_PATTERN = /^[A-Za-z0-9-]{5,20}$/

interface FormErrors {
  docNumber?: string
  password?: string
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
    // Almacenamiento no disponible: el recordatorio es opcional.
  }
}

function clearRememberedCredentials() {
  try {
    localStorage.removeItem(REMEMBER_KEY)
  } catch {
    // Almacenamiento no disponible: nada que limpiar.
  }
}

function validateForm(documentNumber: string, password: string): FormErrors {
  const errors: FormErrors = {}
  const trimmedDocument = documentNumber.trim()

  if (!trimmedDocument) {
    errors.docNumber = 'Ingresa tu número de identificación.'
  } else if (!DOCUMENT_PATTERN.test(trimmedDocument)) {
    errors.docNumber =
      'Usa entre 5 y 20 caracteres alfanuméricos, sin espacios.'
  }

  if (!password) {
    errors.password = 'Ingresa tu contraseña.'
  } else if (password.length < 6) {
    errors.password = 'La contraseña debe tener al menos 6 caracteres.'
  }

  return errors
}

const baseFieldClasses =
  'w-full border bg-white py-2.5 pl-10 text-xs text-slate-900 placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 sm:text-sm'

function fieldClasses(hasError: boolean, spacing = 'pr-4') {
  const stateClasses = hasError
    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/25'
    : 'border-slate-300 focus:border-sky-700 focus:ring-sky-700/25'

  return `${baseFieldClasses} ${spacing} ${stateClasses}`
}

function LoginForm() {
  const [remembered] = useState(readRememberedCredentials)
  const [role, setRole] = useState<Role>('afiliado')
  const [docType, setDocType] = useState(remembered.documentType)
  const [docNumber, setDocNumber] = useState(remembered.documentNumber)
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(remembered.remember)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const docNumberRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  function handleDocNumberChange(value: string) {
    setDocNumber(value)
    setErrors((previous) =>
      previous.docNumber ? { ...previous, docNumber: undefined } : previous,
    )
    setSubmitError(null)
    setSuccessMessage(null)
  }

  function handlePasswordChange(value: string) {
    setPassword(value)
    setErrors((previous) =>
      previous.password ? { ...previous, password: undefined } : previous,
    )
    setSubmitError(null)
    setSuccessMessage(null)
  }

  function handleRememberChange(checked: boolean) {
    setRemember(checked)
    if (!checked) clearRememberedCredentials()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return

    setSubmitError(null)
    setSuccessMessage(null)

    const nextErrors = validateForm(docNumber, password)
    setErrors(nextErrors)

    if (nextErrors.docNumber) {
      docNumberRef.current?.focus()
      return
    }
    if (nextErrors.password) {
      passwordRef.current?.focus()
      return
    }

    setIsSubmitting(true)

    try {
      const result = await login({
        role,
        documentType: docType,
        documentNumber: docNumber.trim(),
        password,
        remember,
      })

      if (result.ok) {
        setSuccessMessage(result.message)
        setPassword('')
        if (remember) {
          persistRememberedCredentials(docType, docNumber.trim())
        } else {
          clearRememberedCredentials()
        }
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
      className="login-scroll bg-white lg:col-span-7 lg:h-dvh lg:overflow-y-auto"
      data-purpose="login-form-wrapper"
    >
      <div className="mx-auto flex min-h-full w-full max-w-[540px] flex-col justify-between px-5 py-8 sm:px-8 sm:py-8 lg:px-10 lg:py-9 xl:px-12">
        <div className="w-full">
          <header className="mb-5 flex items-center justify-between gap-3">
            <BrandLogo />

          </header>

          <div className="mb-5">
            <h2 className="text-[26px] font-bold tracking-tight text-slate-900 sm:text-3xl">
              Bienvenido a tu Portal EPS
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-500 sm:text-sm">
              Ingresa tus credenciales para administrar tus servicios de salud y
              novedades de afiliación.
            </p>
          </div>

          <RoleTabs value={role} onChange={setRole} />

          <aside
            className="mb-5 flex items-start gap-2.5 border-l-4 border-sky-700 bg-sky-50 py-2.5 pl-3 pr-3.5 text-xs text-sky-900"
            data-purpose="notification-banner"
          >
            <Info
              className="mt-0.5 h-4 w-4 shrink-0 text-sky-700"
              aria-hidden="true"
            />
            <p className="leading-relaxed">
              <strong className="font-semibold text-sky-950">Afiliado:</strong>{' '}
              Si tu documento fue emitido recientemente o cumples 18 años,
              recuerda actualizar a Cédula de Ciudadanía.
            </p>
          </aside>

          <div
            id="login-panel"
            role="tabpanel"
            aria-labelledby={`role-tab-${role}`}
          >
            <form
              className="space-y-4"
              data-purpose="auth-form"
              noValidate
              aria-busy={isSubmitting}
              onSubmit={handleSubmit}
            >
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <label
                    className="text-[11px] font-bold uppercase tracking-wider text-slate-600"
                    htmlFor="doc-type"
                  >
                    Tipo de Documento{' '}
                    <span className="text-rose-500">*</span>
                  </label>
                  <a
                    className="text-[11px] font-semibold text-sky-700 hover:text-sky-900 hover:underline"
                    href="#"
                  >
                    ¿Dudas con tu tipo?
                  </a>
                </div>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <IdCard className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <select
                    className="w-full appearance-none border border-slate-300 bg-white bg-none py-2.5 pl-10 pr-10 text-xs text-slate-900 transition-colors focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700/25 sm:text-sm"
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
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  </div>
                </div>
              </div>

              <div>
                <label
                  className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-600"
                  htmlFor="doc-number"
                >
                  Número de Identificación{' '}
                  <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Hash className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <input
                    ref={docNumberRef}
                    className={fieldClasses(Boolean(errors.docNumber))}
                    id="doc-number"
                    type="text"
                    inputMode="text"
                    autoComplete="username"
                    required
                    placeholder="Ej. 1020345678"
                    value={docNumber}
                    onChange={(event) =>
                      handleDocNumberChange(event.target.value)
                    }
                    aria-invalid={Boolean(errors.docNumber)}
                    aria-describedby={
                      errors.docNumber ? 'doc-number-error' : undefined
                    }
                  />
                </div>
                {errors.docNumber && (
                  <p
                    className="mt-1.5 text-[11px] font-medium text-rose-600"
                    id="doc-number-error"
                  >
                    {errors.docNumber}
                  </p>
                )}
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <label
                    className="text-[11px] font-bold uppercase tracking-wider text-slate-600"
                    htmlFor="password"
                  >
                    Contraseña de Acceso{' '}
                    <span className="text-rose-500">*</span>
                  </label>
                  <a
                    className="text-[11px] font-semibold text-sky-700 hover:text-sky-900 hover:underline"
                    href="#"
                  >
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Lock className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <input
                    ref={passwordRef}
                    className={fieldClasses(Boolean(errors.password), 'pr-10')}
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    placeholder="Introduce tu clave secreta"
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
                    className="mt-1.5 text-[11px] font-medium text-rose-600"
                    id="password-error"
                  >
                    {errors.password}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                <label
                  className="flex cursor-pointer select-none items-center gap-2"
                  htmlFor="remember-document"
                >
                  <input
                    className="h-4 w-4 rounded-none border-slate-300 text-sky-700 focus:ring-sky-600"
                    id="remember-document"
                    type="checkbox"
                    checked={remember}
                    onChange={(event) =>
                      handleRememberChange(event.target.checked)
                    }
                  />
                  <span className="text-xs text-slate-600">
                    Recordar documento en este dispositivo
                  </span>
                </label>
                <a
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800"
                  href="#"
                >
                  <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Ingreso con Token SMS</span>
                </a>
              </div>

              <div className="space-y-3" aria-live="polite">
                {submitError && (
                  <div
                    className="flex items-start gap-2 border border-rose-200 border-l-4 border-l-rose-600 bg-rose-50 px-3 py-2.5 text-xs text-rose-700"
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
                    className="flex items-start gap-2 border border-emerald-200 border-l-4 border-l-emerald-600 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-800"
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
                  className="flex w-full items-center justify-center gap-2 bg-sky-800 px-4 py-3 text-[13px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-sky-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-800 disabled:cursor-not-allowed disabled:bg-sky-800/70 disabled:hover:bg-sky-800/70"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <LogIn className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span>
                    {isSubmitting ? 'Ingresando…' : 'Ingresar al Portal'}
                  </span>
                </button>
              </div>
            </form>
          </div>


          {/* <div className="mt-4 flex flex-col items-start justify-between gap-3 border-t border-slate-100 pt-3 text-[11px] font-semibold text-slate-600 sm:flex-row sm:items-center">
            <a
              className="flex items-center gap-1.5 text-sky-800 hover:underline"
              href="#"
            >
              <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>¿Aún no tienes cuenta? Regístrate aquí</span>
            </a>
            <a
              className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 hover:underline"
              href="#"
            >
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Consultar afiliación sin entrar</span>
            </a>
          </div>*/}
        </div>

      </div>
    </section>
  )
}

export default LoginForm
