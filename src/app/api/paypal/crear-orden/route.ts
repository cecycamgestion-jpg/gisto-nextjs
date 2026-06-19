import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_cambiar'

// PayPal API base: sandbox o live segun env
const PAYPAL_BASE = process.env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || ''
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || ''

// Precios por plan (fuente: @/lib/plans, replicado aqui server-side por seguridad)
// NO confiar en precio que mande el frontend — siempre resolver server-side
const PRECIOS: Record<string, number> = {
  basico: 19,
  estandar: 45,
  premium: 89,
  empresarial: 169,
}

const NOMBRES: Record<string, string> = {
  basico: 'Plan Basico',
  estandar: 'Plan Estandar',
  premium: 'Plan Premium',
  empresarial: 'Plan Empresarial',
}

// Obtener access token de PayPal (OAuth2)
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
    let payload: any
    try {
      payload = jwt.verify(token, JWT_SECRET)
    } catch {
      return NextResponse.json({ error: 'Sesion expirada' }, { status: 401 })
    }

    const email = payload.email
    if (!email) {
      return NextResponse.json({ error: 'Usuario sin email' }, { status: 400 })
    }

    // 2. Validar plan solicitado
    const { plan } = await req.json()
    const planSlug = String(plan || '').toLowerCase()
    const precio = PRECIOS[planSlug]
    if (!precio) {
      return NextResponse.json({ error: 'Plan no valido' }, { status: 400 })
    }

    // 3. Obtener token PayPal
    const ppToken = await getPayPalToken()
    if (!ppToken) {
      return NextResponse.json({ error: 'Error conectando con PayPal' }, { status: 502 })
    }

    // 4. Crear orden en PayPal
    //    custom_id lleva email|plan para que el webhook identifique al usuario
    const custom_id = `${email}|${planSlug}`
    const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ppToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            custom_id,
            description: `${NOMBRES[planSlug]} - THE GISTO`,
            amount: {
              currency_code: 'USD',
              value: precio.toFixed(2),
            },
          },
        ],
      }),
    })

    const order = await orderRes.json()
    if (!order.id) {
      return NextResponse.json({ error: 'No se pudo crear la orden' }, { status: 502 })
    }

    return NextResponse.json({ orderID: order.id })
  } catch (error) {
    console.error('PayPal crear orden error:', error)
    return NextResponse.json({ error: 'Error de servidor' }, { status: 500 })
  }
}
