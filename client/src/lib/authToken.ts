const TOKEN_KEY = 'sabanaByte.token'

let memoryToken: string | null = null

export function setAuthToken(token: string | null): void {
  memoryToken = token

  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
  } catch {
    // Almacenamiento no disponible
  }
}

export function getAuthToken(): string | null {
  if (memoryToken) return memoryToken

  try {
    memoryToken = localStorage.getItem(TOKEN_KEY)
  } catch {
    memoryToken = null
  }

  return memoryToken
}

export function clearAuthToken(): void {
  setAuthToken(null)
}
