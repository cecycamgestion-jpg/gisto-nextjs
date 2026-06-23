// src/app/api/airtable/feedback/route.ts
// REEMPLAZA la versión vieja que escribía a Airtable. Antes el motor ya
// leía feedback de Postgres pero el dashboard seguía escribiendo en
// Airtable — el feedback del cliente quedaba desconectado del
// aprendizaje. Esto lo reconecta: ahora escribe directo en la columna
// "Calidad_Feedback" de la tabla `videos` en Supabase.
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const recordId = body.record_id || ''
    const feedback = body.feedback || ''
    if (!recordId) return NextResponse.json({ error: 'Falta record_id' }, { status: 400 })

    const { error } = await supabase
      .from('videos')
      .update({ Calidad_Feedback: feedback })
      .eq('id', recordId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
