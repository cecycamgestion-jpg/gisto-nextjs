// src/app/api/airtable/videos/route.ts
// REEMPLAZA la versión vieja que hablaba con Airtable directo (esa base
// ya no se alimenta desde que el motor migró a Postgres/Supabase — por
// eso el dashboard siempre mostraba "0 videos").
// GET /api/airtable/videos?email=x → lista videos del usuario por email
// POST /api/airtable/videos { email } → misma cosa desde body
// PRINCIPIO: solo LEE, NUNCA borra. Siempre filtra por email.
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Mapea una fila de la tabla `videos` (Postgres) al contrato que el
// frontend ya espera (mismo formato que devolvía Airtable: records[].fields).
function mapRow(row: any) {
  return {
    id: row.id,
    createdTime: row.created_at,
    fields: {
      VideoID: row.VideoID || '',
      Estado: row.Estado || 'Pendiente',
      Resultado: row.Resultado || '',
      Modulos_detectados: row.Modulos_detectados || 0,
      Duracion_entregada: row.Duracion_entregada || 0,
      Calidad_Feedback: row.Calidad_Feedback || '',
      Motivo_Error: row.Motivo_Error || '',
      Tipo_Contenido: row.Tipo_Contenido || [],
      'Created time': row.created_at,
    }
  }
}

async function fetchVideos(email: string) {
  if (!email) return []
  // .ilike sin comodines (%) = comparación exacta case-insensitive.
  const { data, error } = await supabase
    .from('videos')
    .select('id, created_at, "VideoID", "Estado", "Resultado", "Modulos_detectados", "Duracion_entregada", "Calidad_Feedback", "Motivo_Error", "Tipo_Contenido"')
    .ilike('Usuario_Email', email)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw new Error(error.message)
  return (data || []).map(mapRow)
}

export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get('email') || ''
    if (!email) return NextResponse.json({ error: 'Falta email', records: [] }, { status: 400 })
    const records = await fetchVideos(email)
    return NextResponse.json({ records })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, records: [] }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const email = body.email || ''
    if (!email) return NextResponse.json({ error: 'Falta email', records: [] }, { status: 400 })
    const records = await fetchVideos(email)
    return NextResponse.json({ records })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, records: [] }, { status: 500 })
  }
}
