import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { record_id, feedback } = await req.json()
  
  await fetch(`https://api.airtable.com/v0/${process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID}/Videos/${record_id}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${process.env.NEXT_PUBLIC_AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fields: { Calidad_Feedback: feedback } })
  })

  return NextResponse.json({ ok: true })
}
