// app/api/gisto/analizar-video/route.ts
//
// Proxy server-side a Railway /analizar-video.

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const railway = process.env.RAILWAY_URL
  const token   = process.env.GISTO_WEBHOOK_SECRET
  if (!railway || !token) {
    return NextResponse.json({ error: 'Servidor no configurado (RAILWAY_URL/GISTO_WEBHOOK_SECRET)' }, { status: 500 })
  }
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'body inválido' }, { status: 400 }) }

  try {
    const r = await fetch(`${railway}/analizar-video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Gisto-Token': token,
      },
      body: JSON.stringify(body),
    })
    const data = await r.json().catch(() => ({}))
    return NextResponse.json(data, { status: r.status })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'upstream_error' }, { status: 502 })
  }
}
