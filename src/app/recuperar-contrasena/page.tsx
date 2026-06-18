'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function RecuperarContrasena() {
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    setError('')
    if (!email.includes('@')) { setError('Ingresa un correo válido'); return }
    setEnviando(true)
    try {
      await fetch('/api/auth/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      // Siempre mostrar enviado — no revelar si el email existe
      setEnviado(true)
    } catch { setError('Error de conexión. Intenta de nuevo.') }
    setEnviando(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0c1018', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontWeight: 900, fontSize: '22px', color: '#f0f6fc', letterSpacing: '-0.5px' }}>
              THE <span style={{ color: '#00A8E8' }}>GISTO</span>
            </span>
          </Link>
        </div>

        <div style={{ background: 'rgba(12,16,26,.97)', border: '1px solid rgba(240,246,252,.1)', borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ height: '3px', background: 'linear-gradient(90deg,#00A8E8,#00D4FF)' }}/>
          <div style={{ padding: '32px 28px' }}>

            {!enviado ? (<>
              <h1 style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontSize: '22px', fontWeight: 900, color: '#f0f6fc', letterSpacing: '-0.5px', marginBottom: '8px' }}>
                ¿Olvidaste tu contraseña?
              </h1>
              <p style={{ fontSize: '14px', color: 'rgba(240,246,252,.6)', marginBottom: '24px', lineHeight: 1.6 }}>
                Ingresa tu correo y te enviaremos un link para restablecerla.
              </p>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'rgba(240,246,252,.4)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Correo electrónico
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !enviando && handleSubmit()}
                  placeholder="tu@correo.com"
                  autoFocus
                  style={{ width: '100%', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(240,246,252,.1)', borderRadius: '10px', padding: '12px 14px', color: '#f0f6fc', fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>

              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 12px', background: 'rgba(255,70,100,.08)', border: '1px solid rgba(255,70,100,.2)', borderRadius: '8px', fontSize: '12px', color: '#E25C5C', marginBottom: '14px' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#E25C5C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {error}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={enviando || !email}
                style={{ width: '100%', padding: '13px', background: (enviando || !email) ? 'rgba(0,168,232,.3)' : 'linear-gradient(135deg,#00A8E8,#00D4FF)', color: (enviando || !email) ? 'rgba(0,0,0,.4)' : '#000', border: 'none', borderRadius: '10px', fontFamily: "'Cabinet Grotesk',sans-serif", fontSize: '15px', fontWeight: 800, cursor: (enviando || !email) ? 'not-allowed' : 'pointer', marginBottom: '16px', boxShadow: (!enviando && email) ? '0 4px 20px rgba(0,168,232,.3)' : 'none' }}
              >
                {enviando ? 'Enviando...' : 'Enviar instrucciones'}
              </button>

              <div style={{ textAlign: 'center' }}>
                <Link href="/login" style={{ fontSize: '13px', color: 'rgba(0,168,232,.8)', textDecoration: 'none', fontWeight: 500 }}>
                  ← Volver al login
                </Link>
              </div>
            </>) : (
              /* Estado enviado */
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(0,229,160,.1)', border: '2px solid rgba(0,229,160,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 0 24px rgba(0,229,160,.15)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00E5A0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                  </svg>
                </div>
                <h2 style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontSize: '20px', fontWeight: 900, color: '#f0f6fc', marginBottom: '10px' }}>
                  Revisa tu correo
                </h2>
                <p style={{ fontSize: '14px', color: 'rgba(240,246,252,.6)', lineHeight: 1.7, marginBottom: '24px' }}>
                  Si existe una cuenta asociada a <strong style={{ color: '#f0f6fc' }}>{email}</strong>, recibirás un link para restablecer tu contraseña en los próximos minutos.
                </p>
                <p style={{ fontSize: '12px', color: 'rgba(240,246,252,.35)', marginBottom: '20px' }}>
                  ¿No lo ves? Revisa tu carpeta de spam.
                </p>
                <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg,#00A8E8,#00D4FF)', color: '#000', padding: '11px 24px', borderRadius: '9px', fontWeight: 700, fontSize: '13px', textDecoration: 'none' }}>
                  ← Ir al login
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
