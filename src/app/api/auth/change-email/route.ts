import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY
const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_cambiar'

export async function POST(req: NextRequest) {
  try {
    const { new_email, password } = await req.json()

    // Validaciones basicas
    if (!new_email?.includes('@')) {
      return NextResponse.json({ error: 'El nuevo correo no es valido' }, { status: 400 })
    }
    if (!password) {
      return NextResponse.json({ error: 'La contrasena actual es requerida' }, { status: 400 })
    }

    // Obtener usuario del JWT cookie
    const token = req.cookies.get('gisto_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'No autenticado. Vuelve a iniciar sesion' }, { status: 401 })
    }

    let payload: any
    try {
      payload = jwt.verify(token, JWT_SECRET)
    } catch {
      return NextResponse.json({ error: 'Sesion expirada. Vuelve a iniciar sesion' }, { status: 401 })
    }

    const currentEmail = payload.email
    const recordId = payload.id

    // No permitir el mismo correo
    if (new_email.toLowerCase() === currentEmail.toLowerCase()) {
      return NextResponse.json({ error: 'El nuevo correo es igual al correo actual' }, { status: 400 })
    }

    // Verificar que el nuevo correo no este en uso
    const checkRes = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE}/Usuarios?filterByFormula=${encodeURIComponent(`{Email}="${new_email}"`)}`,
      { headers: { Authorization: `Bearer ${AIRTABLE_KEY}` } }
    )
    const checkData = await checkRes.json()
    if (checkData.records?.length > 0) {
      return NextResponse.json({ error: 'Ya existe una cuenta con ese correo electronico' }, { status: 409 })
    }

    // Obtener registro actual para verificar contrasena
    const userRes = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE}/Usuarios/${recordId}`,
      { headers: { Authorization: `Bearer ${AIRTABLE_KEY}` } }
    )
    const userData = await userRes.json()
    if (!userData.fields) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Verificar contrasena (mismo patron que login: bcrypt o texto plano legacy)
    const storedPassword = userData.fields.Password || ''
    let passwordValida = false
    if (storedPassword.startsWith('$2')) {
      passwordValida = await bcrypt.compare(password, storedPassword)
    } else {
      passwordValida = storedPassword === password
    }
    if (!passwordValida) {
      return NextResponse.json({ error: 'La contrasena actual es incorrecta' }, { status: 401 })
    }

    // 1. Actualizar Email en Usuarios
    const updateRes = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE}/Usuarios/${recordId}`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${AIRTABLE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { Email: new_email } })
      }
    )
    if (!updateRes.ok) {
      return NextResponse.json({ error: 'Error actualizando el correo. Intenta de nuevo' }, { status: 500 })
    }

    // 2. Actualizar Usuario_Email en todos sus videos (email es la llave del sistema)
    try {
      const videosRes = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE}/Videos?filterByFormula=${encodeURIComponent(`{Usuario_Email}="${currentEmail}"`)}`,
        { headers: { Authorization: `Bearer ${AIRTABLE_KEY}` } }
      )
      const videosData = await videosRes.json()
      const videoRecords = videosData.records || []

      // Airtable permite maximo 10 registros por PATCH
      for (let i = 0; i < videoRecords.length; i += 10) {
        const batch = videoRecords.slice(i, i + 10)
        await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/Videos`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${AIRTABLE_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            records: batch.map((v: any) => ({
              id: v.id,
              fields: { Usuario_Email: new_email }
            }))
          })
        })
      }
    } catch {
      // Si falla la actualizacion de videos, no bloquear — el correo principal ya cambio
      // Los videos se pueden re-asociar manualmente si fuera necesario
    }

    // 3. Emitir nuevo JWT con el email actualizado
    const newToken = jwt.sign(
      {
        id: payload.id,
        email: new_email,
        nombre: payload.nombre,
        plan: payload.plan,
        creditos: payload.creditos
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    const newUser = {
      id: payload.id,
      email: new_email,
      nombre: payload.nombre,
      plan: payload.plan,
      creditos: payload.creditos
    }

    // Notificar por email (al anterior y al nuevo)
    const NEXTJS_URL = process.env.NEXTJS_URL || 'https://app.thegisto.com'
    fetch(`${NEXTJS_URL}/api/email/cambio-correo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email_anterior: currentEmail, email_nuevo: new_email, nombre: payload.nombre })
    }).catch(() => {})

    const response = NextResponse.json({ success: true, user: newUser })

    response.cookies.set('gisto_token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    })

    return response
  } catch (error) {
    console.error('Change email error:', error)
    return NextResponse.json({ error: 'Error de servidor. Intenta de nuevo' }, { status: 500 })
  }
}
