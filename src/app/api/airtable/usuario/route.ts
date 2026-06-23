// src/app/api/airtable/usuario/route.ts
// REEMPLAZA la versión vieja que hablaba con Airtable. Usa el mismo patrón
// de autenticación que ya tiene /api/videos/crear: cookie 'gisto_token'
// (JWT) → email → Supabase. Sin esa cookie, no hay forma de saber quién
// pregunta, así que se rechaza con 401.
import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { supabase } from '@/lib/supabase'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_cambiar'

function emailDesdeToken(req: NextRequest): string | null {
  const token = req.cookies.get('gisto_token')?.value
  if (!token) return null
  try {
    const payload: any = jwt.verify(token, JWT_SECRET)
    return payload.email || null
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const email = emailDesdeToken(req)
  if (!email) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('"Nombre", plan, creditos_minutos, creditos_reservados, "Avatar_URL", "Tipo_Documento", "Numero_Documento", "Pais", "Razon_Social", "Tipo_Comprobante", "Pais_Factura", "ID_Fiscal", "RazonSocial_Factura", "Direccion_Fiscal"')
      .ilike('Email', email)
      .single()

    if (error || !data) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

    return NextResponse.json({
      creditos:               (data.creditos_minutos || 0) - (data.creditos_reservados || 0),
      plan:                   data.plan || 'demo',
      nombre:                 data.Nombre || '',
      avatar_url:             data.Avatar_URL || '',
      tipo_documento:         data.Tipo_Documento || '',
      numero_documento:       data.Numero_Documento || '',
      pais:                   data.Pais || '',
      razon_social:           data.Razon_Social || '',
      tipo_comprobante:       data.Tipo_Comprobante || 'Boleta',
      pais_factura:           data.Pais_Factura || '',
      id_fiscal:              data.ID_Fiscal || '',
      razon_social_factura:   data.RazonSocial_Factura || '',
      direccion_fiscal:       data.Direccion_Fiscal || '',
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const email = emailDesdeToken(req)
  if (!email) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  try {
    const body = await req.json().catch(() => ({}))
    const update: Record<string, any> = {}
    // Mapeo explícito body→columna real. Nunca pasar el body directo a
    // Supabase: evita que alguien inyecte un campo arbitrario (ej. plan,
    // creditos_minutos) desde este endpoint pensado solo para datos de perfil.
    if ('nombre' in body)               update.Nombre = body.nombre
    if ('tipo_documento' in body)       update.Tipo_Documento = body.tipo_documento
    if ('numero_documento' in body)     update.Numero_Documento = body.numero_documento
    if ('pais' in body)                 update.Pais = body.pais
    if ('razon_social' in body)         update.Razon_Social = body.razon_social
    if ('tipo_comprobante' in body)     update.Tipo_Comprobante = body.tipo_comprobante
    if ('pais_factura' in body)         update.Pais_Factura = body.pais_factura
    if ('id_fiscal' in body)            update.ID_Fiscal = body.id_fiscal
    if ('razon_social_factura' in body) update.RazonSocial_Factura = body.razon_social_factura
    if ('direccion_fiscal' in body)     update.Direccion_Fiscal = body.direccion_fiscal

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
    }

    const { error } = await supabase
      .from('usuarios')
      .update(update)
      .ilike('Email', email)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
