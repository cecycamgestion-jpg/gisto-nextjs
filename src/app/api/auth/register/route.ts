import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY
const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_cambiar'
const NEXTJS_URL = process.env.NEXTJS_URL || 'https://app.thegisto.com'

export async function POST(req: NextRequest) {
  try {
    // Solo datos básicos — tipo/número doc y facturación van en Perfil, no en registro
    const { email, password, nombre, pais } = await req.json()

    // Validaciones básicas
    if (!email?.includes('@')) return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
    if (!password || password.length < 6) return NextResponse.json({ error: 'Contraseña mínimo 6 caracteres' }, { status: 400 })
    if (!nombre?.trim()) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
    if (!pais?.trim()) return NextResponse.json({ error: 'El país es requerido' }, { status: 400 })

    // Verificar si ya existe
    const check = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE}/Usuarios?filterByFormula=${encodeURIComponent(`{Email}="${email}"`)}`,
      { headers: { Authorization: `Bearer ${AIRTABLE_KEY}` } }
    )
    const checkData = await check.json()
    if (checkData.records?.length > 0) {
      return NextResponse.json({ error: 'Ya existe una cuenta con ese email' }, { status: 409 })
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 12)

    // Crear usuario en Airtable — solo datos básicos
    const create = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/Usuarios`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${AIRTABLE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          Email: email,
          Nombre: nombre,
          Password: hashedPassword,
          Pais: pais,
          creditos_minutos: 30,
          plan: 'demo',
        }
      })
    })
    const newUser = await create.json()
    if (!newUser.id) {
      return NextResponse.json({ error: 'Error creando cuenta' }, { status: 500 })
    }

    // Email de bienvenida
    try {
      await fetch(`${NEXTJS_URL}/api/email/bienvenida`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, nombre })
      })
    } catch { /* no bloquear si falla el email */ }

    // Generar JWT
    const tokenPayload = {
      id: newUser.id,
      email,
      nombre,
      plan: 'demo',
      creditos: 30
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
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Error de servidor' }, { status: 500 })
  }
}
