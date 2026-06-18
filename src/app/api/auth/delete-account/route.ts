import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'

const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY
const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_cambiar'
const AWS_BUCKET = process.env.AWS_S3_BUCKET || ''
const AWS_REGION = process.env.AWS_REGION || 'us-east-1'

const s3 = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
})

async function borrarS3(key: string) {
  if (!key || !AWS_BUCKET) return
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: AWS_BUCKET, Key: key }))
  } catch { /* no bloquear si falla S3 */ }
}

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json()

    if (!password) {
      return NextResponse.json({ error: 'La contrasena es requerida' }, { status: 400 })
    }

    // 1. Verificar JWT cookie
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

    const { id: recordId, email } = payload

    // 2. Obtener usuario y verificar contrasena
    const userRes = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE}/Usuarios/${recordId}`,
      { headers: { Authorization: `Bearer ${AIRTABLE_KEY}` } }
    )
    const userData = await userRes.json()
    if (!userData.fields) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const storedPassword = userData.fields.Password || ''
    let passwordValida = false
    if (storedPassword.startsWith('$2')) {
      passwordValida = await bcrypt.compare(password, storedPassword)
    } else {
      passwordValida = storedPassword === password
    }
    if (!passwordValida) {
      return NextResponse.json({ error: 'Contrasena incorrecta' }, { status: 401 })
    }

    // 3. Obtener todos los videos del usuario
    const videosRes = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE}/Videos?filterByFormula=${encodeURIComponent(`{Usuario_Email}="${email}"`)}`,
      { headers: { Authorization: `Bearer ${AIRTABLE_KEY}` } }
    )
    const videosData = await videosRes.json()
    const videos = videosData.records || []

    // 4. Borrar archivos S3 de cada video
    for (const video of videos) {
      const f = video.fields || {}
      // ZIP de output (siempre S3)
      if (f.Zip_Key) await borrarS3(f.Zip_Key)
      // Video de input si fue subido a S3 (no Drive/Dropbox)
      if (f.URL && typeof f.URL === 'string' && f.URL.includes('amazonaws.com')) {
        try {
          const urlObj = new URL(f.URL)
          const key = urlObj.pathname.slice(1) // quitar "/" inicial
          await borrarS3(key)
        } catch {}
      }
    }

    // 5. Eliminar registros de Videos en Airtable (en lotes de 10, limite de la API)
    for (let i = 0; i < videos.length; i += 10) {
      const batch = videos.slice(i, i + 10)
      const params = batch.map((v: any) => `records[]=${v.id}`).join('&')
      await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE}/Videos?${params}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${AIRTABLE_KEY}` } }
      ).catch(() => { /* no bloquear si falla */ })
    }

    // 6. Enviar email ANTES de anonimizar (el email aún es válido)
    const NEXTJS_URL = process.env.NEXTJS_URL || 'https://app.thegisto.com'
    fetch(`${NEXTJS_URL}/api/email/cuenta-eliminada`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, nombre: payload.nombre })
    }).catch(() => {})

    // 7. Anonimizar usuario — NO borrar el registro
    //    Las Ordenes/comprobantes quedan intactas (obligacion legal SUNAT/Nubefact)
    //    El campo Estado_Cuenta debe existir en Airtable (single select: Activo / Baja)
    await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/Usuarios/${recordId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${AIRTABLE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          Nombre: 'Usuario eliminado',
          Email: `deleted_${recordId}@thegisto.com`,
          Password: '',
          Tipo_Documento: '',
          Numero_Documento: '',
          Razon_Social: '',
          Pais: '',
          Avatar_URL: '',
          Estado_Cuenta: 'Baja',
          creditos_minutos: 0,
          creditos_reservados: 0
        }
      })
    })

    // 8. Limpiar cookie JWT
    const response = NextResponse.json({ success: true })
    response.cookies.set('gisto_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    })

    return response
  } catch (error) {
    console.error('Delete account error:', error)
    return NextResponse.json({ error: 'Error de servidor. Intenta de nuevo' }, { status: 500 })
  }
}
