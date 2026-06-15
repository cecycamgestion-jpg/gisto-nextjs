// app/api/airtable/ordenes/route.ts
// GET → ordenes del usuario actual (filtradas por email del token de sesión)
import { NextRequest, NextResponse } from 'next/server'

const AK = process.env.AIRTABLE_API_KEY || process.env.NEXT_PUBLIC_AIRTABLE_API_KEY || ''
const AB = process.env.AIRTABLE_BASE_ID || process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID || ''

export async function GET(req: NextRequest) {
  try {
    // El email viene como query param (igual que videos, para consistencia)
    const email = req.nextUrl.searchParams.get('email') || ''
    const filter = email
      ? `&filterByFormula=${encodeURIComponent(`{Email}='${email.replace(/'/g, "\\'")}'`)}`
      : ''
    const url = `https://api.airtable.com/v0/${AB}/Ordenes_Procesadas?sort[0][field]=Fecha&sort[0][direction]=desc&pageSize=50${filter}`
    const r = await fetch(url, { headers: { Authorization: `Bearer ${AK}` }, cache: 'no-store' })
    if (!r.ok) throw new Error(`Airtable ${r.status}`)
    const data = await r.json()
    return NextResponse.json({ records: data.records || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message, records: [] }, { status: 500 })
  }
}
