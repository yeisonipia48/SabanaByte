import { API_CONFIG } from '../config/api'
import { friendlyErrorFromResponse } from './apiErrors'

export class HttpError extends Error {
  status: number
  detail: unknown

  constructor(message: string, status: number, detail?: unknown) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.detail = detail
  }
}

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

interface RequestOptions extends Omit<RequestInit, 'method' | 'body'> {
  body?: unknown
  query?: Record<string, unknown>
}

function buildQueryString(query?: Record<string, unknown>): string {
  if (!query) return ''

  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    params.append(key, String(value))
  }

  const qs = params.toString()

  return qs ? `?${qs}` : ''
}

function extractDetail(data: unknown): unknown {
  if (data !== null && typeof data === 'object' && 'detail' in data) {
    return (data as Record<string, unknown>).detail
  }

  return data
}

async function request<T>(
  path: string,
  method: HttpMethod,
  options: RequestOptions = {},
): Promise<T> {
  const { body, headers, query, ...rest } = options

  const finalHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...(headers as Record<string, string> | undefined),
  }

  if (body !== undefined) {
    finalHeaders['Content-Type'] = 'application/json'
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS)

  try {
    const response = await fetch(
      `${API_CONFIG.BASE_URL}${path}${buildQueryString(query)}`,
      {
        method,
        headers: finalHeaders,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
        ...rest,
      },
    )

    const raw = await response.text()
    let data: unknown = null

    if (raw.trim() !== '') {
      try {
        data = JSON.parse(raw)
      } catch {
        data = raw
      }
    }

    if (!response.ok) {
      const detail = extractDetail(data)
      throw new HttpError(
        friendlyErrorFromResponse(response.status, detail),
        response.status,
        detail,
      )
    }

    if (response.status === 204 || raw.trim() === '') {
      return undefined as T
    }

    return data as T
  } catch (error) {
    if (error instanceof HttpError) {
      throw error
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new HttpError(
        'La solicitud tardó demasiado. Intenta de nuevo.',
        0,
      )
    }

    throw new HttpError(
      'No pudimos conectar con el servicio. Revisa tu conexión e intenta de nuevo.',
      0,
    )
  } finally {
    clearTimeout(timeoutId)
  }
}

export const httpClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, 'GET', options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, 'POST', { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, 'PATCH', { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, 'PUT', { ...options, body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, 'DELETE', options),
}

export default httpClient
