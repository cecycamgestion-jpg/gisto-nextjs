import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY
const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID
const LEMON_SECRET = process.env.LEMON_SQUEEZY_SECRET || ''
const NUBEFACT_KEY = process.env.NUBEFACT_API_KEY || ''
const NUBEFACT_RUC = process.env.NUBEFACT_RUC_EMISOR || ''
const NEXTJS_URL = process.env.NEXTJS_URL || 'https://app.thegisto.com'

// Mapeo product_id → plan + créditos
const PRODUCTOS: Record<string, { plan: string; creditos: number; precio_usd: number }> = {
  '393a7d12-24d7-4c3d-9d60-400143b384b3': { plan: 'Starter', creditos: 120, precio_usd: 49 },
  '3368ed41-079d-4a62-8818-e18c4f72d6c6': { plan: 'Professional', creditos: 480, precio_usd: 179 },
  '0c0dfc86-589e-43d6-adae-b490947910de': { plan: 'Academia', creditos: 1200, precio_usd: 329 },
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()

    // ── Verificar firma Lemon Squeezy ──────────────────────────────────────
    const signature = req.headers.get('x-signature')
    if (LEMON_SECRET && signature) {
      const hmac = crypto.createHmac('sha256', LEMON_SECRET)
      hmac.update(rawBody)
      const expected = hmac.digest('hex')
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        console.error('Lemon webhook: firma inválida')
        return NextResponse.json({ error: 'Firma inválida' }, { status: 401 })
      }
    }

    const payload = JSON.parse(rawBody)
    const eventName = payload?.meta?.event_name

    // Solo procesar order_created con status paid
    if (eventName !== 'order_created') {
      return NextResponse.json({ received: true })
    }

    const attrs = payload?.data?.attributes
    if (attrs?.status !== 'paid') {
      return NextResponse.json({ received: true })
    }

    // Obtener datos del pedido
    const orderId = String(payload?.data?.id || '')
    const productId = String(attrs?.first_order_item?.product_id || '')
    const userId = payload?.meta?.custom_data?.user_id || ''
    const customerEmail = attrs?.user_email || ''
    const customerName = attrs?.user_name || ''
    const totalUsd = (attrs?.total || 0) / 100 // Lemon Squeezy envía en centavos

    const producto = PRODUCTOS[productId]
    if (!producto) {
      console.error(`Producto no encontrado: ${productId}`)
      return NextResponse.json({ received: true })
    }

    // ── Buscar usuario ─────────────────────────────────────────────────────
    let userRecord: any = null

    if (userId) {
      // Buscar por ID de Airtable
      const r = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/Usuarios/${userId}`, {
        headers: { Authorization: `Bearer ${AIRTABLE_KEY}` }
      })
      if (r.ok) userRecord = await r.json()
    }

    if (!userRecord && customerEmail) {
      // Buscar por email
      const r = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE}/Usuarios?filterByFormula=${encodeURIComponent(`{Email}="${customerEmail}"`)}`,
        { headers: { Authorization: `Bearer ${AIRTABLE_KEY}` } }
      )
      const data = await r.json()
      userRecord = data.records?.[0]
    }

    if (!userRecord) {
      console.error(`Usuario no encontrado: userId=${userId} email=${customerEmail}`)
      return NextResponse.json({ received: true })
    }

    const airtableId = userRecord.id || userRecord?.fields?.id
    const fields = userRecord.fields || {}

    // ── Idempotencia — verificar que esta orden no se procesó antes ────────
    if (fields.Ultima_Orden_LS === orderId) {
      console.log(`Orden ${orderId} ya procesada. Ignorando.`)
      return NextResponse.json({ received: true })
    }

    const creditosActuales = fields.creditos_minutos || 0
    const nuevosCreditosTotal = creditosActuales + producto.creditos

    // ── Actualizar Airtable ────────────────────────────────────────────────
    await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/Usuarios/${airtableId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${AIRTABLE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          creditos_minutos: nuevosCreditosTotal,
          plan: producto.plan,
          Ultima_Orden_LS: orderId
        }
      })
    })

    console.log(`✅ Créditos actualizados: ${fields.Email} → +${producto.creditos} min (${producto.plan})`)

    // ── Nubefact — preparado, se activa cuando haya RUC ───────────────────
    if (NUBEFACT_KEY && NUBEFACT_RUC) {
      try {
        await emitirComprobante({
          pais: fields.Pais || '',
          tipo_documento: fields.Tipo_Documento || 'Pasaporte',
          numero_documento: fields.Numero_Documento || '',
          razon_social: fields.Razon_Social || customerName,
          email: fields.Email || customerEmail,
          plan: producto.plan,
          precio_usd: totalUsd,
          airtable_id: airtableId
        })
      } catch (e) {
        console.error('Error Nubefact:', e)
        // No bloquear el flujo si Nubefact falla
      }
    }

    // ── Email confirmación de pago ─────────────────────────────────────────
    try {
      await fetch(`${NEXTJS_URL}/api/email/pago-confirmado`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: fields.Email || customerEmail,
          nombre: fields.Nombre || customerName,
          plan: producto.plan,
          creditos: producto.creditos,
          precio: totalUsd
        })
      })
    } catch (e) {
      console.error('Error email confirmación:', e)
    }

    return NextResponse.json({ received: true, creditos_agregados: producto.creditos })

  } catch (error) {
    console.error('Lemon webhook error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// ── Nubefact: emisión de comprobante ──────────────────────────────────────
async function emitirComprobante(datos: {
  pais: string
  tipo_documento: string
  numero_documento: string
  razon_social: string
  email: string
  plan: string
  precio_usd: number
  airtable_id: string
}) {
  const AIRTABLE_BASE_ID = AIRTABLE_BASE
  const esPeruano = datos.pais === 'Perú' || datos.pais === 'Peru'

  // Tipo de comprobante según país y documento
  let tipoComprobante: number
  let tipoDocCliente: string
  let igv: number

  if (esPeruano) {
    if (datos.tipo_documento === 'RUC') {
      tipoComprobante = 1  // Factura
      tipoDocCliente = '6' // RUC
    } else {
      tipoComprobante = 2  // Boleta
      tipoDocCliente = '1' // DNI
    }
    igv = datos.precio_usd * 0.18
  } else {
    tipoComprobante = 1   // Factura exportación
    tipoDocCliente = '0'  // Sin documento
    igv = 0               // Tasa 0% exportación digital
  }

  const baseImponible = esPeruano ? datos.precio_usd / 1.18 : datos.precio_usd
  const totalFinal = datos.precio_usd

  const payload = {
    operacion: 'generar_comprobante',
    tipo_de_comprobante: tipoComprobante,
    serie: esPeruano ? (datos.tipo_documento === 'RUC' ? 'F001' : 'B001') : 'F002',
    numero: 1, // Nubefact auto-incrementa
    sunat_transaction: esPeruano ? 1 : 2, // 2 = exportación
    cliente_tipo_de_documento: tipoDocCliente,
    cliente_numero_de_documento: datos.numero_documento || '00000000',
    cliente_denominacion: datos.razon_social,
    cliente_email: datos.email,
    moneda: 2, // USD
    tipo_de_cambio: '',
    fecha_de_emision: new Date().toISOString().split('T')[0],
    items: [
      {
        unidad_de_medida: 'ZZ',
        codigo: `GISTO-${datos.plan.toUpperCase()}`,
        descripcion: `GISTO Technologies - Plan ${datos.plan} (${esPeruano ? '' : 'Servicio Digital de Exportación - '}${datos.plan === 'Starter' ? '120' : datos.plan === 'Professional' ? '480' : '1200'} minutos de procesamiento de video educativo)`,
        cantidad: 1,
        valor_unitario: baseImponible.toFixed(2),
        precio_unitario: totalFinal.toFixed(2),
        descuento: '',
        subtotal: baseImponible.toFixed(2),
        tipo_de_igv: esPeruano ? 1 : 8, // 8 = exportación
        igv: igv.toFixed(2),
        total: totalFinal.toFixed(2),
        anticipo_regularizacion: false,
        anticipo_documento_serie: '',
        anticipo_documento_numero: ''
      }
    ],
    descuentos: [],
    total_gravada: esPeruano ? baseImponible.toFixed(2) : '',
    total_exonerada: '',
    total_inafecta: '',
    total_exportacion: !esPeruano ? totalFinal.toFixed(2) : '',
    total_gratuita: '',
    total_igv: igv.toFixed(2),
    total_valor_venta: baseImponible.toFixed(2),
    total_precio_venta: totalFinal.toFixed(2),
    total_descuentos: '0.00',
    total_anticipo: '0.00',
    total: totalFinal.toFixed(2),
    enviar_automaticamente_a_la_sunat: true,
    enviar_automaticamente_al_cliente: true,
    codigo_unico: '',
    condiciones_de_pago: '',
    medio_de_pago: 'Tarjeta de crédito/débito',
    placa_vehiculo: '',
    orden_compra_servicio: '',
    tabla_personalizada_codigo: '',
    formato_de_pdf: ''
  }

  const response = await fetch('https://api.nubefact.com/api/v1', {
    method: 'POST',
    headers: {
      'Authorization': `Token token="${NUBEFACT_KEY}"`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  const result = await response.json()

  if (result.enlace_del_pdf) {
    // Guardar link del comprobante en Airtable
    await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Usuarios/${datos.airtable_id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${AIRTABLE_BASE_ID}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { Ultimo_Comprobante: result.enlace_del_pdf } })
    })
    console.log(`✅ Comprobante emitido: ${result.enlace_del_pdf}`)
  }

  return result
}

