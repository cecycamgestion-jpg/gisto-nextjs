import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY
const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID

export async function POST(req: NextRequest) {
  try {
    const { token, new_password } = await req.json()

    if (!token) {
      return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 400 })
    }
    if (!new_password || new_password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener mínimo 6 caracteres' }, { status: 400 })
    }

    // 1. Buscar usuario con ese token en Airtable
    const r = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE}/Usuarios?filterByFormula=${encodeURIComponent(`{Reset_Token}="${token}"`)}`,
      { headers: { Authorization: `Bearer ${AIRTABLE_KEY}` } }
    )
    const data = await r.json()
    const user = data.records?.[0]

    if (!user) {
      return NextResponse.json({ error: 'El link es inválido o ya fue utilizado' }, { status: 400 })
    }

    // 2. Verificar que el token no expiró
    const expira = user.fields?.Reset_Expira
    if (!expira || new Date(expira) < new Date()) {
      // Limpiar token expirado
      await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/Usuarios/${user.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${AIRTABLE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { Reset_Token: '', Reset_Expira: null } })
      }).catch(() => {})
      return NextResponse.json({ error: 'El link expiró. Solicita uno nuevo.' }, { status: 400 })
    }

    // 3. Hashear nueva contraseña
    const hashed = await bcrypt.hash(new_password, 12)

    // 4. Actualizar contraseña y limpiar tokens
    await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/Usuarios/${user.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${AIRTABLE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          Password: hashed,
          Reset_Token: '',
          Reset_Expira: null
        }
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Confirm reset error:', error)
    return NextResponse.json({ error: 'Error de servidor. Intenta de nuevo.' }, { status: 500 })
  }
}
