// Utilidades de autenticacion GISTO
// Usar en cualquier pagina que requiera login

export interface GistoUser {
  id: string
  email: string
  nombre: string
  plan: string
  creditos: number
}

export function getUser(): GistoUser | null {
  if (typeof window === 'undefined') return null
  const data = localStorage.getItem('gisto_user')
  if (!data) return null
  try {
    return JSON.parse(data)
  } catch {
    return null
  }
}

export function logout() {
  localStorage.removeItem('gisto_user')
  window.location.href = '/login'
}

export function requireAuth() {
  const user = getUser()
  if (!user) {
    window.location.href = '/login'
    return null
  }
  return user
}
