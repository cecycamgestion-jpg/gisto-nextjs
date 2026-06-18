import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
const resend = new Resend(process.env.RESEND_API_KEY)
export async function POST(req: NextRequest) {
  const { email_anterior, email_nuevo, nombre } = await req.json()
  // Notificar al correo ANTERIOR (aviso de seguridad)
  await resend.emails.send({
    from: 'GISTO <notificaciones@thegisto.com>',
    to: email_anterior,
    subject: 'Tu correo en GISTO fue cambiado',
    html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#060810;font-family:Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:40px 24px">
  <div style="text-align:center;margin-bottom:32px"><span style="font-size:22px;font-weight:900;color:#F0F6FC">THE <span style="color:#00A8E8">GISTO</span></span></div>
  <div style="background:#0C1018;border:1px solid rgba(226,92,92,0.2);border-radius:16px;overflow:hidden">
    <div style="height:3px;background:linear-gradient(90deg,#E25C5C,#FF8080)"></div>
    <div style="padding:32px 28px;text-align:center">
      <div style="font-size:40px;margin-bottom:16px">🔐</div>
      <h1 style="color:#F0F6FC;font-size:20px;font-weight:800;margin:0 0 12px">Cambio de correo registrado</h1>
      <p style="color:rgba(240,246,252,0.55);font-size:14px;margin:0 0 20px;line-height:1.7">
        Hola ${nombre}, el correo de tu cuenta GISTO fue cambiado a <strong style="color:#F0F6FC">${email_nuevo}</strong>.<br/>
        Si no realizaste este cambio, contáctanos de inmediato.
      </p>
      <a href="mailto:admin@thegisto.com" style="display:inline-block;background:rgba(226,92,92,0.15);border:1px solid rgba(226,92,92,0.4);color:#E25C5C;padding:11px 24px;border-radius:9px;font-weight:700;font-size:13px;text-decoration:none">
        Reportar problema →
      </a>
    </div>
  </div>
  <div style="text-align:center;margin-top:24px"><p style="font-size:11px;color:rgba(240,246,252,0.25)">© 2026 GISTO Technologies</p></div>
</div></body></html>`
  })
  // Confirmar al correo NUEVO
  await resend.emails.send({
    from: 'GISTO <notificaciones@thegisto.com>',
    to: email_nuevo,
    subject: 'Correo actualizado en GISTO',
    html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#060810;font-family:Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:40px 24px">
  <div style="text-align:center;margin-bottom:32px"><span style="font-size:22px;font-weight:900;color:#F0F6FC">THE <span style="color:#00A8E8">GISTO</span></span></div>
  <div style="background:#0C1018;border:1px solid rgba(0,229,160,0.2);border-radius:16px;overflow:hidden">
    <div style="height:3px;background:linear-gradient(90deg,#00E5A0,#00D4FF)"></div>
    <div style="padding:32px 28px;text-align:center">
      <div style="font-size:40px;margin-bottom:16px">✅</div>
      <h1 style="color:#F0F6FC;font-size:20px;font-weight:800;margin:0 0 12px">Correo actualizado correctamente</h1>
      <p style="color:rgba(240,246,252,0.55);font-size:14px;margin:0 0 20px;line-height:1.7">
        Hola ${nombre}, este es tu nuevo correo de acceso a GISTO.<br/>Úsalo la próxima vez que inicies sesión.
      </p>
      <a href="https://app.thegisto.com/login" style="display:inline-block;background:linear-gradient(135deg,#00A8E8,#00D4FF);color:#000;padding:12px 28px;border-radius:9px;font-weight:800;font-size:14px;text-decoration:none">
        Ir a mi cuenta →
      </a>
    </div>
  </div>
  <div style="text-align:center;margin-top:24px"><p style="font-size:11px;color:rgba(240,246,252,0.25)">© 2026 GISTO Technologies</p></div>
</div></body></html>`
  })
  return NextResponse.json({ ok: true })
}
