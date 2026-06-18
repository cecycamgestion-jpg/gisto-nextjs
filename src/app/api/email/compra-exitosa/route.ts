import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
const resend = new Resend(process.env.RESEND_API_KEY)
export async function POST(req: NextRequest) {
  const { email, nombre, plan_nombre, horas, monto_usd, venia_de_demo } = await req.json()
  await resend.emails.send({
    from: 'GISTO <notificaciones@thegisto.com>',
    to: email,
    subject: `¡Listo ${nombre}! Tu plan ${plan_nombre} está activo`,
    html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#060810;font-family:Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:40px 24px">
  <div style="text-align:center;margin-bottom:32px"><span style="font-size:22px;font-weight:900;color:#F0F6FC">THE <span style="color:#00A8E8">GISTO</span></span></div>
  <div style="background:#0C1018;border:1px solid rgba(0,229,160,0.2);border-radius:16px;overflow:hidden">
    <div style="height:3px;background:linear-gradient(90deg,#00E5A0,#00D4FF)"></div>
    <div style="padding:32px 28px;text-align:center">
      <div style="font-size:48px;margin-bottom:16px">🎉</div>
      <h1 style="color:#F0F6FC;font-size:24px;font-weight:800;margin:0 0 8px">¡${nombre}, ya tienes ${horas} disponibles!</h1>
      <p style="color:rgba(240,246,252,0.55);font-size:15px;margin:0 0 24px;line-height:1.6">
        Tu plan <strong style="color:#00E5A0">${plan_nombre}</strong> está activo. Monto: <strong style="color:#F0F6FC">$${monto_usd} USD</strong>.
      </p>
      ${venia_de_demo ? `
      <div style="background:rgba(255,176,32,0.06);border:1px solid rgba(255,176,32,0.2);border-radius:10px;padding:12px 16px;margin-bottom:24px;font-size:12px;color:rgba(255,176,32,0.9);text-align:left">
        ⚠ Los minutos de tu demo de prueba no se acumulan a este plan. Tu nuevo saldo es de ${horas}.
      </div>` : ''}
      <a href="https://app.thegisto.com/upload" style="display:inline-block;background:linear-gradient(135deg,#00E5A0,#00D4FF);color:#000;padding:14px 32px;border-radius:10px;font-weight:800;font-size:15px;text-decoration:none">
        ⚡ Subir mi primera clase
      </a>
      <p style="color:rgba(240,246,252,0.3);font-size:12px;margin-top:16px">Tus créditos no vencen nunca · Recibirás el comprobante por separado</p>
    </div>
  </div>
  <div style="text-align:center;margin-top:24px"><p style="font-size:11px;color:rgba(240,246,252,0.25)">© 2026 GISTO Technologies · <a href="https://www.thegisto.com" style="color:rgba(0,168,232,0.5);text-decoration:none">thegisto.com</a></p></div>
</div></body></html>`
  })
  return NextResponse.json({ ok: true })
}
