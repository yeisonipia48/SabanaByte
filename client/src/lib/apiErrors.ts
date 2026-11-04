const DEFAULT_FALLBACK = 'No pudimos completar la solicitud. Intenta de nuevo.'

const ERROR_TRANSLATIONS: Array<[string, string]> = [
  ['duplicate key', 'Ya existe una cuenta con ese documento o correo.'],
  ['llave duplicada', 'Ya existe una cuenta con ese documento o correo.'],
  ['usuarios_numero_documento_key', 'Ya existe una cuenta con ese documento.'],
  ['usuarios_email_key', 'Ya existe una cuenta con ese correo electrónico.'],
  ['El usuario con el documento no existe', 'No encontramos una cuenta con ese documento.'],
  ['No existe usuario con id', 'No encontramos tu cuenta. Cierra sesión e ingresa de nuevo.'],
  ['El cupo ya no está disponible', 'Ese cupo ya fue tomado. Elige otro horario.'],
  ['El cupo fue reservado por otro usuario', 'Ese cupo acaba de ser tomado. Elige otro horario.'],
  ['La agenda del cupo no está activa', 'Ese horario ya no está disponible.'],
  ['El cupo seleccionado ya pasó', 'Ese horario ya pasó. Elige uno nuevo.'],
  ['El paciente ya tiene una cita activa para esa fecha', 'Ya tienes una cita activa para ese día.'],
  [
    'El paciente ya tiene una solicitud activa en lista de espera',
    'Ya tienes una solicitud activa en la lista de espera.',
  ],
  ['La solicitud no tiene una oferta activa', 'Esa oferta ya no está disponible.'],
  ['La oferta expiró', 'La oferta expiró. Puedes volver a intentarlo.'],
  ['No existe cita con id', 'No encontramos esa cita.'],
  ['No existe entrada en lista de espera', 'No encontramos esa solicitud.'],
  ['No existe paciente con id', 'No encontramos tu perfil de paciente.'],
]

interface ErrorLike {
  status?: unknown
  detail?: unknown
  message?: unknown
}

function prettyJson(data: unknown): string {
  try {
    return JSON.stringify(data, null, 2) ?? 'null'
  } catch {
    return 'null'
  }
}

/**
 * Equivalente a api_error() de TestPhp/helpers.php.
 */
export function apiErrorDetail(detail: unknown): string {
  if (detail === undefined || detail === null || detail === '') {
    return 'Error desconocido'
  }

  if (typeof detail === 'string') {
    return detail
  }

  if (Array.isArray(detail)) {
    const parts = detail.map((item) => {
      if (item !== null && typeof item === 'object') {
        const record = item as Record<string, unknown>
        const location = Array.isArray(record.loc) ? record.loc.map(String).join('.') : ''
        const message =
          typeof record.msg === 'string' ? record.msg : prettyJson(item)

        return location !== '' ? `${location}: ${message}` : message
      }

      return String(item)
    })

    return parts.join(' | ')
  }

  if (typeof detail === 'object') {
    const record = detail as Record<string, unknown>
    if ('detail' in record) {
      return apiErrorDetail(record.detail)
    }

    return prettyJson(detail)
  }

  return String(detail)
}

function translate(message: string, fallback: string): string {
  for (const [needle, translation] of ERROR_TRANSLATIONS) {
    if (message.includes(needle)) {
      return translation
    }
  }

  return message !== '' ? message : fallback
}

/**
 * Equivalente a friendly_error() de TestPhp/helpers.php usando status + detail.
 */
export function friendlyErrorFromResponse(
  status: number,
  detail: unknown,
  fallback = DEFAULT_FALLBACK,
): string {
  if (status === 0) {
    return 'No pudimos conectar con el servicio. Revisa tu conexión e intenta de nuevo.'
  }

  if (status === 422) {
    return 'Revisa los datos ingresados e intenta de nuevo.'
  }

  if (status >= 500) {
    return 'Tuvimos un problema temporal. Intenta de nuevo en unos minutos.'
  }

  return translate(apiErrorDetail(detail), fallback)
}

/**
 * Traduce un error lanzado por httpClient (HttpError) o cualquier Error.
 */
export function friendlyErrorMessage(
  error: unknown,
  fallback = DEFAULT_FALLBACK,
): string {
  const record = (
    error !== null && typeof error === 'object' ? error : {}
  ) as ErrorLike

  if (typeof record.status !== 'number') {
    return typeof record.message === 'string' && record.message !== ''
      ? record.message
      : fallback
  }

  return friendlyErrorFromResponse(record.status, record.detail, fallback)
}

export { DEFAULT_FALLBACK }
