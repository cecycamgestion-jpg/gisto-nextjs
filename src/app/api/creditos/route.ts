// API ROUTE: src/app/api/email/creditos/route.ts
// Llamar desde app.py webhook cuando creditos < 5
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const { email, nombre, creditos_restantes } = await req.json()
  
  await resend.emails.send({
    from: 'GISTO <notificaciones@thegisto.com>',
    to: email,
    subject: `Te quedan ${creditos_restantes} minutos en GISTO`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#060810;font-family:Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:40px 24px">
  <div style="text-align:center;margin-bottom:32px">
    <span style="font-size:22px;font-weight:900;color:#F0F6FC">THE <span style="color:#00A8E8">GISTO</span></span>
  </div>
  <div style="background:#0C1018;border:1px solid rgba(255,176,32,0.2);border-radius:16px;overflow:hidden">
    <div style="height:3px;background:linear-gradient(90deg,#FFB020,#FFD060)"></div>
    <div style="padding:32px 28px;text-align:center">
      <div style="font-size:48px;margin-bottom:16px">⚡</div>
      <h1 style="color:#F0F6FC;font-size:22px;font-weight:800;margin:0 0 8px">Te quedan ${creditos_restantes} minutos</h1>
      <p style="color:rgba(240,246,252,0.55);font-size:15px;margin:0 0 28px;line-height:1.6">
        ${nombre}, estás aprovechando GISTO. Para seguir convirtiendo tus clases en cursos, recarga tus créditos.
      </p>
      <div style="display:grid;gap:12px;margin-bottom:28px">
        ${[
          {nombre:'Starter', precio:'S/175', horas:'2 horas', highlight:false},
          {nombre:'Profesional', precio:'S/649', horas:'8 horas', highlight:true},
          {nombre:'Academia', precio:'S/1,180', horas:'20 horas', highlight:false},
        ].map(plan => `
        <div style="background:${plan.highlight?'rgba(0,168,232,0.08)':'rgba(255,255,255,0.03)'};border:1px solid ${plan.highlight?'rgba(0,168,232,0.3)':'rgba(255,255,255,0.06)'};border-radius:10px;padding:14px 18px;display:flex;justify-content:space-between;align-items:center">
          <div style="text-align:left">
            <div style="font-size:14px;font-weight:700;color:#F0F6FC">${plan.nombre}</div>
            <div style="font-size:12px;color:rgba(240,246,252,0.4)">${plan.horas} de video</div>
          </div>
          <div style="font-size:18px;font-weight:900;color:${plan.highlight?'#00A8E8':'#F0F6FC'}">${plan.precio}</div>
        </div>`).join('')}
      </div>
      <a href="https://app.thegisto.com/planes" style="display:inline-block;background:#00A8E8;color:#000;padding:14px 32px;border-radius:10px;font-weight:800;font-size:15px;text-decoration:none">
        Ver planes →
      </a>
      <p style="color:rgba(240,246,252,0.3);font-size:12px;margin-top:16px">Tus créditos no vencen nunca · Pago seguro con tarjeta</p>
    </div>
  </div>
  <div style="text-align:center;margin-top:24px">
    <p style="font-size:11px;color:rgba(240,246,252,0.25)">
      © 2026 GISTO Technologies · 
      <a href="https://www.thegisto.com" style="color:rgba(0,168,232,0.5);text-decoration:none">thegisto.com</a>
    </p>
  </div>
</div>
</body>
</html>`
  })
  
  return NextResponse.json({ ok: true })
}
