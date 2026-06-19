import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
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

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('gisto_token')?.value
    if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    let payload: any
    try { payload = jwt.verify(token, JWT_SECRET) }
    catch { return NextResponse.json({ error: 'Sesion expirada' }, { status: 401 }) }

    const { id: userId } = payload

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No se recibio imagen' }, { status: 400 })

    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Solo se permiten JPG, PNG o WEBP' }, { status: 400 })
    }
    if (file.size > 3 * 1024 * 1024) {
      return NextResponse.json({ error: 'La imagen debe ser menor a 3MB' }, { status: 400 })
    }

    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const key = `avatars/${userId}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    await s3.send(new PutObjectCommand({
      Bucket: AWS_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      CacheControl: 'public, max-age=31536000'
    }))

    const publicUrl = `https://${AWS_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}?t=${Date.now()}`

    const { error } = await supabase
      .from('Usuarios')
      .update({ Avatar_URL: publicUrl })
      .eq('id', userId)

    if (error) {
      console.error('Avatar — error guardando URL en Supabase:', error)
      // No bloquear la respuesta: la imagen ya se subió a S3 correctamente
    }

    return NextResponse.json({ success: true, url: publicUrl })
  } catch (error) {
    console.error('Avatar upload error:', error)
    return NextResponse.json({ error: 'Error subiendo imagen' }, { status: 500 })
  }
}
