import { API_CONFIG } from '../config/api'

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
}

async function request<T>(path: string, method: HttpMethod, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options

  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string> | undefined),
  }

  const response = await fetch(`${API_CONFIG.BASE_URL}${path}`, {
    method,
    headers: finalHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
    ...rest,
  })

  if (!response.ok) {
    let detail: unknown
    let message = response.statusText

    try {
      const data = await response.json()
      detail = data?.detail ?? data
      if (typeof data?.detail === 'string') {
        message = data.detail
      } else if (typeof data === 'string') {
        message = data
      }
    } catch {
      // ignore parse errors
    }

    throw new HttpError(message || 'Error de red', response.status, detail)
  }

  if (response.status === 204) {
    return undefined as T
  }

  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return (await response.json()) as T
  }

  // Fallback
  const text = await response.text()
  try {
    return JSON.parse(text) as T
  } catch {
    return text as unknown as T
  }
}

export const httpClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, 'GET', options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>(path, 'POST', { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>(path, 'PATCH', { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>(path, 'PUT', { ...options, body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>(path, 'DELETE', options),
}

export default httpClient
