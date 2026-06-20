import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { supabase } from '@/lib/supabase'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_cambiar'
const NEXTJS_URL = process.env.NEXTJS_URL || 'https://app.thegisto.com'

export async function POST(req: NextRequest) {
  try {
    const { new_email, password } = await req.json()

    if (!new_email?.includes('@')) {
      return NextResponse.json({ error: 'El nuevo correo no es valido' }, { status: 400 })
    }
    if (!password) {
      return NextResponse.json({ error: 'La contrasena actual es requerida' }, { status: 400 })
    }

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
    const userId = payload.id

    if (new_email.toLowerCase() === currentEmail.toLowerCase()) {
      return NextResponse.json({ error: 'El nuevo correo es igual al correo actual' }, { status: 400 })
    }

    // Verificar que el nuevo correo no este en uso (CITEXT = insensible a mayúsculas)
    const { data: existente } = await supabase
      .from('usuarios')
      .select('id')
      .eq('Email', new_email)
      .maybeSingle()

    if (existente) {
      return NextResponse.json({ error: 'Ya existe una cuenta con ese correo electronico' }, { status: 409 })
    }

    // Obtener registro actual para verificar contrasena
    const { data: user, error: errUser } = await supabase
      .from('usuarios')
      .select('Password')
      .eq('id', userId)
      .maybeSingle()

    if (errUser || !user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const storedPassword = user.Password || ''
    let passwordValida = false
    if (storedPassword.startsWith('$2')) {
      passwordValida = await bcrypt.compare(password, storedPassword)
    } else {
      passwordValida = storedPassword === password
    }
    if (!passwordValida) {
      return NextResponse.json({ error: 'La contrasena actual es incorrecta' }, { status: 401 })
    }

    // Actualizar Email en Usuarios.
    // NOTA IMPORTANTE: a diferencia de Airtable, NO hay que actualizar los
    // videos del usuario uno por uno. La tabla Videos tiene una relación
    // (Foreign Key) hacia Usuarios.Email con "ON UPDATE CASCADE" — Postgres
    // propaga el cambio de email a TODOS los videos de este usuario
    // automáticamente, en la misma operación. Cero código adicional.
    const { error: errUpdate } = await supabase
      .from('usuarios')
      .update({ Email: new_email })
      .eq('id', userId)

    if (errUpdate) {
      console.error('Change email — error Supabase:', errUpdate)
      return NextResponse.json({ error: 'Error actualizando el correo. Intenta de nuevo' }, { status: 500 })
    }

    const newToken = jwt.sign(
      { id: userId, email: new_email, nombre: payload.nombre, plan: payload.plan, creditos: payload.creditos },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    const newUser = { id: userId, email: new_email, nombre: payload.nombre, plan: payload.plan, creditos: payload.creditos }

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
