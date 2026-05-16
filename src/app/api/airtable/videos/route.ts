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
    const email = decoded.email

    const filter = encodeURIComponent(`{Usuario_Email}="${email}"`)
    const r = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE}/Videos?maxRecords=50&filterByFormula=${filter}`,
      { headers: { Authorization: `Bearer ${AIRTABLE_KEY}` } }
    )
    const data = await r.json()

    const sorted = (data.records || []).sort((a: any, b: any) => {
      const da = new Date(a.fields?.['Created time'] || a.createdTime || 0).getTime()
      const db = new Date(b.fields?.['Created time'] || b.createdTime || 0).getTime()
      return db - da
    })

    return NextResponse.json({ records: sorted })
  } catch (error) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
}

