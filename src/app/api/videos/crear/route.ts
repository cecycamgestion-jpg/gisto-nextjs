import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { supabase } from '@/lib/supabase'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_cambiar'

// v20: este endpoint reemplaza el fetch DIRECTO desde el navegador a Airtable
// que tenía upload_page.tsx. Dos mejoras reales:
// 1. Seguridad: la llave de Supabase ya no viaja al navegador (antes la
//    AIRTABLE_API_KEY sí viajaba, expuesta en el código del cliente)
// 2. Consistencia: usa el mismo patrón que los demás endpoints (JWT + Supabase)

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('gisto_token')?.value
    if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    let payload: any
    try { payload = jwt.verify(token, JWT_SECRET) }
    catch { return NextResponse.json({ error: 'Sesion expirada' }, { status: 401 }) }

    const body = await req.json()
    const {
      url,
      nombre,
      tipoContenido,
      mantenerInteracciones,
      permitirCapsulasLargas,
      s3Key,
    } = body

    if (!url && !s3Key) {
      return NextResponse.json({ error: 'Falta url o s3Key del video' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('videos')
      .insert({
        URL: url || '',
        VideoID: nombre || `Video-${Date.now()}`,
        Estado: 'Pendiente',
        Usuario_Email: payload.email,
        Tipo_Contenido: tipoContenido || ['Diapositivas'],
        Mantener_Interacciones: !!mantenerInteracciones,
        Permitir_Capsulas_Largas: !!permitirCapsulasLargas,
        S3_Key: s3Key || '',
      })
      .select('id')
      .single()

    if (error || !data) {
      console.error('Crear video — error Supabase:', error)
      return NextResponse.json({ error: 'Error creando el video' }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data.id })
  } catch (error) {
    console.error('Crear video error:', error)
    return NextResponse.json({ error: 'Error de servidor' }, { status: 500 })
  }
}
