// app/api/airtable/videos/route.ts
//
// CRÍTICO: este endpoint reemplaza la llamada directa del cliente a Airtable.
// La versión vieja del upload_page.tsx usaba NEXT_PUBLIC_AIRTABLE_API_KEY (la
// expone en el bundle del navegador — cualquiera podía leer/escribir Airtable).
//
// Aquí la AIRTABLE_API_KEY vive en env privada del servidor, NUNCA llega al cliente.
//
// Variables requeridas en Vercel:
//   - AIRTABLE_API_KEY (privada)
//   - AIRTABLE_BASE_ID (privada o pública)
//
// Si tu proyecto YA tiene un route.ts en esta ruta con GET (listado de videos),
// añade el método POST a ese archivo en vez de reemplazarlo.

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
    // Devolver shape consistente: { id, fields }
    return NextResponse.json({ id: data.id, fields: data.fields || fields }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'upstream_error' }, { status: 502 })
  }
}

// Si quieres mantener el GET de listado de videos en el mismo archivo, añádelo aquí.
// Si ya existe en otro archivo, no dupliques.
