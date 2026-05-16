import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY
const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_cambiar'

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('gisto_token')?.value
    if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const decoded = jwt.verify(token, JWT_SECRET) as any
    const { password_actual, password_nueva } = await req.json()

    if (!password_actual || !password_nueva) {
      return NextResponse.json({ error: 'Ambas contraseñas son requeridas' }, { status: 400 })
    }
    if (password_nueva.length < 6) {
      return NextResponse.json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' }, { status: 400 })
    }

    // Obtener usuario actual
    const r = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/Usuarios/${decoded.id}`, {
      headers: { Authorization: `Bearer ${AIRTABLE_KEY}` }
    })
    const data = await r.json()
    const storedPassword = data.fields?.Password || ''

    // Verificar contraseña actual
    let valida = false
    if (storedPassword.startsWith('$2')) {
      valida = await bcrypt.compare(password_actual, storedPassword)
    } else {
      valida = storedPassword === password_actual
    }

    if (!valida) {
      return NextResponse.json({ error: 'Contraseña actual incorrecta' }, { status: 401 })
    }

    // Guardar nueva contraseña hasheada
    const hashed = await bcrypt.hash(password_nueva, 12)
    await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/Usuarios/${decoded.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${AIRTABLE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { Password: hashed } })
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json({ error: 'Error de servidor' }, { status: 500 })
  }
}

