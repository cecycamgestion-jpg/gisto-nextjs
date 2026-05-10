// EMAIL BIENVENIDA - src/lib/email-bienvenida.ts
// Llamar desde login/page.tsx después de crear cuenta exitosamente

export async function enviarEmailBienvenida(emailUsuario: string, nombre: string) {
  const res = await fetch('/api/email/bienvenida', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: emailUsuario, nombre })
  })
  return res.ok
}
