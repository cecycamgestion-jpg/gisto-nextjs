// src/app/api/airtable/usuario/avatar/route.ts
// REEMPLAZA la versión vieja. Antes (Airtable) probablemente subía directo
// a S3 con credenciales AWS propias en Vercel. Aquí, en vez de asumir que
// esas credenciales existen en Vercel, reusamos el endpoint /get-upload-url
// que YA tiene Railway (las mismas credenciales AWS que usa para videos).
// Se extendió ese endpoint (app_v20.py) para aceptar tipo:'avatar' y
// devolver una key estable 'avatars/<email>.<ext>'. Cero credenciales AWS
// nuevas en Vercel — solo necesita el mismo token que ya usa para hablar
// con Railway.
import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { supabase } from '@/lib/supabase'

const JWT_SECRET   = process.env.JWT_SECRET || 'fallback_secret_cambiar'
const RAILWAY_URL  = process.env.NEXT_PUBLIC_RAILWAY_URL
const GISTO_TOKEN  = process.env.NEXT_PUBLIC_GISTO_TOKEN || ''

export async function POST(req: NextRequest) {
  const token = req.cookies.get('gisto_token')?.value
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  let email: string
  try {
    const payload: any = jwt.verify(token, JWT_SECRET)
    email = payload.email || ''
  } catch {
    return NextResponse.json({ error: 'Sesion expirada' }, { status: 401 })
  }
  if (!email) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  try {
    const form = await req.formData()
    const file = form.get('avatar') as File | null
    if (!file) return NextResponse.json({ error: 'Falta archivo avatar' }, { status: 400 })
    if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Debe ser una imagen' }, { status: 400 })
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Máximo 5MB' }, { status: 400 })

    const ext = '.' + (file.name.split('.').pop() || 'jpg').toLowerCase()

    // 1. Pedir URL firmada a Railway (server-a-server, token privado — no
    //    el público NEXT_PUBLIC_GISTO_TOKEN del navegador, aunque acá usa
    //    el mismo valor; está bien porque esta llamada nunca sale del servidor).
    const r1 = await fetch(`${RAILWAY_URL}/get-upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Gisto-Token': GISTO_TOKEN },
      body: JSON.stringify({ tipo: 'avatar', filename: `avatar${ext}`, email })
    })
    if (!r1.ok) {
      const err = await r1.json().catch(() => ({}))
      return NextResponse.json({ error: err.error || 'Error pidiendo URL de subida' }, { status: 500 })
    }
    const { upload_url, public_url } = await r1.json()

    // 2. Subir el archivo directo a S3 con esa URL firmada.
    const bytes = await file.arrayBuffer()
    const r2 = await fetch(upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: bytes
    })
    if (!r2.ok) return NextResponse.json({ error: 'Error subiendo a S3' }, { status: 500 })

    // 3. Guardar la URL pública en Supabase.
    const { error } = await supabase
      .from('usuarios')
      .update({ Avatar_URL: public_url })
      .ilike('Email', email)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ avatar_url: public_url })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
