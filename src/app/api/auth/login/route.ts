import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY
const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_cambiar'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 })
    }

    // Buscar usuario en Airtable
    const r = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE}/Usuarios?filterByFormula=${encodeURIComponent(`{Email}="${email}"`)}`,
      { headers: { Authorization: `Bearer ${AIRTABLE_KEY}` } }
    )
    const data = await r.json()
    const user = data.records?.[0]

    if (!user) {
      return NextResponse.json({ error: 'No existe una cuenta con ese email' }, { status: 401 })
    }

    const fields = user.fields

    // Verificar contraseña — soporta bcrypt y texto plano (migración gradual)
    let passwordValida = false
    const storedPassword = fields.Password || ''

    if (storedPassword.startsWith('$2')) {
      // Ya está hasheada con bcrypt
      passwordValida = await bcrypt.compare(password, storedPassword)
    } else {
      // Texto plano — comparar y migrar a bcrypt
      passwordValida = storedPassword === password
      if (passwordValida) {
        // Migrar a bcrypt silenciosamente
        const hashed = await bcrypt.hash(password, 12)
        await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/Usuarios/${user.id}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${AIRTABLE_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: { Password: hashed } })
        })
      }
    }

    if (!passwordValida) {
      return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 })
    }

    // Generar JWT
    const tokenPayload = {
      id: user.id,
      email: fields.Email,
      nombre: fields.Nombre || email.split('@')[0],
      plan: fields.plan || 'Free',
      creditos: fields.creditos_minutos || 0
    }

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' })

    const response = NextResponse.json({
      success: true,
      user: tokenPayload
    })

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

