// app/api/gisto/get-upload-url/route.ts
//
// Proxy server-side a Railway /get-upload-url.
// El token vive en una env var privada (NO NEXT_PUBLIC) y solo se añade aquí.
//
// Variables requeridas en Vercel:
//   - RAILWAY_URL: https://gisto-worker-production.up.railway.app
//   - GISTO_WEBHOOK_SECRET: el mismo WEBHOOK_SECRET de Railway

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
    const r = await fetch(`${railway}/get-upload-url`, {
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

// CORS preflight (browser nunca lo pide para fetch same-origin, pero por si acaso)
export async function OPTIONS() {
  return new NextResponse(null, { status: 204 })
}
