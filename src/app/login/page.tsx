'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const PAISES = [
  'Argentina','Bolivia','Chile','Colombia','Costa Rica','Ecuador',
  'El Salvador','España','Estados Unidos','Guatemala','Honduras',
  'México','Nicaragua','Panamá','Paraguay','Perú','República Dominicana',
  'Uruguay','Venezuela','Otro'
]
const TIPOS_DOCUMENTO = ['DNI','RUC','Pasaporte','Tax ID','Cédula','Otro']

const ENTREGABLES = [
  { icon: 'M23 7l-7 5 7 5V7zM1 5h15a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H1z', label: 'Cápsulas de video pedagógicas', color: '#E25C5C' },
  { icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6', label: 'Documentos Word editables', color: '#4A90D9' },
  { icon: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11', label: 'Quiz con 3 niveles de dificultad', color: '#00E5A0' },
  { icon: 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z', label: 'Glosario técnico contextualizado', color: '#00A8E8' },
  { icon: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z', label: 'Bibliografía APA con links', color: '#FFB020' },
  { icon: 'M21 8l-8-5-8 5v10l8 5 8-5V8z', label: 'ZIP listo para Moodle y Canvas', color: '#A078FF' },
]

export default function Login() {
  const [mode, setMode] = useState<'login'|'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [pais, setPais] = useState('')
  const [tipoDocumento, setTipoDocumento] = useState('')
  const [numeroDocumento, setNumeroDocumento] = useState('')
  const [razonSocial, setRazonSocial] = useState('')
  const [aceptaTerminos, setAceptaTerminos] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)
  const [activeItem, setActiveItem] = useState(0)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    const interval = setInterval(() => setActiveItem(v => (v + 1) % ENTREGABLES.length), 2000)
    return () => clearInterval(interval)
  }, [])

  async function handleSubmit() {
    setError('')
    if (!email.includes('@')) { setError('Ingresa un correo electrónico válido'); return }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    if (mode === 'register') {
      if (!nombre.trim()) { setError('El nombre completo es obligatorio'); return }
      if (!pais) { setError('Selecciona tu país'); return }
      if (!tipoDocumento) { setError('Selecciona el tipo de documento'); return }
      if (!numeroDocumento.trim()) { setError('El número de documento es obligatorio'); return }
      if (!aceptaTerminos) { setError('Debes aceptar los Términos y la Política de Privacidad'); return }
    }
    setLoading(true)
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const body = mode === 'login'
        ? { email, password }
        : { email, password, nombre, pais, tipo_documento: tipoDocumento, numero_documento: numeroDocumento, razon_social: razonSocial || nombre }
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error desconocido'); setLoading(false); return }
      localStorage.setItem('gisto_user', JSON.stringify(data.user))
      router.push('/dashboard')
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.')
      setLoading(false)
    }
  }

  const botonDeshabilitado = loading || (mode === 'register' && !aceptaTerminos)

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(240,246,252,0.1)', borderRadius: '10px',
    padding: '13px 16px', color: 'var(--t1)', fontSize: '14px',
    outline: 'none', fontFamily: 'inherit', transition: 'all .2s'
  }
  const labelStyle: React.CSSProperties = {
    fontSize: '11px', fontWeight: 700, color: 'var(--t3)',
    letterSpacing: '1.5px', textTransform: 'uppercase',
    display: 'block', marginBottom: '8px'
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      background: 'var(--bg)', position: 'relative' as const, overflow: 'hidden'
    }}>
      {/* ── Panel izquierdo — Value proposition ─────────────────────────── */}
      <div style={{
        flex: '0 0 48%', display: 'flex', flexDirection: 'column' as const,
        justifyContent: 'center', padding: '60px 56px',
        background: 'linear-gradient(135deg, rgba(0,168,232,0.06) 0%, transparent 60%)',
        borderRight: '1px solid rgba(0,168,232,0.1)',
        position: 'relative' as const,
      }} className="login-left">

        {/* Orb de fondo */}
        <div style={{
          position: 'absolute' as const, top: '-10%', left: '-20%',
          width: '500px', height: '500px',
          background: 'radial-gradient(circle, rgba(0,168,232,0.08) 0%, transparent 65%)',
          borderRadius: '50%', pointerEvents: 'none'
        }}/>

        {/* Logo */}
        <a href="https://thegisto.com" style={{
          display: 'inline-flex', alignItems: 'center', gap: '12px',
          textDecoration: 'none', marginBottom: '56px'
        }}>
          <img src="/isotipo.png" alt="GISTO" style={{
            height: '52px', width: 'auto', objectFit: 'contain',
            filter: 'drop-shadow(0 0 12px rgba(0,168,232,0.4))'
          }}/>
          <span style={{
            fontFamily: "'Cabinet Grotesk', sans-serif",
            fontWeight: 900, fontSize: '22px', color: 'var(--t1)'
          }}>
            THE <span style={{ color: 'var(--c)' }}>GISTO</span>
          </span>
        </a>

        {/* Headline */}
        <div style={{ marginBottom: '48px' }}>
          <h1 style={{
            fontFamily: "'Cabinet Grotesk', sans-serif",
            fontSize: 'clamp(28px,3vw,40px)', fontWeight: 900,
            letterSpacing: '-1.5px', lineHeight: 1.1, marginBottom: '14px',
            color: 'var(--t1)'
          }}>
            Una clase grabada.<br/>
            <span style={{
              background: 'linear-gradient(90deg, var(--c), var(--c2))',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>Un curso completo.</span>
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--t2)', lineHeight: 1.7, maxWidth: '380px' }}>
            Sube tu grabación de Zoom o Meet y recibe en minutos todo lo que necesitas para publicar un curso profesional.
          </p>
        </div>

        {/* Entregables animados */}
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '8px', marginBottom: '48px' }}>
          {ENTREGABLES.map((e, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '10px 14px', borderRadius: '10px',
              background: activeItem === i ? `${e.color}12` : 'transparent',
              border: `1px solid ${activeItem === i ? `${e.color}30` : 'transparent'}`,
              transition: 'all .4s ease',
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateX(0)' : 'translateX(-10px)',
            }}>
              <div style={{
                width: '30px', height: '30px', borderRadius: '8px', flexShrink: 0,
                background: `${e.color}18`, border: `1px solid ${e.color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke={e.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={e.icon}/>
                </svg>
              </div>
              <span style={{
                fontSize: '13px', fontWeight: activeItem === i ? 600 : 400,
                color: activeItem === i ? 'var(--t1)' : 'var(--t2)',
                transition: 'all .4s'
              }}>{e.label}</span>
              {activeItem === i && (
                <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke={e.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '32px' }}>
          {[
            { num: '40 min', label: 'Gratis al registrarte' },
            { num: '6+', label: 'Entregables por video' },
            { num: '0', label: 'Horas de edición manual' },
          ].map((s, i) => (
            <div key={i}>
              <div style={{
                fontFamily: "'Cabinet Grotesk', sans-serif",
                fontSize: '22px', fontWeight: 900,
                background: 'linear-gradient(135deg, var(--c), var(--c2))',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                backgroundClip: 'text', lineHeight: 1, marginBottom: '3px'
              }}>{s.num}</div>
              <div style={{ fontSize: '11px', color: 'var(--t3)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Panel derecho — Formulario ───────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 48px', overflowY: 'auto'
      }} className="login-right">
        <div style={{ width: '100%', maxWidth: '420px' }}>

          {/* Título del formulario */}
          <div style={{ marginBottom: '28px' }}>
            <h2 style={{
              fontFamily: "'Cabinet Grotesk', sans-serif",
              fontSize: '26px', fontWeight: 900, letterSpacing: '-0.8px',
              marginBottom: '6px', color: 'var(--t1)'
            }}>
              {mode === 'login' ? 'Bienvenido de vuelta' : 'Crea tu cuenta gratis'}
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--t2)' }}>
              {mode === 'login'
                ? 'Ingresa a tu cuenta para continuar.'
                : '40 minutos de crédito gratuito. Sin tarjeta.'}
            </p>
          </div>

          {/* Tabs */}
          <div style={{
            display: 'flex', gap: '3px',
            background: 'rgba(255,255,255,0.04)', padding: '3px',
            borderRadius: '11px', marginBottom: '24px',
            border: '1px solid rgba(240,246,252,0.08)'
          }}>
            {(['login', 'register'] as const).map(m => (
              <button key={m}
                onClick={() => { setMode(m); setError(''); setAceptaTerminos(false) }}
                style={{
                  flex: 1, padding: '10px', borderRadius: '9px', border: 'none',
                  cursor: 'pointer', fontSize: '14px', fontWeight: 600,
                  transition: 'all .2s',
                  background: mode === m ? 'linear-gradient(135deg,#00A8E8,#00D4FF)' : 'transparent',
                  color: mode === m ? '#000' : 'var(--t2)',
                  boxShadow: mode === m ? '0 4px 12px rgba(0,168,232,0.3)' : 'none'
                }}>
                {m === 'login' ? 'Iniciar sesión' : 'Registrarse'}
              </button>
            ))}
          </div>

          {/* Campos */}
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '14px', marginBottom: '20px' }}>
            {mode === 'register' && (
              <div>
                <label style={labelStyle}>Nombre completo *</label>
                <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                  placeholder="Tu nombre completo" style={inputStyle}/>
              </div>
            )}
            <div>
              <label style={labelStyle}>Correo electrónico *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="tu@correo.com" style={inputStyle}/>
            </div>
            <div>
              <label style={labelStyle}>Contraseña *</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                onKeyDown={e => e.key === 'Enter' && !botonDeshabilitado && handleSubmit()}
                style={inputStyle}/>
            </div>

            {mode === 'register' && (
              <>
                <div style={{
                  height: '1px',
                  background: 'linear-gradient(90deg,transparent,rgba(0,168,232,0.2),transparent)',
                  margin: '4px 0'
                }}/>
                <div style={{
                  fontSize: '11px', fontWeight: 700, color: 'var(--c)',
                  letterSpacing: '2px', textTransform: 'uppercase' as const
                }}>
                  Datos de facturación
                </div>
                <div>
                  <label style={labelStyle}>País *</label>
                  <select value={pais} onChange={e => setPais(e.target.value)} style={{
                    ...inputStyle,
                    color: pais ? 'var(--t1)' : 'var(--t3)', cursor: 'pointer'
                  }}>
                    <option value="">Selecciona tu país</option>
                    {PAISES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '10px' }}>
                  <div>
                    <label style={labelStyle}>Tipo doc. *</label>
                    <select value={tipoDocumento} onChange={e => setTipoDocumento(e.target.value)} style={{
                      ...inputStyle,
                      color: tipoDocumento ? 'var(--t1)' : 'var(--t3)',
                      fontSize: '13px', padding: '13px 12px', cursor: 'pointer'
                    }}>
                      <option value="">Tipo</option>
                      {TIPOS_DOCUMENTO.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>N° documento *</label>
                    <input type="text" value={numeroDocumento}
                      onChange={e => setNumeroDocumento(e.target.value)}
                      placeholder="Número" style={{ ...inputStyle, fontSize: '13px', padding: '13px 12px' }}/>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>
                    Empresa / Nombre factura{' '}
                    <span style={{ color: 'var(--t3)', fontWeight: 400, textTransform: 'none' as const, letterSpacing: 0 }}>
                      (opcional)
                    </span>
                  </label>
                  <input type="text" value={razonSocial} onChange={e => setRazonSocial(e.target.value)}
                    placeholder="Dejar vacío para usar tu nombre"
                    style={inputStyle}/>
                </div>
              </>
            )}
          </div>

          {/* Términos */}
          {mode === 'register' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                <div onClick={() => setAceptaTerminos(v => !v)} style={{
                  width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0, marginTop: '1px',
                  background: aceptaTerminos ? 'linear-gradient(135deg,#00A8E8,#00D4FF)' : 'rgba(255,255,255,0.04)',
                  border: `1.5px solid ${aceptaTerminos ? 'transparent' : 'rgba(255,255,255,.2)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all .2s', cursor: 'pointer',
                  boxShadow: aceptaTerminos ? '0 2px 8px rgba(0,168,232,0.3)' : 'none'
                }}>
                  {aceptaTerminos && (
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <polyline points="2,6 5,9 10,3" stroke="#000" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span style={{ fontSize: '13px', color: 'var(--t2)', lineHeight: 1.5 }}>
                  Acepto los{' '}
                  <a href="https://thegisto.com/legal/terminos/" target="_blank" rel="noopener noreferrer"
                    style={{ color: 'var(--c)', textDecoration: 'none', fontWeight: 600 }}>
                    Términos de servicio
                  </a>{' '}y la{' '}
                  <a href="https://thegisto.com/legal/privacidad/" target="_blank" rel="noopener noreferrer"
                    style={{ color: 'var(--c)', textDecoration: 'none', fontWeight: 600 }}>
                    Política de privacidad
                  </a>
                </span>
              </label>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              padding: '12px 16px', borderRadius: '10px', fontSize: '13px',
              marginBottom: '16px', background: 'rgba(255,70,100,.08)',
              border: '1px solid rgba(255,70,100,.2)', color: 'var(--err)',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="var(--err)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          {/* Botón principal */}
          <button onClick={handleSubmit} disabled={botonDeshabilitado} style={{
            width: '100%', padding: '15px',
            background: botonDeshabilitado
              ? 'rgba(0,168,232,.25)'
              : 'linear-gradient(135deg,#00A8E8,#00D4FF)',
            color: botonDeshabilitado ? 'rgba(0,0,0,.4)' : '#000',
            border: 'none', borderRadius: '11px',
            fontFamily: "'Cabinet Grotesk', sans-serif",
            fontSize: '16px', fontWeight: 900,
            cursor: botonDeshabilitado ? 'not-allowed' : 'pointer',
            transition: 'all .25s cubic-bezier(.23,1,.32,1)',
            boxShadow: botonDeshabilitado ? 'none' : '0 8px 24px rgba(0,168,232,.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            position: 'relative' as const, overflow: 'hidden'
          }}>
            {!botonDeshabilitado && (
              <div style={{
                position: 'absolute' as const, inset: 0,
                background: 'linear-gradient(135deg,rgba(255,255,255,0.12),transparent)',
                pointerEvents: 'none'
              }}/>
            )}
            {loading ? (
              <>
                <div style={{
                  width: '18px', height: '18px',
                  border: '2px solid rgba(0,0,0,.2)',
                  borderTop: '2px solid #000',
                  borderRadius: '50%', animation: 'spin 1s linear infinite'
                }}/>
                {mode === 'login' ? 'Ingresando...' : 'Creando cuenta...'}
              </>
            ) : (
              mode === 'login' ? 'Ingresar →' : 'Crear cuenta gratis →'
            )}
          </button>

          {/* Proof line */}
          <div style={{
            display: 'flex', justifyContent: 'center', gap: '20px',
            marginTop: '14px', flexWrap: 'wrap' as const
          }}>
            {(mode === 'register'
              ? ['40 min gratis', 'Sin tarjeta', 'Créditos sin vencimiento']
              : ['Acceso inmediato', 'Tus créditos te esperan', 'Soporte incluido']
            ).map(t => (
              <span key={t} style={{
                fontSize: '11px', color: 'var(--t3)',
                display: 'flex', alignItems: 'center', gap: '4px'
              }}>
                <span style={{ color: 'var(--ok)', fontWeight: 700, fontSize: '10px' }}>✓</span>
                {t}
              </span>
            ))}
          </div>

          {/* Volver */}
          <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--t3)', marginTop: '28px' }}>
            <a href="https://thegisto.com" style={{ color: 'var(--t2)', textDecoration: 'none' }}>
              ← Volver a thegisto.com
            </a>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        input:focus, select:focus {
          border-color: rgba(0,168,232,0.5) !important;
          box-shadow: 0 0 0 3px rgba(0,168,232,.12) !important;
          background: rgba(0,168,232,0.04) !important;
        }
        button:not(:disabled):hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(0,168,232,.5) !important;
        }
        @media (max-width: 768px) {
          .login-left { display: none !important; }
          .login-right { padding: 32px 24px !important; }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .login-left { flex: 0 0 42% !important; padding: 40px 36px !important; }
        }
      `}</style>
    </div>
  )
}
