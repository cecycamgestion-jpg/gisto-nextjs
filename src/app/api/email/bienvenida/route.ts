import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
const resend = new Resend(process.env.RESEND_API_KEY)
export async function POST(req: NextRequest) {
  const { email, nombre } = await req.json()
  await resend.emails.send({
    from: 'GISTO <notificaciones@thegisto.com>',
    to: email,
    subject: '¡Bienvenido a GISTO! Tus 30 minutos están listos',
    html: `
<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#060810;font-family:Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:40px 24px">
  <div style="text-align:center;margin-bottom:32px">
    <span style="font-size:22px;font-weight:900;color:#F0F6FC;letter-spacing:-0.5px">THE <span style="color:#00A8E8">GISTO</span></span>
  </div>
  <div style="background:#0C1018;border:1px solid rgba(0,168,232,0.14);border-radius:16px;overflow:hidden">
    <div style="height:3px;background:linear-gradient(90deg,#00A8E8,#00D4FF)"></div>
    <div style="padding:32px 28px;text-align:center">
      <div style="margin-bottom:16px"><img src="https://www.thegisto.com/isotipo.png" alt="GISTO" width="64" height="64" style="display:block;margin:0 auto"/></div>
      <h1 style="color:#F0F6FC;font-size:24px;font-weight:800;margin:0 0 8px;letter-spacing:-0.5px">¡Hola ${nombre}!</h1>
      <p style="color:rgba(240,246,252,0.55);font-size:15px;margin:0 0 24px;line-height:1.6">
        Tu cuenta está lista. Tienes <strong style="color:#00A8E8">30 minutos de crédito gratuito</strong> para probar GISTO.
      </p>
      <div style="background:rgba(0,168,232,0.06);border:1px solid rgba(0,168,232,0.14);border-radius:12px;padding:20px;margin-bottom:24px;text-align:left">
        <div style="font-size:11px;font-weight:700;color:rgba(240,246,252,0.4);letter-spacing:2px;text-transform:uppercase;margin-bottom:14px">CON TUS 30 MINUTOS PUEDES</div>
        ${['Subir una grabación de hasta 30 minutos','Recibir cápsulas de video por módulo','Obtener documentos Word con resúmenes','Descargar quizzes y glosario automáticos'].map(item => `
        <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:rgba(240,246,252,0.55);margin-bottom:8px">
          <span style="color:#00E5A0;font-weight:700;font-size:11px">✓</span>${item}
        </div>`).join('')}
      </div>
      <div style="background:rgba(255,176,32,0.06);border:1px solid rgba(255,176,32,0.15);border-radius:10px;padding:12px 16px;margin-bottom:24px;font-size:12px;color:rgba(255,176,32,0.9);text-align:left">
        ⚠ Si decides comprar un plan, los minutos de prueba no se acumulan. Úsalos primero.
      </div>
      <a href="https://app.thegisto.com/upload" style="display:inline-block;background:linear-gradient(135deg,#00A8E8,#00D4FF);color:#000;padding:14px 32px;border-radius:10px;font-weight:800;font-size:15px;text-decoration:none">
        ⚡ Subir mi primer video
      </a>
      <p style="color:rgba(240,246,252,0.3);font-size:12px;margin-top:16px">Sin tarjeta de crédito · Tus créditos no vencen nunca</p>
    </div>
  </div>
  <div style="text-align:center;margin-top:24px">
    <p style="font-size:11px;color:rgba(240,246,252,0.25)">© 2026 GISTO Technologies · <a href="https://www.thegisto.com" style="color:rgba(0,168,232,0.5);text-decoration:none">thegisto.com</a></p>
  </div>
</div></body></html>`
  })
  return NextResponse.json({ ok: true })
}
