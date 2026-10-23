import type { LoginPayload, LoginResult } from './types'

const SIMULATED_DELAY_MS = 900

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Autenticación simulada.
 *
 * Punto de integración: cuando exista la API real, reemplazar el cuerpo por la
 * petición HTTP correspondiente manteniendo la firma de la función.
 */
export async function login(payload: LoginPayload): Promise<LoginResult> {
  await wait(SIMULATED_DELAY_MS)

  if (!payload.documentNumber.trim() || !payload.password) {
    return {
      ok: false,
      message:
        'No pudimos validar tus credenciales. Revisa los datos e intenta de nuevo.',
    }
  }

  return {
    ok: true,
    message: 'Acceso simulado correcto. Bienvenido al portal de SabanaByte.',
  }
}
