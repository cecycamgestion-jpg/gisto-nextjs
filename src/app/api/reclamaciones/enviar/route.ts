// app/api/reclamaciones/enviar/route.ts
// Recibe el formulario del Libro de Reclamaciones + archivos adjuntos en base64.
// Envía por correo vía Resend con adjuntos. Guarda en Airtable (best-effort).

import { NextRequest, NextResponse } from 'next/server'

const RESEND_KEY = process.env.RESEND_API_KEY || ''
const EMAIL_DESTINO = process.env.RECLAMACIONES_EMAIL || 'admin@thegisto.com'
const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY || process.env.NEXT_PUBLIC_AIRTABLE_API_KEY || ''
const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID || process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID || ''

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      nombre, tipoDoc, numDoc, domicilio, email, telefono,
      menorEdad, nombreApoderado, tipoDocApoderado, numDocApoderado,
      tipoBien, descripcionBien, montoReclamado,
      tipo, detalle, pedido, correlativo, fecha,
      adjuntos = [] // [{ nombre, tipo, datos: base64 }]
    } = body

    // ── 1. Construir adjuntos para Resend ────────────────────────────────
    const attachments = adjuntos
      .filter((a: any) => a?.datos && a?.nombre)
      .map((a: any) => ({
        filename: a.nombre,
        content: a.datos, // base64
        type: a.tipo || 'application/octet-stream'
      }))

    // ── 2. Enviar correo con Resend ──────────────────────────────────────
    if (RESEND_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'THE GISTO <admin@thegisto.com>',
          to: [EMAIL_DESTINO],
          reply_to: email,
          subject: `[${tipo.toUpperCase()}] ${correlativo} — ${nombre}`,
          attachments: attachments.length > 0 ? attachments : undefined,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
            <div style="background:#00A8E8;padding:20px 24px;border-radius:12px 12px 0 0">
              <h2 style="color:#fff;margin:0;font-size:18px">Nuevo ${tipo} registrado</h2>
              <p style="color:rgba(255,255,255,.8);margin:6px 0 0;font-size:14px">${correlativo} · ${fecha}</p>
            </div>
            <div style="background:#0E131C;padding:24px;border-radius:0 0 12px 12px">

              <h3 style="color:#00A8E8;font-size:13px;letter-spacing:1px;text-transform:uppercase;margin:0 0 12px">Datos del consumidor</h3>
              <p style="color:#c0c8d8;margin:4px 0"><strong style="color:#eef3fa">Nombre:</strong> ${nombre}</p>
              <p style="color:#c0c8d8;margin:4px 0"><strong style="color:#eef3fa">Documento:</strong> ${tipoDoc} ${numDoc}</p>
              <p style="color:#c0c8d8;margin:4px 0"><strong style="color:#eef3fa">Correo:</strong> ${email}</p>
              <p style="color:#c0c8d8;margin:4px 0"><strong style="color:#eef3fa">Domicilio:</strong> ${domicilio}</p>
              ${telefono ? `<p style="color:#c0c8d8;margin:4px 0"><strong style="color:#eef3fa">Teléfono:</strong> ${telefono}</p>` : ''}
              ${menorEdad ? `<p style="color:#c0c8d8;margin:4px 0"><strong style="color:#eef3fa">Apoderado:</strong> ${nombreApoderado} (${tipoDocApoderado} ${numDocApoderado})</p>` : ''}

              <hr style="border:none;border-top:1px solid rgba(148,176,214,.1);margin:16px 0">

              <h3 style="color:#00A8E8;font-size:13px;letter-spacing:1px;text-transform:uppercase;margin:0 0 12px">Bien o servicio</h3>
              <p style="color:#c0c8d8;margin:4px 0"><strong style="color:#eef3fa">Tipo:</strong> ${tipoBien}</p>
              <p style="color:#c0c8d8;margin:4px 0"><strong style="color:#eef3fa">Descripción:</strong> ${descripcionBien}</p>
              ${montoReclamado ? `<p style="color:#c0c8d8;margin:4px 0"><strong style="color:#eef3fa">Monto reclamado:</strong> ${montoReclamado}</p>` : ''}

              <hr style="border:none;border-top:1px solid rgba(148,176,214,.1);margin:16px 0">

              <h3 style="color:#00A8E8;font-size:13px;letter-spacing:1px;text-transform:uppercase;margin:0 0 12px">Detalle del ${tipo}</h3>
              <p style="color:#c0c8d8;white-space:pre-wrap">${detalle}</p>

              <h3 style="color:#00A8E8;font-size:13px;letter-spacing:1px;text-transform:uppercase;margin:16px 0 12px">Pedido del consumidor</h3>
              <p style="color:#c0c8d8;white-space:pre-wrap">${pedido}</p>

              ${attachments.length > 0 ? `
              <hr style="border:none;border-top:1px solid rgba(148,176,214,.1);margin:16px 0">
              <p style="color:#c0c8d8;font-size:13px">📎 <strong style="color:#eef3fa">${attachments.length} archivo(s) adjunto(s)</strong></p>
              ` : ''}

              <hr style="border:none;border-top:1px solid rgba(148,176,214,.1);margin:16px 0">
              <p style="color:#667788;font-size:12px">Responder en máximo 30 días hábiles según Ley N° 29571. Correlativo: ${correlativo}</p>
            </div>
            </div>
          `
        })
      })

      // Enviar confirmación al usuario
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'THE GISTO <admin@thegisto.com>',
          to: [email],
          subject: `Tu reclamo fue registrado — ${correlativo}`,
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
              <div style="background:#00A8E8;padding:20px 24px;border-radius:12px 12px 0 0">
                <h2 style="color:#fff;margin:0">✅ Reclamo registrado</h2>
              </div>
              <div style="background:#0E131C;padding:24px;border-radius:0 0 12px 12px">
                <p style="color:#c0c8d8">Hola <strong style="color:#eef3fa">${nombre}</strong>,</p>
                <p style="color:#c0c8d8">Tu ${tipo} ha sido registrado correctamente. Tu número de referencia es:</p>
                <div style="background:rgba(0,168,232,.08);border:1px solid rgba(0,168,232,.2);border-radius:10px;padding:14px 20px;margin:16px 0;text-align:center">
                  <span style="font-family:monospace;font-size:20px;font-weight:700;color:#00A8E8">${correlativo}</span>
                </div>
                <p style="color:#c0c8d8">Conserva este número para hacer seguimiento. Te responderemos en un plazo máximo de <strong style="color:#eef3fa">30 días hábiles</strong> a este mismo correo.</p>
                <p style="color:#c0c8d8">Si tienes dudas adicionales, escríbenos a <a href="mailto:admin@thegisto.com" style="color:#00A8E8">admin@thegisto.com</a>.</p>
                <p style="color:#667788;font-size:12px;margin-top:24px">THE GISTO TECHNOLOGIES E.I.R.L. · admin@thegisto.com</p>
              </div>
            </div>
          `
        })
      }).catch(() => {}) // La confirmación al usuario es best-effort
    }

    // ── 3. Guardar en Airtable (best-effort) ────────────────────────────
    if (AIRTABLE_KEY && AIRTABLE_BASE) {
      fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/Libro_Reclamaciones`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${AIRTABLE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: [{
            fields: {
              Correlativo: correlativo, Fecha: fecha, Tipo: tipo,
              Nombre: nombre, Documento: `${tipoDoc} ${numDoc}`,
              Email: email, Domicilio: domicilio, Telefono: telefono || '',
              Menor_Edad: menorEdad,
              Apoderado: menorEdad ? `${nombreApoderado} (${tipoDocApoderado} ${numDocApoderado})` : '',
              Bien_Tipo: tipoBien, Bien_Descripcion: descripcionBien, Monto: montoReclamado || '',
              Detalle: detalle, Pedido: pedido,
              Adjuntos: adjuntos.length > 0 ? `${adjuntos.length} archivo(s)` : 'Sin adjuntos',
              Estado: 'Pendiente'
            }
          }]
        })
      }).catch(() => {})
    }

    return NextResponse.json({ ok: true, correlativo })
  } catch (e: any) {
    console.error('[reclamaciones/enviar]', e.message)
    return NextResponse.json({ ok: true }) // No bloquear al usuario
  }
}
