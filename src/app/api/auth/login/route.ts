import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { supabase } from '@/lib/supabase'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_cambiar'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 })
    }

    // Buscar usuario en Supabase. CITEXT en la columna Email hace que esta
    // búsqueda sea automáticamente insensible a mayúsculas — sin necesidad
    // de normalizar el email en el código.
    const { data: user, error } = await supabase
      .from('Usuarios')
      .select('id, Email, Password, Nombre, plan, creditos_minutos, Estado_Cuenta')
      .eq('Email', email)
      .maybeSingle()

    if (error) {
      console.error('Login — error Supabase:', error)
      return NextResponse.json({ error: 'Error de servidor' }, { status: 500 })
    }

    if (!user) {
      return NextResponse.json({ error: 'No existe una cuenta con ese email' }, { status: 401 })
    }

    if (user.Estado_Cuenta === 'Baja') {
      return NextResponse.json({ error: 'Esta cuenta fue eliminada' }, { status: 401 })
    }

    const storedPassword = user.Password || ''
    let passwordValida = false

    if (storedPassword.startsWith('$2')) {
      passwordValida = await bcrypt.compare(password, storedPassword)
    } else {
      // Compatibilidad con contraseñas viejas en texto plano (migración gradual)
      passwordValida = storedPassword === password
      if (passwordValida) {
        const hashed = await bcrypt.hash(password, 12)
        await supabase.from('Usuarios').update({ Password: hashed }).eq('id', user.id)
      }
    }

    if (!passwordValida) {
      return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 })
    }

    const tokenPayload = {
      id: user.id,
      email: user.Email,
      nombre: user.Nombre || email.split('@')[0],
      plan: user.plan || 'demo',
      creditos: user.creditos_minutos || 0
    }
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' })

    const response = NextResponse.json({ success: true, user: tokenPayload })
    response.cookies.set('gisto_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    })
    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Error de servidor' }, { status: 500 })
  }
}
