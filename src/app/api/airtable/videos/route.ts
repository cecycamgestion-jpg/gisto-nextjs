// app/api/airtable/videos/route.ts
// FIX ERROR 405: soporta GET y POST.
// GET /api/airtable/videos?email=x → lista videos del usuario por email
// POST /api/airtable/videos { email } → misma cosa desde body
// PRINCIPIO: solo LEE, NUNCA borra. Siempre filtra por email.

import { NextRequest, NextResponse } from 'next/server'

const AK = process.env.AIRTABLE_API_KEY || process.env.NEXT_PUBLIC_AIRTABLE_API_KEY || ''
const AB = process.env.AIRTABLE_BASE_ID || process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID || ''

async function fetchVideos(email: string) {
  if (!email) return []
  const filter = encodeURIComponent(`{Usuario_Email}='${email.replace(/'/g, "\\'")}'`)
  const url = `https://api.airtable.com/v0/${AB}/Videos?filterByFormula=${filter}&sort[0][field]=Created time&sort[0][direction]=desc&pageSize=100`
  const r = await fetch(url, { headers: { Authorization: `Bearer ${AK}` }, cache: 'no-store' })
  if (!r.ok) throw new Error(`Airtable ${r.status}`)
  const data = await r.json()
  return data.records || []
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
