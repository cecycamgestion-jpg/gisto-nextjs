// NOTIFICACION EMAIL CON RESEND
// Archivo: src/lib/email.ts
// Instalar: npm install resend

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function enviarEmailZipListo({
  emailUsuario,
  nombreCurso,
  zipUrl,
  modulos,
  duracion
}: {
  emailUsuario: string
  nombreCurso: string
  zipUrl: string
  modulos: number
  duracion: number
}) {
  const duracionMin = Math.round(duracion / 60)

  await resend.emails.send({
    from: 'GISTO <noreply@thegisto.com>',
    to: emailUsuario,
    subject: `✅ Tu curso "${nombreCurso}" está listo`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#060810;font-family:Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px">

    <!-- LOGO -->
    <div style="text-align:center;margin-bottom:32px">
      <span style="font-size:22px;font-weight:900;color:#F0F6FC;letter-spacing:-0.5px">
        THE <span style="color:#00A8E8">GISTO</span>
      </span>
    </div>

    <!-- CARD -->
    <div style="background:#0C1018;border:1px solid rgba(0,168,232,0.14);border-radius:16px;overflow:hidden">
      <div style="height:3px;background:linear-gradient(90deg,#00A8E8,#00D4FF)"></div>
      <div style="padding:32px 28px">

        <div style="text-align:center;margin-bottom:24px">
          <div style="width:64px;height:64px;background:rgba(0,229,160,0.1);border:2px solid rgba(0,229,160,0.25);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:28px;margin-bottom:16px">✅</div>
          <h1 style="color:#F0F6FC;font-size:22px;font-weight:800;margin:0 0 8px;letter-spacing:-0.5px">¡Tu curso está listo!</h1>
          <p style="color:rgba(240,246,252,0.55);font-size:14px;margin:0">${nombreCurso}</p>
        </div>

        <!-- STATS -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:24px;text-align:center">
          <div style="background:rgba(0,168,232,0.06);border:1px solid rgba(0,168,232,0.14);border-radius:10px;padding:14px">
            <div style="font-size:22px;font-weight:900;color:#00A8E8;font-family:monospace">${modulos}</div>
            <div style="font-size:11px;color:rgba(240,246,252,0.4);margin-top:2px">Módulos</div>
          </div>
          <div style="background:rgba(0,168,232,0.06);border:1px solid rgba(0,168,232,0.14);border-radius:10px;padding:14px">
            <div style="font-size:22px;font-weight:900;color:#00A8E8;font-family:monospace">${duracionMin}</div>
            <div style="font-size:11px;color:rgba(240,246,252,0.4);margin-top:2px">Minutos</div>
          </div>
          <div style="background:rgba(0,229,160,0.06);border:1px solid rgba(0,229,160,0.2);border-radius:10px;padding:14px">
            <div style="font-size:22px;font-weight:900;color:#00E5A0;font-family:monospace">1</div>
            <div style="font-size:11px;color:rgba(240,246,252,0.4);margin-top:2px">ZIP</div>
          </div>
        </div>

        <!-- CONTENIDO -->
        <div style="margin-bottom:24px">
          ${[
            `${modulos} cápsulas de video pedagógicas`,
            `${modulos} documentos Word con transcripción`,
            'Quizzes y glosario técnico por módulo',
            'Índice completo del curso (LEEME.txt)',
            'Interacciones de aula eliminadas'
          ].map(item => `
            <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:rgba(240,246,252,0.55);padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04)">
              <span style="color:#00E5A0;font-weight:700;font-size:11px">✓</span>${item}
            </div>
          `).join('')}
        </div>

        <!-- CTA -->
        <div style="text-align:center">
          <a href="${zipUrl}" style="display:inline-block;background:#00A8E8;color:#000;padding:14px 32px;border-radius:10px;font-weight:800;font-size:15px;text-decoration:none;margin-bottom:12px">
            ⬇️ Descargar ZIP ahora
          </a>
          <br>
          <a href="https://app.thegisto.com/dashboard" style="font-size:12px;color:rgba(240,246,252,0.4);text-decoration:none">
            Ver en mi dashboard →
          </a>
        </div>
      </div>
    </div>

    <!-- FOOTER -->
    <div style="text-align:center;margin-top:24px">
      <p style="font-size:11px;color:rgba(240,246,252,0.25);margin:0">
        © 2026 GISTO Technologies · Lima, Perú<br>
        <a href="https://www.thegisto.com" style="color:rgba(0,168,232,0.5);text-decoration:none">thegisto.com</a>
      </p>
    </div>
  </div>
</body>
</html>
    `
  })
}
