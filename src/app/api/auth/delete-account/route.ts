import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { supabase } from '@/lib/supabase'

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

    const { id: userId, email } = payload

    // 1. Verificar contraseña
    const { data: user, error: errUser } = await supabase
      .from('Usuarios')
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
      return NextResponse.json({ error: 'Contrasena incorrecta' }, { status: 401 })
    }

    // 2. Obtener todos los videos del usuario (para borrar sus archivos S3)
    const { data: videos } = await supabase
      .from('Videos')
      .select('S3_Key, URL')
      .eq('Usuario_Email', email)

    // 3. Borrar archivos S3 de cada video
    for (const v of videos || []) {
      if (v.S3_Key) await borrarS3(v.S3_Key)
      if (v.URL && typeof v.URL === 'string' && v.URL.includes('amazonaws.com')) {
        try {
          const key = new URL(v.URL).pathname.slice(1)
          await borrarS3(key)
        } catch {}
      }
    }

    // 4. Eliminar registros de Videos.
    //    A diferencia de Airtable (límite de 10 por petición, requería un
    //    bucle de lotes), Postgres borra TODAS las filas que coincidan en
    //    una sola operación, sin importar cuántas sean.
    await supabase.from('Videos').delete().eq('Usuario_Email', email)

    // 5. Enviar email ANTES de anonimizar (el email aún es válido)
    const NEXTJS_URL = process.env.NEXTJS_URL || 'https://app.thegisto.com'
    fetch(`${NEXTJS_URL}/api/email/cuenta-eliminada`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, nombre: payload.nombre })
    }).catch(() => {})

    // 6. Anonimizar usuario — NO borrar la fila.
    //    Ordenes_Procesadas queda intacta (obligación legal SUNAT/Nubefact);
    //    su FK a Usuarios.Email con ON UPDATE CASCADE se actualiza sola al
    //    cambiar el email aquí abajo, sin código adicional.
    const { error: errAnon } = await supabase
      .from('Usuarios')
      .update({
        Nombre: 'Usuario eliminado',
        Email: `deleted_${userId}@thegisto.com`,
        Password: '',
        Tipo_Documento: '',
        Numero_Documento: '',
        Razon_Social: '',
        Pais: '',
        Avatar_URL: '',
        Estado_Cuenta: 'Baja',
        creditos_minutos: 0,
        creditos_reservados: 0
      })
      .eq('id', userId)

    if (errAnon) {
      console.error('Delete account — error anonimizando:', errAnon)
      // No revertir lo ya borrado — continuar, el usuario ya pidió eliminar
    }

    // 7. Limpiar cookie JWT
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
