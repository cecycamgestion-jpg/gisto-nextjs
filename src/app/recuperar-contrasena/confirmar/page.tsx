'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function ConfirmarReset() {
  const router = useRouter()
  const [token, setToken] = useState('')
  const [nuevaPassword, setNuevaPassword] = useState('')
  const [confirmarPassword, setConfirmarPassword] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [error, setError] = useState('')
  const [tokenInvalido, setTokenInvalido] = useState(false)
  const [showPass1, setShowPass1] = useState(false)
  const [showPass2, setShowPass2] = useState(false)

  useEffect(() => {
    // Leer token de la URL sin useSearchParams
    const params = new URLSearchParams(window.location.search)
    const t = params.get('token')
    if (!t) { setTokenInvalido(true); return }
    setToken(t)
  }, [])

  async function handleSubmit() {
    setError('')
    if (nuevaPassword.length < 6) { setError('La contraseña debe tener mínimo 6 caracteres'); return }
    if (nuevaPassword !== confirmarPassword) { setError('Las contraseñas no coinciden'); return }
    setGuardando(true)
    try {
      const res = await fetch('/api/auth/confirm-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: nuevaPassword })
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error desconocido'); setGuardando(false); return }
      setGuardado(true)
      setTimeout(() => router.push('/login'), 3000)
    } catch { setError('Error de conexión. Intenta de nuevo.') }
    setGuardando(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(240,246,252,.1)',
    borderRadius: '10px', padding: '12px 40px 12px 14px', color: '#f0f6fc', fontSize: '14px',
    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box'
  }

  if (tokenInvalido) return (
    <div style={{ minHeight: '100vh', background: '#0c1018', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ textAlign: 'center', maxWidth: '380px' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(226,92,92,.1)', border: '2px solid rgba(226,92,92,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E25C5C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        </div>
        <h2 style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontSize: '20px', fontWeight: 900, color: '#f0f6fc', marginBottom: '10px' }}>Link inválido</h2>
        <p style={{ fontSize: '14px', color: 'rgba(240,246,252,.6)', marginBottom: '24px', lineHeight: 1.6 }}>
          Este link no es válido o ya expiró. Solicita uno nuevo.
        </p>
        <Link href="/recuperar-contrasena" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg,#00A8E8,#00D4FF)', color: '#000', padding: '11px 24px', borderRadius: '9px', fontWeight: 700, fontSize: '13px', textDecoration: 'none' }}>
          Solicitar nuevo link
        </Link>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0c1018', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

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

            {!guardado ? (<>
              <h1 style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontSize: '22px', fontWeight: 900, color: '#f0f6fc', letterSpacing: '-0.5px', marginBottom: '8px' }}>
                Nueva contraseña
              </h1>
              <p style={{ fontSize: '14px', color: 'rgba(240,246,252,.6)', marginBottom: '24px', lineHeight: 1.6 }}>
                Elige una contraseña segura de al menos 6 caracteres.
              </p>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'rgba(240,246,252,.4)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Nueva contraseña
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass1 ? 'text' : 'password'}
                    value={nuevaPassword}
                    onChange={e => setNuevaPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    autoFocus
                    style={inputStyle}
                  />
                  <button onClick={() => setShowPass1(v => !v)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'rgba(240,246,252,.4)' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      {showPass1 ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></> : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}
                    </svg>
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'rgba(240,246,252,.4)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Confirmar contraseña
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass2 ? 'text' : 'password'}
                    value={confirmarPassword}
                    onChange={e => setConfirmarPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !guardando && handleSubmit()}
                    placeholder="Repite la contraseña"
                    style={{ ...inputStyle, borderColor: confirmarPassword && confirmarPassword !== nuevaPassword ? 'rgba(226,92,92,.4)' : 'rgba(240,246,252,.1)' }}
                  />
                  <button onClick={() => setShowPass2(v => !v)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'rgba(240,246,252,.4)' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      {showPass2 ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></> : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}
                    </svg>
                  </button>
                </div>
                {confirmarPassword && confirmarPassword !== nuevaPassword && (
                  <div style={{ fontSize: '11px', color: '#E25C5C', marginTop: '4px' }}>Las contraseñas no coinciden</div>
                )}
              </div>

              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 12px', background: 'rgba(255,70,100,.08)', border: '1px solid rgba(255,70,100,.2)', borderRadius: '8px', fontSize: '12px', color: '#E25C5C', marginBottom: '14px' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#E25C5C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {error}
                  {error.includes('expiró') && (
                    <Link href="/recuperar-contrasena" style={{ color: '#00A8E8', textDecoration: 'none', fontWeight: 700, marginLeft: '4px', whiteSpace: 'nowrap' }}>Solicitar nuevo →</Link>
                  )}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={guardando || !nuevaPassword || !confirmarPassword}
                style={{ width: '100%', padding: '13px', background: (guardando || !nuevaPassword || !confirmarPassword) ? 'rgba(0,168,232,.3)' : 'linear-gradient(135deg,#00A8E8,#00D4FF)', color: (guardando || !nuevaPassword || !confirmarPassword) ? 'rgba(0,0,0,.4)' : '#000', border: 'none', borderRadius: '10px', fontFamily: "'Cabinet Grotesk',sans-serif", fontSize: '15px', fontWeight: 800, cursor: (guardando || !nuevaPassword || !confirmarPassword) ? 'not-allowed' : 'pointer', boxShadow: (!guardando && nuevaPassword && confirmarPassword) ? '0 4px 20px rgba(0,168,232,.3)' : 'none' }}
              >
                {guardando ? 'Guardando...' : 'Guardar nueva contraseña'}
              </button>
            </>) : (
              /* Estado éxito */
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(0,229,160,.1)', border: '2px solid rgba(0,229,160,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 0 24px rgba(0,229,160,.15)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00E5A0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <h2 style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontSize: '20px', fontWeight: 900, color: '#f0f6fc', marginBottom: '10px' }}>
                  ¡Contraseña actualizada!
                </h2>
                <p style={{ fontSize: '14px', color: 'rgba(240,246,252,.6)', marginBottom: '20px', lineHeight: 1.6 }}>
                  Tu contraseña fue cambiada exitosamente.<br/>
                  Redirigiendo al login en 3 segundos...
                </p>
                <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg,#00A8E8,#00D4FF)', color: '#000', padding: '11px 24px', borderRadius: '9px', fontWeight: 700, fontSize: '13px', textDecoration: 'none' }}>
                  Ir al login →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus { border-color: rgba(0,168,232,.5) !important; box-shadow: 0 0 0 3px rgba(0,168,232,.1) !important; }
        input::placeholder { color: rgba(240,246,252,.25); }
      `}</style>
    </div>
  )
}
