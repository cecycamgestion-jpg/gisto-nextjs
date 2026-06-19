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

    // DEBUG 1: ¿la llamada a Airtable funcionó?
    if (!r.ok) {
      return NextResponse.json({
        error: `DEBUG Airtable status ${r.status}: ${JSON.stringify(data)} | BASE=${AIRTABLE_BASE ? 'existe' : 'FALTA'} | KEY=${AIRTABLE_KEY ? AIRTABLE_KEY.slice(0,6)+'...' : 'FALTA'}`
      }, { status: 500 })
    }

    // DEBUG 2: ¿cuántos registros encontró?
    const user = data.records?.[0]
    if (!user) {
      return NextResponse.json({
        error: `DEBUG: Airtable respondió OK pero NO encontró el email. Registros: ${data.records?.length ?? 'undefined'}. Email buscado: "${email}". BASE=${AIRTABLE_BASE}`
      }, { status: 401 })
    }

    const fields = user.fields

    // DEBUG 3: ¿el campo Password existe?
    const storedPassword = fields.Password || ''
    if (!storedPassword) {
      return NextResponse.json({
        error: `DEBUG: usuario encontrado pero campo Password vacío. Campos disponibles: ${Object.keys(fields).join(', ')}`
      }, { status: 401 })
    }

    let passwordValida = false
    if (storedPassword.startsWith('$2')) {
      passwordValida = await bcrypt.compare(password, storedPassword)
    } else {
      passwordValida = storedPassword === password
    }

    // DEBUG 4: ¿la contraseña coincidió?
    if (!passwordValida) {
      return NextResponse.json({
        error: `DEBUG: usuario SÍ encontrado, pero la contraseña NO coincide. (El hash existe y empieza con ${storedPassword.slice(0,4)})`
      }, { status: 401 })
    }

    const tokenPayload = {
      id: user.id,
      email: fields.Email,
      nombre: fields.Nombre || email.split('@')[0],
      plan: fields.plan || 'demo',
      creditos: fields.creditos_minutos || 0
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
  } catch (error: any) {
    return NextResponse.json({ error: `DEBUG catch: ${error?.message || String(error)}` }, { status: 500 })
  }
}
