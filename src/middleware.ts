import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED = ['/dashboard', '/upload', '/perfil', '/planes']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isProtected = PROTECTED.some(p => pathname.startsWith(p))

  if (isProtected) {
    const token = request.cookies.get('gisto_token')?.value
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Verificar que el token tiene estructura JWT válida (3 partes)
    const parts = token.split('.')
    if (parts.length !== 3) {
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('gisto_token')
      return response
    }

    // Verificar que el payload no esté expirado
    try {
      const payload = JSON.parse(atob(parts[1]))
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        const response = NextResponse.redirect(new URL('/login', request.url))
        response.cookies.delete('gisto_token')
        return response
      }
    } catch {
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('gisto_token')
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/upload/:path*', '/perfil/:path*', '/planes/:path*']
}
