import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_cambiar'

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
})

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('gisto_token')?.value
    if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    jwt.verify(token, JWT_SECRET) // Verificar que el token es válido

    const { zip_key } = await req.json()
    if (!zip_key) return NextResponse.json({ error: 'zip_key requerida' }, { status: 400 })

    // Generar presigned URL fresco con 1 hora de expiración
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET || 'gisto-videos-piloto-2026',
      Key: zip_key
    })

    const url = await getSignedUrl(s3, command, { expiresIn: 3600 })

    return NextResponse.json({ download_url: url })

  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json({ error: 'Error generando URL de descarga' }, { status: 500 })
  }
}

