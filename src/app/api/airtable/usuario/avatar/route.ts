import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import * as jose from 'jose'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  }
})

const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY!
const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID!
const S3_BUCKET = process.env.AWS_S3_BUCKET || 'gisto-videos-piloto-2026'
const S3_REGION = process.env.AWS_REGION || 'us-east-2'

async function getEmailFromToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('gisto_token')?.value
    if (!token) return null
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
    const { payload } = await jose.jwtVerify(token, secret)
    return payload.email as string
  } catch { return null }
}

export async function POST(req: NextRequest) {
  const email = await getEmailFromToken()
  if (!email) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get('avatar') as File
    if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })

    // Validar tipo y tamaño
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Solo se permiten imágenes' }, { status: 400 })
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'La imagen no puede superar 5MB' }, { status: 400 })
    }

    // Convertir a buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Determinar extensión
    const ext = file.type === 'image/png' ? 'png' : 'jpg'
    // Usar email sanitizado como nombre de archivo
    const emailSlug = email.replace(/[^a-zA-Z0-9]/g, '_')
    const s3Key = `avatars/${emailSlug}.${ext}`

    // Subir a S3
    await s3.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key,
      Body: buffer,
      ContentType: file.type,
    }))

    const avatarUrl = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${s3Key}`

    // Buscar usuario en Airtable
    const searchRes = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE}/Usuarios?filterByFormula=${encodeURIComponent(`{Email}="${email}"`)}`,
      { headers: { Authorization: `Bearer ${AIRTABLE_KEY}` } }
    )
    const searchData = await searchRes.json()
    const records = searchData.records || []
    if (!records.length) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

    const recordId = records[0].id

    // Guardar URL en Airtable campo Avatar_URL
    await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE}/Usuarios/${recordId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${AIRTABLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fields: { Avatar_URL: avatarUrl } })
      }
    )

    return NextResponse.json({ avatar_url: avatarUrl })

  } catch (e: any) {
    console.error('Error avatar:', e)
    return NextResponse.json({ error: 'Error al procesar la imagen' }, { status: 500 })
  }
}

