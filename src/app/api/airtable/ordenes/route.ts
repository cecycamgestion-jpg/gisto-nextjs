// src/app/api/airtable/ordenes/route.ts
// REEMPLAZA la versión vieja que hablaba con Airtable. Mismo patrón de
// autenticación que /api/airtable/usuario (cookie JWT → email → Supabase).
import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { supabase } from '@/lib/supabase'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_cambiar'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('gisto_token')?.value
  if (!token) return NextResponse.json({ error: 'No autenticado', records: [] }, { status: 401 })
  let email: string
  try {
    const payload: any = jwt.verify(token, JWT_SECRET)
    email = payload.email || ''
  } catch {
    return NextResponse.json({ error: 'Sesion expirada', records: [] }, { status: 401 })
  }
  if (!email) return NextResponse.json({ error: 'No autenticado', records: [] }, { status: 401 })

  try {
    const { data, error } = await supabase
      .from('ordenes_procesadas')
      .select('id, "Orden_ID", "Plan", "Monto_USD", "Estado", "Fecha", "Comprobante_URL", created_at')
      .ilike('Email', email)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) return NextResponse.json({ error: error.message, records: [] }, { status: 500 })

    const records = (data || []).map((row: any) => ({
      id: row.id,
      createdTime: row.created_at,
      fields: {
        Orden_ID:         row.Orden_ID || '',
        Plan:              row.Plan || '',
        Monto_USD:         row.Monto_USD || 0,
        Estado:            row.Estado || '',
        Fecha:             row.Fecha || row.created_at,
        Comprobante_URL:   row.Comprobante_URL || '',
      }
    }))
    return NextResponse.json({ records })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, records: [] }, { status: 500 })
  }
}
