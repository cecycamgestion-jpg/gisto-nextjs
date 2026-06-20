import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { supabase } from '@/lib/supabase'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_cambiar'

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('gisto_token')?.value
    if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const decoded = jwt.verify(token, JWT_SECRET) as any

    const { data: f, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', decoded.id)
      .maybeSingle()

    if (error || !f) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      id: decoded.id,
      email: f.Email,
      nombre: f.Nombre,
      plan: f.plan || 'demo',
      creditos: f.creditos_minutos || 0,
      pais: f.Pais || '',
      tipo_documento: f.Tipo_Documento || '',
      numero_documento: f.Numero_Documento || '',
      razon_social: f.Razon_Social || '',
      avatar_url: f.Avatar_URL || '',
      tipo_comprobante: f.Tipo_Comprobante || 'Boleta',
      pais_factura: f.Pais_Factura || '',
      id_fiscal: f.ID_Fiscal || '',
      razon_social_factura: f.RazonSocial_Factura || '',
      direccion_fiscal: f.Direccion_Fiscal || '',
    })
  } catch (error) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = req.cookies.get('gisto_token')?.value
    if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const decoded = jwt.verify(token, JWT_SECRET) as any
    const body = await req.json()

    const fields: any = {}
    if (body.nombre !== undefined)           fields.Nombre            = body.nombre
    if (body.pais !== undefined)             fields.Pais              = body.pais
    if (body.tipo_documento !== undefined)   fields.Tipo_Documento    = body.tipo_documento
    if (body.numero_documento !== undefined) fields.Numero_Documento  = body.numero_documento
    if (body.razon_social !== undefined)     fields.Razon_Social      = body.razon_social
    if (body.tipo_comprobante !== undefined)      fields.Tipo_Comprobante    = body.tipo_comprobante
    if (body.pais_factura !== undefined)          fields.Pais_Factura        = body.pais_factura
    if (body.id_fiscal !== undefined)             fields.ID_Fiscal           = body.id_fiscal
    if (body.razon_social_factura !== undefined)  fields.RazonSocial_Factura = body.razon_social_factura
    if (body.direccion_fiscal !== undefined)      fields.Direccion_Fiscal    = body.direccion_fiscal

    if (Object.keys(fields).length === 0) {
      return NextResponse.json({ success: true })
    }

    const { error } = await supabase
      .from('usuarios')
      .update(fields)
      .eq('id', decoded.id)

    if (error) {
      console.error('Perfil PATCH — error Supabase:', error)
      return NextResponse.json({ error: 'Error de servidor' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Error de servidor' }, { status: 500 })
  }
}
