import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_cambiar'

const PAYPAL_BASE = process.env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || ''
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || ''

async function getPayPalToken(): Promise<string | null> {
  try {
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64')
    const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    })
    const data = await res.json()
    return data.access_token || null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Verificar usuario logueado
    const token = req.cookies.get('gisto_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    try {
      jwt.verify(token, JWT_SECRET)
    } catch {
      return NextResponse.json({ error: 'Sesion expirada' }, { status: 401 })
    }

    // 2. Obtener orderID del frontend
    const { orderID } = await req.json()
    if (!orderID) {
      return NextResponse.json({ error: 'Falta orderID' }, { status: 400 })
    }

    // 3. Token PayPal
    const ppToken = await getPayPalToken()
    if (!ppToken) {
      return NextResponse.json({ error: 'Error conectando con PayPal' }, { status: 502 })
    }

    // 4. Capturar el pago
    //    NOTA: la acreditacion REAL de creditos la hace el WEBHOOK en Railway,
    //    no este endpoint. Aqui solo confirmamos al frontend que el pago se capturo
    //    para poder redirigir al dashboard. El webhook es la fuente de verdad.
    const capRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderID}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ppToken}`,
        'Content-Type': 'application/json',
      },
    })

    const capture = await capRes.json()

    if (capture.status === 'COMPLETED') {
      return NextResponse.json({ status: 'COMPLETED' })
    }

    return NextResponse.json(
      { status: capture.status || 'PENDING', detail: capture },
      { status: 200 }
    )
  } catch (error) {
    console.error('PayPal capturar orden error:', error)
    return NextResponse.json({ error: 'Error de servidor' }, { status: 500 })
  }
}
