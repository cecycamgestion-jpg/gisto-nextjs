import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY
const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_cambiar'

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('gisto_token')?.value
    if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const decoded = jwt.verify(token, JWT_SECRET) as any

    const r = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/Usuarios/${decoded.id}`, {
      headers: { Authorization: `Bearer ${AIRTABLE_KEY}` }
    })
    const data = await r.json()
    const fields = data.fields || {}

    return NextResponse.json({
      id: decoded.id,
      email: fields.Email,
      nombre: fields.Nombre,
      plan: fields.plan || 'Free',
      creditos: fields.creditos_minutos || 0,
      pais: fields.Pais || '',
      tipo_documento: fields.Tipo_Documento || '',
      numero_documento: fields.Numero_Documento || '',
      razon_social: fields.Razon_Social || ''
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
    if (body.nombre) fields.Nombre = body.nombre
    if (body.pais) fields.Pais = body.pais
    if (body.tipo_documento) fields.Tipo_Documento = body.tipo_documento
    if (body.numero_documento) fields.Numero_Documento = body.numero_documento
    if (body.razon_social) fields.Razon_Social = body.razon_social

    await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/Usuarios/${decoded.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${AIRTABLE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Error de servidor' }, { status: 500 })
  }
}

