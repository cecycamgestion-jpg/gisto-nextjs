import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
const resend = new Resend(process.env.RESEND_API_KEY)
export async function POST(req: NextRequest) {
  const { email, nombre, nombre_curso, capsulas, zip_url } = await req.json()
  await resend.emails.send({
    from: 'GISTO <notificaciones@thegisto.com>',
    to: email,
    subject: `¡Tu curso "${nombre_curso}" está listo!`,
    html: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#060810;font-family:Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:40px 24px">
  <div style="text-align:center;margin-bottom:32px"><span style="font-size:22px;font-weight:900;color:#F0F6FC">THE <span style="color:#00A8E8">GISTO</span></span></div>
  <div style="background:#0C1018;border:1px solid rgba(0,168,232,0.14);border-radius:16px;overflow:hidden">
    <div style="height:3px;background:linear-gradient(90deg,#00A8E8,#00E5A0)"></div>
    <div style="padding:32px 28px;text-align:center">
      <div style="font-size:48px;margin-bottom:16px">✅</div>
      <h1 style="color:#F0F6FC;font-size:22px;font-weight:800;margin:0 0 8px">¡${nombre}, tu curso está listo!</h1>
      <p style="color:rgba(240,246,252,0.55);font-size:15px;margin:0 0 20px;line-height:1.6">
        <strong style="color:#F0F6FC">${nombre_curso}</strong> fue procesado exitosamente.
      </p>
      <div style="background:rgba(0,168,232,0.06);border:1px solid rgba(0,168,232,0.14);border-radius:12px;padding:20px;margin-bottom:24px;text-align:left">
        <div style="font-size:11px;font-weight:700;color:rgba(240,246,252,0.4);letter-spacing:2px;text-transform:uppercase;margin-bottom:14px">LO QUE RECIBES</div>
        ${[`${capsulas} cápsulas de video pedagógico`,'Guía de estudio Word completa','Quiz multinivel + Glosario técnico','Bibliografía APA con DOIs reales','ZIP listo para tu LMS'].map(item => `
        <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:rgba(240,246,252,0.65);margin-bottom:8px">
          <span style="color:#00E5A0;font-weight:700;font-size:11px">✓</span>${item}
        </div>`).join('')}
      </div>
      <a href="${zip_url || 'https://app.thegisto.com/dashboard'}" style="display:inline-block;background:linear-gradient(135deg,#00A8E8,#00D4FF);color:#000;padding:14px 32px;border-radius:10px;font-weight:800;font-size:15px;text-decoration:none">
        Descargar mi curso →
      </a>
      <p style="color:rgba(240,246,252,0.3);font-size:12px;margin-top:16px">El ZIP también está disponible en tu dashboard</p>
    </div>
  </div>
  <div style="text-align:center;margin-top:24px"><p style="font-size:11px;color:rgba(240,246,252,0.25)">© 2026 GISTO Technologies · <a href="https://www.thegisto.com" style="color:rgba(0,168,232,0.5);text-decoration:none">thegisto.com</a></p></div>
</div></body></html>`
  })
  return NextResponse.json({ ok: true })
}
