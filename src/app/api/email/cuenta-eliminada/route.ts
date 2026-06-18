import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
const resend = new Resend(process.env.RESEND_API_KEY)
export async function POST(req: NextRequest) {
  const { email, nombre } = await req.json()
  await resend.emails.send({
    from: 'GISTO <notificaciones@thegisto.com>',
    to: email,
    subject: 'Tu cuenta en GISTO ha sido eliminada',
    html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#060810;font-family:Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:40px 24px">
  <div style="text-align:center;margin-bottom:32px"><span style="font-size:22px;font-weight:900;color:#F0F6FC">THE <span style="color:#00A8E8">GISTO</span></span></div>
  <div style="background:#0C1018;border:1px solid rgba(240,246,252,0.08);border-radius:16px;overflow:hidden">
    <div style="height:3px;background:linear-gradient(90deg,#667788,#445566)"></div>
    <div style="padding:32px 28px;text-align:center">
      <h1 style="color:#F0F6FC;font-size:20px;font-weight:800;margin:0 0 12px">Cuenta eliminada</h1>
      <p style="color:rgba(240,246,252,0.55);font-size:14px;margin:0 0 20px;line-height:1.7">
        Hola ${nombre}, tu cuenta y datos personales han sido eliminados de GISTO.<br/>
        Tus comprobantes de pago se conservan por obligación legal (SUNAT).<br/><br/>
        Si en el futuro deseas volver, puedes registrarte nuevamente.
      </p>
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:14px;font-size:12px;color:rgba(240,246,252,0.35);margin-bottom:20px">
        ¿Fue un error? Escríbenos a <a href="mailto:admin@thegisto.com" style="color:rgba(0,168,232,0.7);text-decoration:none">admin@thegisto.com</a> dentro de las próximas 24 horas.
      </div>
    </div>
  </div>
  <div style="text-align:center;margin-top:24px"><p style="font-size:11px;color:rgba(240,246,252,0.25)">© 2026 GISTO Technologies</p></div>
</div></body></html>`
  })
  return NextResponse.json({ ok: true })
}
