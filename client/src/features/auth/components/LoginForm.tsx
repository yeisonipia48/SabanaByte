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
  LockKeyhole,
  LogIn,
  Search,
  Smartphone,
  UserPlus,
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
  'w-full pl-10 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm text-slate-800 font-medium placeholder-slate-400 focus:bg-white focus:ring-2 transition-all'

function fieldClasses(hasError: boolean, spacing = 'pr-4') {
  const stateClasses = hasError
    ? 'border-rose-400 focus:ring-rose-500 focus:border-rose-500'
    : 'border-slate-200 focus:ring-sky-600 focus:border-sky-600'

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
      className="lg:col-span-7 p-6 sm:p-9 md:p-10 flex flex-col justify-between bg-white"
      data-purpose="login-form-wrapper"
    >
      <div className="w-full">
        <header className="flex items-center justify-between gap-3 mb-5">
          <BrandLogo />
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs font-semibold shrink-0">
            <LockKeyhole
              className="w-3.5 h-3.5 text-emerald-600"
              aria-hidden="true"
            />
            <span>Portal Seguro</span>
          </div>
        </header>

        <div className="mb-5">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Bienvenido a tu Portal EPS
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Ingresa tus credenciales para administrar tus servicios de salud y
            novedades de afiliación.
          </p>
        </div>

        <RoleTabs value={role} onChange={setRole} />

        <aside
          className="mb-5 bg-sky-50/80 border border-sky-100 rounded-xl p-3 flex items-start gap-2.5 text-xs text-sky-800"
          data-purpose="notification-banner"
        >
          <Info
            className="w-4 h-4 text-sky-600 shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <p className="leading-relaxed">
            <strong className="font-semibold text-sky-950">Afiliado:</strong> Si
            tu documento fue emitido recientemente o cumples 18 años, recuerda
            actualizar a Cédula de Ciudadanía.
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
              <div className="flex items-center justify-between gap-2 mb-1">
                <label
                  className="text-xs font-bold text-slate-700"
                  htmlFor="doc-type"
                >
                  Tipo de Documento <span className="text-rose-500">*</span>
                </label>
                <a
                  className="text-xs font-semibold text-sky-700 hover:text-sky-900 hover:underline"
                  href="#"
                >
                  ¿Dudas con tu tipo?
                </a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <IdCard className="w-4 h-4" aria-hidden="true" />
                </div>
                <select
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 bg-none border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-sky-600 focus:border-sky-600 transition-all appearance-none"
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
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                  <ChevronDown className="w-4 h-4" aria-hidden="true" />
                </div>
              </div>
            </div>

            <div>
              <label
                className="block text-xs font-bold text-slate-700 mb-1"
                htmlFor="doc-number"
              >
                Número de Identificación{' '}
                <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Hash className="w-4 h-4" aria-hidden="true" />
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
                  className="mt-1 text-[11px] font-medium text-rose-600"
                  id="doc-number-error"
                >
                  {errors.docNumber}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <label
                  className="text-xs font-bold text-slate-700"
                  htmlFor="password"
                >
                  Contraseña de Acceso{' '}
                  <span className="text-rose-500">*</span>
                </label>
                <a
                  className="text-xs font-semibold text-sky-700 hover:text-sky-900 hover:underline"
                  href="#"
                >
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" aria-hidden="true" />
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
                  onChange={(event) => handlePasswordChange(event.target.value)}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={
                    errors.password ? 'password-error' : undefined
                  }
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 rounded-md"
                  aria-label={
                    showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                  }
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p
                  className="mt-1 text-[11px] font-medium text-rose-600"
                  id="password-error"
                >
                  {errors.password}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
              <label
                className="flex items-center gap-2 cursor-pointer select-none"
                htmlFor="remember-document"
              >
                <input
                  className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
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
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                href="#"
              >
                <Smartphone className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Ingreso con Token SMS</span>
              </a>
            </div>

            <div className="space-y-3" aria-live="polite">
              {submitError && (
                <div
                  className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700"
                  role="alert"
                >
                  <CircleAlert
                    className="w-4 h-4 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <p className="leading-relaxed">{submitError}</p>
                </div>
              )}
              {successMessage && (
                <div
                  className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800"
                  role="status"
                >
                  <CheckCircle2
                    className="w-4 h-4 shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <p className="leading-relaxed">{successMessage}</p>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                className="w-full py-3 px-4 bg-sky-700 hover:bg-sky-800 active:bg-sky-900 disabled:cursor-not-allowed disabled:hover:bg-sky-700 text-white font-bold rounded-xl shadow-md shadow-sky-900/10 transition-all flex items-center justify-center gap-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2
                    className="w-4 h-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <LogIn className="w-4 h-4" aria-hidden="true" />
                )}
                <span>
                  {isSubmitting ? 'Ingresando…' : 'Ingresar al Portal'}
                </span>
              </button>
            </div>
          </form>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 mt-4 pt-1 text-xs font-semibold text-slate-600">
          <a
            className="flex items-center gap-1.5 text-sky-800 hover:underline"
            href="#"
          >
            <UserPlus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>¿Aún no tienes cuenta? Regístrate aquí</span>
          </a>
          <span className="hidden sm:inline-block text-slate-300" aria-hidden="true">
            •
          </span>
          <a
            className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 hover:underline"
            href="#"
          >
            <Search className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Consultar afiliación sin entrar</span>
          </a>
        </div>
      </div>

    </section>
  )
}

export default LoginForm
