// app/api/airtable/videos/route.ts
//
// Endpoint server-side para la tabla Videos de Airtable.
// La AIRTABLE_API_KEY vive SOLO en el servidor, nunca llega al navegador.
//
// Métodos:
//   GET  /api/airtable/videos?email=<correo>  -> lista los videos de ese usuario
//   POST /api/airtable/videos                 -> crea un video (al subir)
//
// Variables requeridas en Vercel:
//   - AIRTABLE_API_KEY (privada)
//   - AIRTABLE_BASE_ID (privada)

import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'

const ALLOWED_FIELDS = new Set([
  'URL', 'S3_Key', 'VideoID', 'Estado', 'Usuario_Email',
  'Tipo_Contenido', 'Mantener_Interacciones', 'Permitir_Capsulas_Largas',
  'Generar_SRT', 'Contexto_Maestro',
])

function sanitizeFields(input: any): Record<string, any> {
  const out: Record<string, any> = {}
  if (!input || typeof input !== 'object') return out
  for (const [k, v] of Object.entries(input)) {
    if (ALLOWED_FIELDS.has(k)) out[k] = v
  }
  return out
}

// GET - lista los videos del usuario (filtra por Usuario_Email)
export async function GET(req: NextRequest) {
  const ak = process.env.AIRTABLE_API_KEY
  const ab = process.env.AIRTABLE_BASE_ID
  if (!ak || !ab) {
    return NextResponse.json({ error: 'Airtable no configurado' }, { status: 500 })
  }

  const url = new URL(req.url)
  const email = url.searchParams.get('email') || req.headers.get('x-user-email') || ''

  try {
    let airtableUrl = `https://api.airtable.com/v0/${ab}/Videos?sort%5B0%5D%5Bfield%5D=VideoID&sort%5B0%5D%5Bdirection%5D=desc&pageSize=100`
    if (email) {
      const formula = encodeURIComponent(`{Usuario_Email}='${email.replace(/'/g, "\\'")}'`)
      airtableUrl += `&filterByFormula=${formula}`
    } else {
      return NextResponse.json({ records: [] }, { status: 200 })
    }

    const r = await fetch(airtableUrl, {
      headers: { 'Authorization': `Bearer ${ak}` },
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) {
      return NextResponse.json({ error: data?.error?.message || 'airtable_error', detail: data }, { status: r.status })
    }
    return NextResponse.json({ records: data.records || [] }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'upstream_error' }, { status: 502 })
  }
}

// POST - crea un video (al subir)
export async function POST(req: NextRequest) {
  const ak = process.env.AIRTABLE_API_KEY
  const ab = process.env.AIRTABLE_BASE_ID
  if (!ak || !ab) {
    return NextResponse.json({ error: 'Airtable no configurado (AIRTABLE_API_KEY/AIRTABLE_BASE_ID)' }, { status: 500 })
  }

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'body inválido' }, { status: 400 }) }

  const fields = sanitizeFields(body?.fields || body)
  if (!fields.URL && !fields.S3_Key) {
    return NextResponse.json({ error: 'URL o S3_Key requerido' }, { status: 400 })
  }
  if (!fields.Usuario_Email) {
    return NextResponse.json({ error: 'Usuario_Email requerido' }, { status: 400 })
  }

  try {
    const r = await fetch(`https://api.airtable.com/v0/${ab}/Videos`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ak}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) {
      return NextResponse.json({ error: data?.error?.message || 'airtable_error', detail: data }, { status: r.status })
    }
    return NextResponse.json({ id: data.id, fields: data.fields || fields }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'upstream_error' }, { status: 502 })
  }
}
