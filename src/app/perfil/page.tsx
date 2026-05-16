'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const PAISES = [
  'Argentina','Bolivia','Chile','Colombia','Costa Rica','Ecuador',
  'El Salvador','España','Estados Unidos','Guatemala','Honduras',
  'México','Nicaragua','Panamá','Paraguay','Perú','República Dominicana',
  'Uruguay','Venezuela','Otro'
]
const TIPOS_DOCUMENTO = ['DNI','RUC','Pasaporte','Tax ID','Cédula','Otro']
const MAX_CREDITOS: any = {
  'Free':40,'Starter':120,'Professional':480,'Profesional':480,'Academia':1200
}
const PLAN_COLORS: any = {
  'Free':'var(--t2)','Starter':'var(--c)',
  'Professional':'var(--ok)','Profesional':'var(--ok)','Academia':'#FFB020'
}
const PLAN_BG: any = {
  'Free':'rgba(240,246,252,.05)','Starter':'rgba(0,168,232,.1)',
  'Professional':'rgba(0,229,160,.1)','Profesional':'rgba(0,229,160,.1)','Academia':'rgba(255,176,32,.1)'
}

export default function Perfil() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [user, setUser] = useState<any>(null)
  const [nombre, setNombre] = useState('')
  const [pais, setPais] = useState('')
  const [tipoDocumento, setTipoDocumento] = useState('')
  const [numeroDocumento, setNumeroDocumento] = useState('')
  const [razonSocial, setRazonSocial] = useState('')
  const [creditos, setCreditos] = useState(0)
  const [creditosMax, setCreditosMax] = useState(40)
  const [pwActual, setPwActual] = useState('')
  const [pwNueva, setPwNueva] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingCreditos, setLoadingCreditos] = useState(true)
  const [loadingAvatar, setLoadingAvatar] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState<'ok'|'err'>('ok')
  const [seccionActiva, setSeccionActiva] = useState<'perfil'|'seguridad'>('perfil')
  const [isMobile, setIsMobile] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const u = localStorage.getItem('gisto_user')
    if (!u) { router.push('/login'); return }
    const parsed = JSON.parse(u)
    setUser(parsed)
    if (parsed.avatarUrl) setAvatarUrl(parsed.avatarUrl)

    fetch('/api/airtable/usuario')
      .then(r => r.json())
      .then(data => {
        if (data.error) { router.push('/login'); return }
        setNombre(data.nombre || '')
        setPais(data.pais || '')
        setTipoDocumento(data.tipo_documento || '')
        setNumeroDocumento(data.numero_documento || '')
        setRazonSocial(data.razon_social || '')
        setCreditos(data.creditos || 0)
        setCreditosMax(MAX_CREDITOS[data.plan] || 40)
        if (data.avatar_url) setAvatarUrl(data.avatar_url)
        const updated = { ...parsed, creditos: data.creditos, plan: data.plan, nombre: data.nombre, avatarUrl: data.avatar_url || '' }
        localStorage.setItem('gisto_user', JSON.stringify(updated))
        setUser(updated)
        setLoadingCreditos(false)
      })
      .catch(() => {
        setNombre(parsed.nombre || '')
        setCreditos(parsed.creditos || 0)
        setCreditosMax(MAX_CREDITOS[parsed.plan] || 40)
        setLoadingCreditos(false)
      })
  }, [])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    localStorage.removeItem('gisto_user')
    router.push('/login')
  }

  async function subirAvatar(file: File) {
    if (!file.type.startsWith('image/')) return
    setLoadingAvatar(true)
    try {
      const formData = new FormData()
      formData.append('avatar', file)
      const res = await fetch('/api/airtable/usuario/avatar', {
        method: 'POST', body: formData
      })
      const data = await res.json()
      if (data.avatar_url) {
        setAvatarUrl(data.avatar_url)
        const stored = localStorage.getItem('gisto_user')
        if (stored) {
          const parsed = JSON.parse(stored)
          localStorage.setItem('gisto_user', JSON.stringify({ ...parsed, avatarUrl: data.avatar_url }))
        }
        showMsg('Foto actualizada correctamente', 'ok')
      }
    } catch { showMsg('Error al subir la foto', 'err') }
    setLoadingAvatar(false)
  }

  function showMsg(text: string, type: 'ok'|'err') {
    setMsg(text); setMsgType(type)
    setTimeout(() => setMsg(''), 4000)
  }

  async function guardarPerfil() {
    if (!nombre.trim()) { showMsg('El nombre no puede estar vacío', 'err'); return }
    if (!pais) { showMsg('El país es obligatorio', 'err'); return }
    if (!tipoDocumento) { showMsg('El tipo de documento es obligatorio', 'err'); return }
    if (!numeroDocumento.trim()) { showMsg('El número de documento es obligatorio', 'err'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/airtable/usuario', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, pais, tipo_documento: tipoDocumento, numero_documento: numeroDocumento, razon_social: razonSocial })
      })
      if (res.ok) {
        const stored = localStorage.getItem('gisto_user')
        if (stored) {
          const parsed = JSON.parse(stored)
          localStorage.setItem('gisto_user', JSON.stringify({ ...parsed, nombre }))
          setUser({ ...parsed, nombre })
        }
        showMsg('Perfil actualizado correctamente', 'ok')
      } else {
        showMsg('Error al guardar el perfil', 'err')
      }
    } catch { showMsg('Error de conexión', 'err') }
    setLoading(false)
  }

  async function cambiarPassword() {
    if (!pwActual || !pwNueva) { showMsg('Ambos campos son obligatorios', 'err'); return }
    if (pwNueva.length < 6) { showMsg('La nueva contraseña debe tener al menos 6 caracteres', 'err'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password_actual: pwActual, password_nueva: pwNueva })
      })
      const data = await res.json()
      if (res.ok) {
        setPwActual(''); setPwNueva('')
        showMsg('Contraseña actualizada correctamente', 'ok')
      } else {
        showMsg(data.error || 'Error al actualizar la contraseña', 'err')
      }
    } catch { showMsg('Error de conexión', 'err') }
    setLoading(false)
  }

  if (!user) return null

  const inicial = nombre?.[0]?.toUpperCase() || user?.nombre?.[0]?.toUpperCase() || 'U'
  const planActual = user?.plan || 'Free'
  const porcentaje = Math.min(100, (creditos / creditosMax) * 100)

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--s2)',
    border: '1px solid var(--b)', borderRadius: '10px',
    padding: '12px 14px', color: 'var(--t1)',
    fontSize: '13px', outline: 'none', fontFamily: 'inherit',
    transition: 'all .2s'
  }
  const labelStyle: React.CSSProperties = {
    fontSize: '11px', fontWeight: 700, color: 'var(--t3)',
    letterSpacing: '1.5px', textTransform: 'uppercase',
    display: 'block', marginBottom: '8px'
  }

  const NavItem = ({ href, label, icon, active }: { href: string, label: string, icon: string, active: boolean }) => (
    <Link href={href} onClick={() => isMobile && setSidebarOpen(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 12px', color: active ? 'var(--t1)' : 'var(--t2)',
        textDecoration: 'none', borderRadius: '9px', marginBottom: '2px',
        fontSize: '14px', fontWeight: 500,
        background: active ? 'rgba(0,168,232,0.08)' : 'transparent',
        border: active ? '1px solid var(--b)' : '1px solid transparent'
      }}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
        stroke={active ? 'var(--c)' : 'var(--t3)'}
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d={icon}/>
      </svg>
      {label}
    </Link>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', position: 'relative' as const, zIndex: 1 }}>
      {/* Overlay móvil */}
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{
          position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 99
        }}/>
      )}

      {/* SIDEBAR */}
      <aside style={{
        width: '260px', background: 'var(--s1)',
        borderRight: '1px solid var(--b)', padding: '20px 16px',
        display: 'flex', flexDirection: 'column' as const, flexShrink: 0,
        ...(isMobile ? {
          position: 'fixed' as const, top: 0, left: 0, bottom: 0, zIndex: 100,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform .3s ease',
          boxShadow: sidebarOpen ? '4px 0 32px rgba(0,0,0,.6)' : 'none'
        } : { position: 'relative' as const })
      }}>
        <Link href="/" style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          textDecoration: 'none', marginBottom: '36px'
        }}>
          <img src="/isotipo.png" alt="GISTO" style={{
            height: '52px', width: 'auto', objectFit: 'contain'
          }}/>
          <span style={{
            fontFamily: "'Cabinet Grotesk',sans-serif",
            fontWeight: 900, fontSize: '18px', color: 'var(--t1)'
          }}>
            THE <span style={{ color: 'var(--c)' }}>GISTO</span>
          </span>
        </Link>

        <NavItem href="/dashboard" label="Dashboard" icon="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" active={false}/>
        <NavItem href="/upload" label="Subir video" icon="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" active={false}/>
        <NavItem href="/planes" label="Planes y pagos" icon="M1 4h22v16H1zM1 10h22" active={false}/>
        <NavItem href="/perfil" label="Mi perfil" icon="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" active={true}/>

        {/* Créditos en sidebar */}
        <div style={{
          marginTop: 'auto', background: 'rgba(0,168,232,.06)',
          border: '1px solid var(--b)', borderRadius: '12px', padding: '14px'
        }}>
          <div style={{ fontSize: '11px', color: 'var(--t2)', marginBottom: '6px' }}>Créditos disponibles</div>
          <div style={{ height: '5px', background: 'rgba(0,168,232,.12)', borderRadius: '3px', overflow: 'hidden', marginBottom: '6px' }}>
            <div style={{
              height: '100%', width: `${porcentaje}%`,
              background: 'linear-gradient(90deg,var(--c),var(--c2))',
              borderRadius: '3px', transition: 'width .5s'
            }}/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--t2)' }}>
            <strong style={{ color: 'var(--c)' }}>{creditos} min</strong>
            <span>/ {creditosMax} min</span>
          </div>
        </div>

        {/* Usuario */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '14px 12px 0', borderTop: '1px solid var(--b)', marginTop: '12px'
        }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
            overflow: 'hidden', border: '2px solid var(--b)'
          }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
            ) : (
              <div style={{
                width: '100%', height: '100%',
                background: 'linear-gradient(135deg,var(--c),var(--c2))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Cabinet Grotesk',sans-serif", fontWeight: 800, fontSize: '13px', color: '#000'
              }}>{inicial}</div>
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{nombre || user?.nombre}</div>
            <div style={{ fontSize: '11px', color: 'var(--t2)' }}>{planActual}</div>
          </div>
        </div>

        {/* Sign Out */}
        <button onClick={logout} style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 12px', color: 'var(--err)', background: 'none',
          border: 'none', borderRadius: '9px', marginTop: '8px',
          fontSize: '14px', fontWeight: 500, cursor: 'pointer', width: '100%'
        }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          Cerrar sesión
        </button>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, overflow: 'auto', position: 'relative' as const }}>
        {/* Topbar móvil */}
        {isMobile && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px', borderBottom: '1px solid var(--b)',
            background: 'rgba(6,8,16,.7)', backdropFilter: 'blur(12px)',
            position: 'sticky' as const, top: 0, zIndex: 50
          }}>
            <button onClick={() => setSidebarOpen(v => !v)} style={{
              background: 'rgba(255,255,255,.06)', border: '1px solid var(--b)',
              borderRadius: '8px', color: 'var(--t1)', padding: '8px', cursor: 'pointer',
              display: 'flex', alignItems: 'center'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <span style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontWeight: 800, fontSize: '16px' }}>Mi perfil</span>
            <div style={{ width: '36px' }}/>
          </div>
        )}

        <div style={{ padding: isMobile ? '20px' : '36px 48px', maxWidth: '700px', margin: '0 auto' }}>
          {/* Header con avatar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '24px',
            marginBottom: '36px', flexWrap: 'wrap' as const
          }}>
            {/* Avatar clickeable */}
            <div style={{ position: 'relative' as const }}>
              <div
                onClick={() => !loadingAvatar && fileRef.current?.click()}
                style={{
                  width: '80px', height: '80px', borderRadius: '50%',
                  overflow: 'hidden', cursor: 'pointer',
                  border: '3px solid var(--b)',
                  transition: 'border-color .2s',
                  position: 'relative' as const
                }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt={nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                ) : (
                  <div style={{
                    width: '100%', height: '100%',
                    background: 'linear-gradient(135deg,#00A8E8,#00D4FF)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: "'Cabinet Grotesk',sans-serif",
                    fontWeight: 900, fontSize: '28px', color: '#000'
                  }}>{inicial}</div>
                )}
                {/* Overlay hover */}
                <div style={{
                  position: 'absolute' as const, inset: 0,
                  background: 'rgba(0,0,0,.55)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: loadingAvatar ? 1 : 0,
                  transition: 'opacity .2s'
                }} className="avatar-overlay">
                  {loadingAvatar ? (
                    <div style={{
                      width: '20px', height: '20px',
                      border: '2px solid rgba(255,255,255,.3)',
                      borderTop: '2px solid #fff',
                      borderRadius: '50%', animation: 'spin 1s linear infinite'
                    }}/>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                      stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                  )}
                </div>
              </div>
              {/* Badge cámara */}
              <div
                onClick={() => !loadingAvatar && fileRef.current?.click()}
                style={{
                  position: 'absolute' as const, bottom: '2px', right: '2px',
                  width: '24px', height: '24px', borderRadius: '50%',
                  background: 'linear-gradient(135deg,var(--c),var(--c2))',
                  border: '2px solid var(--bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer'
                }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                  stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) subirAvatar(f) }}/>
            </div>

            <div>
              <h1 style={{
                fontFamily: "'Cabinet Grotesk',sans-serif",
                fontSize: isMobile ? '22px' : '28px', fontWeight: 900,
                letterSpacing: '-1px', marginBottom: '4px'
              }}>{nombre || user?.nombre || 'Mi cuenta'}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' as const }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  fontSize: '12px', fontWeight: 700,
                  padding: '4px 12px', borderRadius: '100px',
                  background: PLAN_BG[planActual] || 'rgba(0,168,232,.1)',
                  color: PLAN_COLORS[planActual] || 'var(--c)',
                  border: `1px solid ${PLAN_COLORS[planActual] || 'var(--c)'}30`
                }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: PLAN_COLORS[planActual] || 'var(--c)', display: 'inline-block' }}/>
                  Plan {planActual}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--t3)' }}>{user?.email}</span>
              </div>
            </div>
          </div>

          {/* Créditos card */}
          <div style={{
            background: 'linear-gradient(135deg,rgba(0,168,232,.08),rgba(0,168,232,.03))',
            border: '1px solid rgba(0,168,232,.2)', borderRadius: '14px',
            padding: '20px 24px', marginBottom: '24px',
            display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' as const
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t3)', letterSpacing: '1.5px', textTransform: 'uppercase' as const, marginBottom: '8px' }}>
                Créditos disponibles
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '10px' }}>
                <span style={{
                  fontFamily: "'Cabinet Grotesk',sans-serif", fontSize: '36px', fontWeight: 900,
                  background: 'linear-gradient(135deg,var(--c),var(--c2))',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                  lineHeight: 1
                }}>{loadingCreditos ? '...' : creditos}</span>
                <span style={{ fontSize: '14px', color: 'var(--t2)' }}>/ {creditosMax} min</span>
              </div>
              <div style={{ height: '6px', background: 'rgba(0,168,232,.12)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${porcentaje}%`,
                  background: 'linear-gradient(90deg,var(--c),var(--c2))',
                  borderRadius: '3px', transition: 'width .5s',
                  boxShadow: '0 0 8px rgba(0,168,232,.4)'
                }}/>
              </div>
            </div>
            <Link href="/planes" style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0,
              background: 'linear-gradient(135deg,#00A8E8,#00D4FF)',
              color: '#000', padding: '11px 20px', borderRadius: '9px',
              fontWeight: 700, fontSize: '13px', textDecoration: 'none',
              boxShadow: '0 4px 16px rgba(0,168,232,.3)'
            }}>
              Comprar créditos →
            </Link>
          </div>

          {/* Tabs de sección */}
          <div style={{
            display: 'flex', gap: '3px',
            background: 'var(--s1)', padding: '3px',
            border: '1px solid var(--b)', borderRadius: '11px',
            marginBottom: '20px'
          }}>
            {[
              { id: 'perfil', label: 'Datos personales' },
              { id: 'seguridad', label: 'Seguridad' }
            ].map(tab => (
              <button key={tab.id}
                onClick={() => { setSeccionActiva(tab.id as any); setMsg('') }}
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: '9px',
                  border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                  transition: 'all .2s',
                  background: seccionActiva === tab.id ? 'linear-gradient(135deg,#00A8E8,#00D4FF)' : 'transparent',
                  color: seccionActiva === tab.id ? '#000' : 'var(--t2)',
                  boxShadow: seccionActiva === tab.id ? '0 4px 12px rgba(0,168,232,.3)' : 'none'
                }}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sección: Datos personales */}
          {seccionActiva === 'perfil' && (
            <div style={{
              background: 'var(--s1)', border: '1px solid var(--b)',
              borderRadius: '16px', padding: '24px'
            }}>
              <div style={{
                height: '2px',
                background: 'linear-gradient(90deg,transparent,var(--c),var(--c2),transparent)',
                margin: '-24px -24px 24px'
              }}/>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={labelStyle}>Nombre completo *</label>
                  <input value={nombre} onChange={e => setNombre(e.target.value)} style={inputStyle}/>
                </div>
                <div>
                  <label style={labelStyle}>Correo electrónico</label>
                  <input value={user?.email || ''} disabled style={{
                    ...inputStyle, background: 'rgba(255,255,255,.03)',
                    color: 'var(--t2)', cursor: 'not-allowed'
                  }}/>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>País *</label>
                <select value={pais} onChange={e => setPais(e.target.value)} style={{ ...inputStyle, cursor: 'pointer', color: pais ? 'var(--t1)' : 'var(--t3)' }}>
                  <option value="">Selecciona tu país</option>
                  {PAISES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1.5fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={labelStyle}>Tipo de documento *</label>
                  <select value={tipoDocumento} onChange={e => setTipoDocumento(e.target.value)} style={{ ...inputStyle, cursor: 'pointer', color: tipoDocumento ? 'var(--t1)' : 'var(--t3)' }}>
                    <option value="">Tipo</option>
                    {TIPOS_DOCUMENTO.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Número de documento *</label>
                  <input value={numeroDocumento} onChange={e => setNumeroDocumento(e.target.value)} style={inputStyle}/>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>
                  Empresa / Nombre de factura{' '}
                  <span style={{ color: 'var(--t3)', fontWeight: 400, textTransform: 'none' as const, letterSpacing: 0 }}>
                    (opcional)
                  </span>
                </label>
                <input value={razonSocial} onChange={e => setRazonSocial(e.target.value)}
                  placeholder="Dejar vacío para usar tu nombre completo" style={inputStyle}/>
              </div>

              {/* Mensaje feedback */}
              {msg && (
                <div style={{
                  padding: '12px 16px', borderRadius: '10px', fontSize: '13px',
                  marginBottom: '16px',
                  background: msgType === 'ok' ? 'rgba(0,229,160,.08)' : 'rgba(255,70,100,.08)',
                  border: `1px solid ${msgType === 'ok' ? 'rgba(0,229,160,.25)' : 'rgba(255,70,100,.25)'}`,
                  color: msgType === 'ok' ? 'var(--ok)' : 'var(--err)',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                  {msgType === 'ok' ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                  )}
                  {msg}
                </div>
              )}

              <button onClick={guardarPerfil} disabled={loading} style={{
                background: loading ? 'rgba(0,168,232,.3)' : 'linear-gradient(135deg,#00A8E8,#00D4FF)',
                color: loading ? 'rgba(0,0,0,.4)' : '#000',
                border: 'none', borderRadius: '10px',
                padding: '13px 28px', fontWeight: 700, fontSize: '14px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', transition: 'all .25s',
                boxShadow: loading ? 'none' : '0 4px 16px rgba(0,168,232,.3)',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                {loading ? (
                  <>
                    <div style={{ width: '16px', height: '16px', border: '2px solid rgba(0,0,0,.2)', borderTop: '2px solid #000', borderRadius: '50%', animation: 'spin 1s linear infinite' }}/>
                    Guardando...
                  </>
                ) : 'Guardar cambios'}
              </button>
            </div>
          )}

          {/* Sección: Seguridad */}
          {seccionActiva === 'seguridad' && (
            <div style={{
              background: 'var(--s1)', border: '1px solid var(--b)',
              borderRadius: '16px', padding: '24px'
            }}>
              <div style={{
                height: '2px',
                background: 'linear-gradient(90deg,transparent,var(--c),var(--c2),transparent)',
                margin: '-24px -24px 24px'
              }}/>

              <div style={{ marginBottom: '6px' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '14px 16px', borderRadius: '10px',
                  background: 'rgba(0,229,160,.05)', border: '1px solid rgba(0,229,160,.15)',
                  marginBottom: '20px'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <span style={{ fontSize: '13px', color: 'var(--t2)' }}>
                    Tu contraseña está protegida con cifrado bcrypt.
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
                <div>
                  <label style={labelStyle}>Contraseña actual</label>
                  <input type="password" value={pwActual} onChange={e => setPwActual(e.target.value)}
                    placeholder="••••••••" style={inputStyle}/>
                </div>
                <div>
                  <label style={labelStyle}>Nueva contraseña</label>
                  <input type="password" value={pwNueva} onChange={e => setPwNueva(e.target.value)}
                    placeholder="Mínimo 6 caracteres" style={inputStyle}/>
                </div>
              </div>

              {msg && (
                <div style={{
                  padding: '12px 16px', borderRadius: '10px', fontSize: '13px',
                  marginBottom: '16px',
                  background: msgType === 'ok' ? 'rgba(0,229,160,.08)' : 'rgba(255,70,100,.08)',
                  border: `1px solid ${msgType === 'ok' ? 'rgba(0,229,160,.25)' : 'rgba(255,70,100,.25)'}`,
                  color: msgType === 'ok' ? 'var(--ok)' : 'var(--err)',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                  {msgType === 'ok' ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  )}
                  {msg}
                </div>
              )}

              <button onClick={cambiarPassword} disabled={loading} style={{
                background: loading ? 'rgba(0,168,232,.3)' : 'linear-gradient(135deg,#00A8E8,#00D4FF)',
                color: loading ? 'rgba(0,0,0,.4)' : '#000',
                border: 'none', borderRadius: '10px',
                padding: '13px 28px', fontWeight: 700, fontSize: '14px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', transition: 'all .25s',
                boxShadow: loading ? 'none' : '0 4px 16px rgba(0,168,232,.3)',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                {loading ? (
                  <>
                    <div style={{ width: '16px', height: '16px', border: '2px solid rgba(0,0,0,.2)', borderTop: '2px solid #000', borderRadius: '50%', animation: 'spin 1s linear infinite' }}/>
                    Actualizando...
                  </>
                ) : 'Actualizar contraseña'}
              </button>
            </div>
          )}
        </div>
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        input:focus, select:focus {
          border-color: rgba(0,168,232,.5) !important;
          box-shadow: 0 0 0 3px rgba(0,168,232,.12) !important;
        }
        .avatar-overlay { opacity: 0 !important; }
        div:hover > .avatar-overlay { opacity: 1 !important; }
        @media (max-width: 768px) {
          .avatar-overlay { opacity: 0 !important; }
        }
      `}</style>
    </div>
  )
}
