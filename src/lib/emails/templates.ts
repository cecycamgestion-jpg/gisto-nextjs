// lib/emails/templates.ts
//
// 5 templates de email para los flujos críticos de THE GISTO.
// Estilo: HTML inline simple (clientes de correo móviles no respetan <style>
// del head), sin imágenes externas (mejor entregabilidad inicial), copy
// alineado a reglas de memoria:
//   - Sin "IA" ni "inteligencia artificial"
//   - Sin promesas de tiempo concretas
//   - "Revisión de calidad", no "error"
//   - Firma: "Equipo THE GISTO"
//
// Cómo se usan desde una API route o desde el backend Python (Resend acepta
// HTML por API REST igual):
//
//   import { emailConfirmacionPago } from '@/lib/emails/templates'
//   const { subject, html } = emailConfirmacionPago({
//     nombre: 'Alejandro',
//     plan: 'Premium',
//     minutos: 1500,
//     comprobante_url: 'https://...',
//   })
//   await resend.emails.send({
//     from: 'THE GISTO <admin@thegisto.com>',
//     to: clienteEmail,
//     subject,
//     html,
//   })
//
// Si prefieres invocar desde Python (Railway), Resend tiene API REST simple:
//   POST https://api.resend.com/emails  con body {from, to, subject, html}
//   header Authorization: Bearer <RESEND_API_KEY>

export interface EmailRendered {
  subject: string
  html: string
}

// ──────────────────────────────────────────────────────────────────────
// Helpers compartidos
// ──────────────────────────────────────────────────────────────────────

const BRAND   = '#00A8E8'
const TEXTC   = '#1a1f2e'
const TEXTC_2 = '#566378'
const BG      = '#f6f8fb'
const CARD_BG = '#ffffff'
const BORDER  = '#e5eaf2'

function shell(content: string, opts: { preheader?: string } = {}): string {
  // Preheader: texto invisible que aparece en preview del inbox (Gmail, iOS Mail)
  const pre = opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:${BG};opacity:0;">${opts.preheader}</div>` : ''
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>THE GISTO</title></head>
<body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${TEXTC};">
${pre}
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG};padding:24px 0;">
  <tr><td align="center">
    <table width="540" cellpadding="0" cellspacing="0" border="0" style="max-width:540px;width:100%;background:${CARD_BG};border-radius:16px;border:1px solid ${BORDER};overflow:hidden;">
      <tr><td style="padding:28px 32px 8px;">
        <div style="font-family:'Cabinet Grotesk',sans-serif;font-weight:900;font-size:20px;letter-spacing:-0.5px;color:${TEXTC};">
          THE <span style="color:${BRAND};">GISTO</span>
        </div>
      </td></tr>
      <tr><td style="padding:8px 32px 28px;font-size:15px;line-height:1.6;color:${TEXTC};">
        ${content}
      </td></tr>
      <tr><td style="padding:18px 32px 24px;border-top:1px solid ${BORDER};font-size:12px;color:${TEXTC_2};line-height:1.5;">
        Equipo THE GISTO · <a href="https://www.thegisto.com" style="color:${BRAND};text-decoration:none;">www.thegisto.com</a><br>
        Si no esperabas este correo, puedes ignorarlo. Tu cuenta está segura.
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
}

function btn(label: string, href: string): string {
  return `<table cellpadding="0" cellspacing="0" border="0" style="margin:18px 0;"><tr><td style="background:${BRAND};border-radius:10px;">
    <a href="${href}" style="display:inline-block;padding:12px 22px;color:#000;text-decoration:none;font-weight:800;font-size:14px;font-family:inherit;">${label}</a>
  </td></tr></table>`
}

function esc(s: any): string {
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] as string))
}

function formatMinutos(min: number): string {
  if (!min || min <= 0) return '0 min'
  const h = Math.floor(min / 60), rem = min % 60
  if (h === 0) return `${rem} min`
  if (rem === 0) return `${h} h`
  return `${h} h ${rem} min`
}

// ──────────────────────────────────────────────────────────────────────
// 1. CONFIRMACIÓN DE PAGO
// ──────────────────────────────────────────────────────────────────────

export interface ConfirmacionPagoData {
  nombre: string
  plan: string            // 'Básico' | 'Estándar' | 'Premium' | 'Empresarial'
  minutos: number         // créditos acreditados
  saldo_total?: number    // saldo total tras acreditar (opcional)
  comprobante_url?: string
  dashboard_url?: string
}

export function emailConfirmacionPago(d: ConfirmacionPagoData): EmailRendered {
  const dashUrl = d.dashboard_url || 'https://app.thegisto.com/dashboard'
  const compRow = d.comprobante_url
    ? `<p style="margin:14px 0 0;font-size:13px;color:${TEXTC_2};">Comprobante: <a href="${esc(d.comprobante_url)}" style="color:${BRAND};text-decoration:none;">descargar PDF</a></p>`
    : ''
  const saldoRow = (typeof d.saldo_total === 'number')
    ? `<tr><td style="padding:6px 0;color:${TEXTC_2};">Saldo total tras este pago</td><td align="right" style="padding:6px 0;font-weight:700;">${esc(formatMinutos(d.saldo_total))}</td></tr>`
    : ''
  const content = `
    <h1 style="font-family:'Cabinet Grotesk',sans-serif;font-size:22px;font-weight:900;margin:0 0 10px;color:${TEXTC};">
      ¡Bienvenido, ${esc(d.nombre)}!
    </h1>
    <p style="margin:0 0 14px;">Tu pago se procesó correctamente. Tus créditos ya están disponibles en tu cuenta.</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f6f8fb;border-radius:10px;padding:14px;margin:8px 0 4px;">
      <tr><td style="padding:6px 0;color:${TEXTC_2};">Plan</td><td align="right" style="padding:6px 0;font-weight:700;">${esc(d.plan)}</td></tr>
      <tr><td style="padding:6px 0;color:${TEXTC_2};">Créditos acreditados</td><td align="right" style="padding:6px 0;font-weight:700;color:${BRAND};">+${esc(formatMinutos(d.minutos))}</td></tr>
      ${saldoRow}
    </table>
    ${compRow}
    ${btn('Subir mi primer video →', dashUrl)}
    <p style="margin:0;font-size:13px;color:${TEXTC_2};line-height:1.6;">Los créditos no vencen. Puedes usarlos cuando quieras.</p>
  `
  return {
    subject: `Tus créditos están listos · Plan ${d.plan}`,
    html: shell(content, { preheader: `+${formatMinutos(d.minutos)} acreditados. Plan ${d.plan} activo.` }),
  }
}

// ──────────────────────────────────────────────────────────────────────
// 2. VIDEO RECIBIDO / EN PROCESAMIENTO
// ──────────────────────────────────────────────────────────────────────

export interface VideoRecibidoData {
  nombre: string
  video_id: string
  dashboard_url?: string
}

export function emailVideoRecibido(d: VideoRecibidoData): EmailRendered {
  const dashUrl = d.dashboard_url || 'https://app.thegisto.com/dashboard'
  const content = `
    <h1 style="font-family:'Cabinet Grotesk',sans-serif;font-size:22px;font-weight:900;margin:0 0 10px;color:${TEXTC};">
      Recibimos tu video, ${esc(d.nombre)}
    </h1>
    <p style="margin:0 0 14px;">Está en cola del motor pedagógico. <strong>${esc(d.video_id)}</strong>.</p>
    <p style="margin:0 0 14px;color:${TEXTC_2};">Te enviaremos otro correo cuando esté listo para descargar. Puedes seguir el avance en tu dashboard.</p>
    ${btn('Ver el progreso', dashUrl)}
    <p style="margin:10px 0 0;font-size:12px;color:${TEXTC_2};">Los minutos están reservados de tu saldo. Si por algo de nuestro lado no podemos completar el proceso, devolvemos los minutos sin que tengas que hacer nada.</p>
  `
  return {
    subject: `Recibimos tu video · ${d.video_id}`,
    html: shell(content, { preheader: 'Te avisaremos por correo cuando esté listo para descargar.' }),
  }
}

// ──────────────────────────────────────────────────────────────────────
// 3. EN REVISIÓN DE CALIDAD (fallback humano-asistido)
// ──────────────────────────────────────────────────────────────────────

export interface VideoEnRevisionData {
  nombre: string
  video_id: string
  dashboard_url?: string
}

export function emailVideoEnRevision(d: VideoEnRevisionData): EmailRendered {
  const dashUrl = d.dashboard_url || 'https://app.thegisto.com/dashboard'
  const content = `
    <h1 style="font-family:'Cabinet Grotesk',sans-serif;font-size:22px;font-weight:900;margin:0 0 10px;color:${TEXTC};">
      Tu video está en revisión final
    </h1>
    <p style="margin:0 0 14px;">Hola ${esc(d.nombre)}, estamos haciendo una revisión final de calidad sobre <strong>${esc(d.video_id)}</strong> para asegurarnos de que los cortes y la estructura sean los correctos.</p>
    <p style="margin:0 0 14px;color:${TEXTC_2};">No necesitas hacer nada. Te avisamos por correo cuando esté listo para descargar.</p>
    ${btn('Ver mi dashboard', dashUrl)}
  `
  return {
    subject: `Tu video está en revisión final · ${d.video_id}`,
    html: shell(content, { preheader: 'No necesitas hacer nada. Te avisamos cuando esté listo.' }),
  }
}

// ──────────────────────────────────────────────────────────────────────
// 4. CURSO LISTO PARA DESCARGAR
// ──────────────────────────────────────────────────────────────────────

export interface CursoListoData {
  nombre: string
  video_id: string
  zip_url: string          // URL presigned o link a dashboard
  modulos?: number
  dashboard_url?: string
}

export function emailCursoListo(d: CursoListoData): EmailRendered {
  const dashUrl = d.dashboard_url || 'https://app.thegisto.com/dashboard'
  const modRow = (typeof d.modulos === 'number' && d.modulos > 0)
    ? `<tr><td style="padding:6px 0;color:${TEXTC_2};">Cápsulas generadas</td><td align="right" style="padding:6px 0;font-weight:700;">${d.modulos}</td></tr>`
    : ''
  const content = `
    <h1 style="font-family:'Cabinet Grotesk',sans-serif;font-size:22px;font-weight:900;margin:0 0 10px;color:${TEXTC};">
      Tu curso está listo, ${esc(d.nombre)}
    </h1>
    <p style="margin:0 0 14px;">El motor terminó de procesar <strong>${esc(d.video_id)}</strong>. Ya puedes descargar el ZIP listo para tu LMS.</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f6f8fb;border-radius:10px;padding:14px;margin:8px 0 4px;">
      ${modRow}
      <tr><td style="padding:6px 0;color:${TEXTC_2};">Incluye</td><td align="right" style="padding:6px 0;font-weight:700;">Word + quiz + glosario + APA</td></tr>
    </table>
    ${btn('Descargar mi curso →', d.zip_url || dashUrl)}
    <p style="margin:10px 0 0;font-size:13px;color:${TEXTC_2};line-height:1.6;">
      Si el enlace expira, puedes generar uno nuevo desde tu <a href="${esc(dashUrl)}" style="color:${BRAND};text-decoration:none;">dashboard</a>.
    </p>
  `
  return {
    subject: `Tu curso está listo · ${d.video_id}`,
    html: shell(content, { preheader: 'ZIP con cápsulas, Word, quiz, glosario y bibliografía APA.' }),
  }
}

// ──────────────────────────────────────────────────────────────────────
// 5. ERROR / NO SE PUDO PROCESAR
// ──────────────────────────────────────────────────────────────────────

export interface VideoErrorData {
  nombre: string
  video_id: string
  motivo_amigable: string  // ya redactado en lenguaje humano (sin códigos)
  soporte_email?: string
  dashboard_url?: string
}

export function emailVideoError(d: VideoErrorData): EmailRendered {
  const dashUrl = d.dashboard_url || 'https://app.thegisto.com/dashboard'
  const soporte = d.soporte_email || 'admin@thegisto.com'
  const content = `
    <h1 style="font-family:'Cabinet Grotesk',sans-serif;font-size:22px;font-weight:900;margin:0 0 10px;color:${TEXTC};">
      No pudimos procesar tu video
    </h1>
    <p style="margin:0 0 14px;">Hola ${esc(d.nombre)}, ocurrió algo con <strong>${esc(d.video_id)}</strong> que nos impidió completar el proceso.</p>
    <p style="margin:0 0 14px;padding:12px 14px;background:#fff8ee;border-left:3px solid #FFB020;border-radius:6px;color:${TEXTC};">
      ${esc(d.motivo_amigable)}
    </p>
    <p style="margin:0 0 14px;color:${TEXTC_2};">Los minutos reservados ya fueron devueltos a tu saldo. Puedes intentarlo de nuevo o escribirnos si necesitas ayuda.</p>
    ${btn('Volver a intentar', dashUrl)}
    <p style="margin:10px 0 0;font-size:13px;color:${TEXTC_2};line-height:1.6;">
      Si esto se repite, escríbenos a <a href="mailto:${esc(soporte)}" style="color:${BRAND};text-decoration:none;">${esc(soporte)}</a> y lo resolvemos.
    </p>
  `
  return {
    subject: `No pudimos procesar · ${d.video_id}`,
    html: shell(content, { preheader: 'Los minutos reservados ya fueron devueltos a tu saldo.' }),
  }
}
