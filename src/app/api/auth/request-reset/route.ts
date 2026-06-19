import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabase } from '@/lib/supabase'

const resend = new Resend(process.env.RESEND_API_KEY)
const NEXTJS_URL = process.env.NEXTJS_URL || 'https://app.thegisto.com'

const RESPUESTA_GENERICA = NextResponse.json({
  ok: true,
  message: 'Si existe una cuenta con ese correo, recibirás las instrucciones en minutos.'
})

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email?.includes('@')) {
      return NextResponse.json({ error: 'Correo no válido' }, { status: 400 })
    }

    // 1. Buscar usuario en Supabase
    const { data: user } = await supabase
      .from('Usuarios')
      .select('id, Nombre')
      .eq('Email', email)
      .maybeSingle()

    // Si no existe, devolver respuesta generica sin revelar que no existe
    if (!user) return RESPUESTA_GENERICA

    // 2. Generar token seguro y expiracion de 1 hora
    const token = crypto.randomUUID()
    const expira = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    const nombre = user.Nombre || email.split('@')[0]

    // 3. Guardar token en Supabase
    await supabase
      .from('Usuarios')
      .update({ Reset_Token: token, Reset_Expira: expira })
      .eq('id', user.id)

    // 4. Enviar email con el link de reset
    const resetLink = `${NEXTJS_URL}/recuperar-contrasena/confirmar?token=${token}`

    await resend.emails.send({
      from: 'GISTO <notificaciones@thegisto.com>',
      to: email,
      subject: 'Restablece tu contraseña — THE GISTO',
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#060810;font-family:Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:40px 24px">
  <div style="text-align:center;margin-bottom:32px">
    <span style="font-size:22px;font-weight:900;color:#F0F6FC;letter-spacing:-0.5px">THE <span style="color:#00A8E8">GISTO</span></span>
  </div>
  <div style="background:#0C1018;border:1px solid rgba(0,168,232,0.14);border-radius:16px;overflow:hidden">
    <div style="height:3px;background:linear-gradient(90deg,#00A8E8,#00D4FF)"></div>
    <div style="padding:32px 28px;text-align:center">
      <div style="margin-bottom:16px">
        <img src="https://www.thegisto.com/isotipo.png" alt="GISTO" width="64" height="64" style="display:block;margin:0 auto"/>
      </div>
      <h1 style="color:#F0F6FC;font-size:24px;font-weight:800;margin:0 0 8px;letter-spacing:-0.5px">¡Hola ${nombre}!</h1>
      <p style="color:rgba(240,246,252,0.55);font-size:15px;margin:0 0 24px;line-height:1.6">
        Recibimos una solicitud para restablecer tu contraseña.<br/>
        Si no fuiste tú, ignora este correo.
      </p>
      <a href="${resetLink}" style="display:inline-block;background:linear-gradient(135deg,#00A8E8,#00D4FF);color:#000;padding:14px 32px;border-radius:10px;font-weight:800;font-size:15px;text-decoration:none;margin-bottom:20px">
        🔑 Restablecer contraseña
      </a>
      <div style="background:rgba(255,176,32,0.06);border:1px solid rgba(255,176,32,0.15);border-radius:10px;padding:14px 18px;margin-bottom:20px;text-align:left">
        <div style="font-size:12px;color:rgba(255,176,32,0.9);font-weight:700;margin-bottom:4px">⚠ Este link expira en 1 hora</div>
        <div style="font-size:12px;color:rgba(240,246,252,0.4);line-height:1.5">
          Si el botón no funciona, copia y pega este link en tu navegador:<br/>
          <span style="color:rgba(0,168,232,0.7);word-break:break-all">${resetLink}</span>
        </div>
      </div>
      <p style="color:rgba(240,246,252,0.25);font-size:11px;margin:0">
        Si no solicitaste este cambio, tu cuenta sigue segura.
      </p>
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

    return RESPUESTA_GENERICA
  } catch (error) {
    console.error('Request reset error:', error)
    return RESPUESTA_GENERICA
  }
}
