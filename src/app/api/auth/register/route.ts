import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { supabase } from '@/lib/supabase'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_cambiar'
const NEXTJS_URL = process.env.NEXTJS_URL || 'https://app.thegisto.com'

export async function POST(req: NextRequest) {
  try {
    const { email, password, nombre, pais } = await req.json()

    if (!email?.includes('@')) return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
    if (!password || password.length < 6) return NextResponse.json({ error: 'Contraseña mínimo 6 caracteres' }, { status: 400 })
    if (!nombre?.trim()) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
    if (!pais?.trim()) return NextResponse.json({ error: 'El país es requerido' }, { status: 400 })

    // Verificar si ya existe (CITEXT hace esto insensible a mayúsculas solo)
    const { data: existente, error: errCheck } = await supabase
      .from('Usuarios')
      .select('id')
      .eq('Email', email)
      .maybeSingle()

    if (errCheck) {
      console.error('Register — error verificando existente:', errCheck)
      return NextResponse.json({ error: 'Error de servidor' }, { status: 500 })
    }
    if (existente) {
      return NextResponse.json({ error: 'Ya existe una cuenta con ese email' }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const { data: newUser, error: errInsert } = await supabase
      .from('Usuarios')
      .insert({
        Email: email,
        Nombre: nombre,
        Password: hashedPassword,
        Pais: pais,
        creditos_minutos: 30,
        plan: 'demo',
      })
      .select('id')
      .single()

    if (errInsert || !newUser) {
      console.error('Register — error creando cuenta:', errInsert)
      return NextResponse.json({ error: 'Error creando cuenta' }, { status: 500 })
    }

    try {
      await fetch(`${NEXTJS_URL}/api/email/bienvenida`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, nombre })
      })
    } catch { /* no bloquear si falla el email */ }

    const tokenPayload = { id: newUser.id, email, nombre, plan: 'demo', creditos: 30 }
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
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Error de servidor' }, { status: 500 })
  }
}
