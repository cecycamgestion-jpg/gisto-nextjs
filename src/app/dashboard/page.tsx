'use client'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const MAX_CREDITOS: any = {
  'Free':40,'Starter':120,'Professional':480,'Profesional':480,'Academia':1200,'academia':1200
}
const PLAN_COLORS: any = {
  'Free':'var(--t2)','Starter':'var(--c)',
  'Professional':'var(--ok)','Profesional':'var(--ok)','Academia':'#FFB020'
}
const PLAN_BG: any = {
  'Free':'rgba(240,246,252,.05)','Starter':'rgba(0,168,232,.08)',
  'Professional':'rgba(0,229,160,.08)','Profesional':'rgba(0,229,160,.08)','Academia':'rgba(255,176,32,.08)'
}

const PROGRESS_MSGS = [
  'Transcribiendo el audio...','Analizando estructura pedagógica...',
  'Limpiando interacciones del aula...','Aplicando corte anatómico...',
  'Generando documentos Word...','Empaquetando tu curso...',
  'Casi listo...','Un momento más...'
]

// ── Contador animado ──────────────────────────────────────────────────────
function AnimatedNumber({ value, suffix = '' }: { value: number, suffix?: string }) {
  const [display, setDisplay] = useState(0)
  const prevRef = useRef(0)

  useEffect(() => {
    const from = prevRef.current
    const to = value
    if (from === to) return
    const duration = 1200
    const start = performance.now()
    const ease = (t: number) => 1 - Math.pow(1 - t, 3)
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      setDisplay(Math.round(from + (to - from) * ease(progress)))
      if (progress < 1) requestAnimationFrame(animate)
      else prevRef.current = to
    }
    requestAnimationFrame(animate)
  }, [value])

  return <>{display}{suffix}</>
}

// ── Barra de progreso indeterminada ───────────────────────────────────────
function AnimatedProgress({ createdAt }: { createdAt: string }) {
  const [msgIdx, setMsgIdx] = React.useState(0)
  React.useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - new Date(createdAt).getTime()
      setMsgIdx(Math.floor(elapsed / 20000) % PROGRESS_MSGS.length)
    }, 1000)
    return () => clearInterval(interval)
  }, [createdAt])

  return (
    <div style={{ padding: '0 16px 16px' }}>
      <div style={{
        background: 'rgba(255,176,32,.04)', border: '1px solid rgba(255,176,32,.12)',
        borderRadius: '10px', padding: '14px 16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <span style={{
            width: '7px', height: '7px', borderRadius: '50%',
            background: 'var(--warn)', boxShadow: '0 0 8px var(--warn)',
            flexShrink: 0, animation: 'pulse 1s infinite', display: 'inline-block'
          }}/>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--warn)' }}>
            {PROGRESS_MSGS[msgIdx]}
          </span>
        </div>
        <div style={{
          height: '3px', background: 'rgba(255,255,255,.06)',
          borderRadius: '2px', overflow: 'hidden', position: 'relative' as const
        }}>
          <div style={{
            position: 'absolute' as const, height: '100%', width: '40%',
            background: 'linear-gradient(90deg,transparent,var(--warn),transparent)',
            borderRadius: '2px', animation: 'indeterminate 1.8s ease-in-out infinite'
          }}/>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const router = useRouter()
  const [videos, setVideos] = useState<any[]>([])
  const [filtro, setFiltro] = useState('todos')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [creditos, setCreditos] = useState(0)
  const [creditosMax, setCreditosMax] = useState(40)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [descargando, setDescargando] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [statsVisible, setStatsVisible] = useState(false)
  const statsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Trigger animación de stats al entrar en viewport
  useEffect(() => {
    if (!statsRef.current) return
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) { setStatsVisible(true); obs.disconnect() }
    }, { threshold: 0.1 })
    obs.observe(statsRef.current)
    return () => obs.disconnect()
  }, [loading])

  const fetchVideos = useCallback(async () => {
    try {
      const r = await fetch('/api/airtable/videos')
      const data = await r.json()
      if (data.records) setVideos(data.records)
      setLoading(false)
    } catch { setLoading(false) }
  }, [])

  useEffect(() => {
    const u = localStorage.getItem('gisto_user')
    if (!u) { router.push('/login'); return }
    const parsed = JSON.parse(u)
    setUser(parsed)
    setCreditos(parsed.creditos || 0)
    setCreditosMax(MAX_CREDITOS[parsed.plan] || 40)
    if (parsed.avatarUrl) setAvatarUrl(parsed.avatarUrl)

    fetch('/api/airtable/usuario')
      .then(r => r.json())
      .then(data => {
        if (data.error) return
        const cred = data.creditos || 0
        const plan = data.plan || 'Free'
        setCreditos(cred)
        setCreditosMax(MAX_CREDITOS[plan] || 40)
        if (data.avatar_url) setAvatarUrl(data.avatar_url)
        const updated = { ...parsed, creditos: cred, plan, nombre: data.nombre, avatarUrl: data.avatar_url || '' }
        localStorage.setItem('gisto_user', JSON.stringify(updated))
        setUser(updated)
      })
      .catch(() => {})

    fetchVideos()
    const interval = setInterval(fetchVideos, 8000)
    return () => clearInterval(interval)
  }, [fetchVideos, router])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    localStorage.removeItem('gisto_user')
    router.push('/login')
  }

  async function descargarZip(record: any) {
    const f = record.fields || {}
    const zipKey = f.Zip_Key || f.zip_key
    if (!zipKey && f.Resultado) { window.open(f.Resultado, '_blank'); return }
    if (!zipKey) return
    setDescargando(record.id)
    try {
      const r = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zip_key: zipKey })
      })
      const data = await r.json()
      if (data.download_url) window.open(data.download_url, '_blank')
    } catch {}
    finally { setDescargando(null) }
  }

  function formatDuracion(f: any) {
    const dur = f['Duracion_entregada'] || f['Duración'] || 0
    if (!dur) return null
    return `${Math.floor(dur / 60)}m ${Math.round(dur % 60)}s`
  }

  function formatFecha(record: any) {
    const d = new Date(record.fields?.['Created time'] || record.createdTime)
    if (isNaN(d.getTime())) return ''
    const diff = Date.now() - d.getTime()
    const mins = Math.floor(diff / 60000)
    const hrs = Math.floor(mins / 60)
    const days = Math.floor(hrs / 24)
    if (mins < 1) return 'Ahora mismo'
    if (mins < 60) return `Hace ${mins} min`
    if (hrs < 24) return `Hace ${hrs}h`
    return `Hace ${days}d`
  }

  const hayProcesando = videos.some(v => {
    const e = v.fields?.Estado?.toLowerCase()
    return e === 'procesando' || e === 'pendiente'
  })
  const enProceso = videos.filter(v => {
    const e = v.fields?.Estado?.toLowerCase()
    return e === 'procesando' || e === 'pendiente'
  }).length
  const completados = videos.filter(v => v.fields?.Estado?.toLowerCase() === 'completado').length
  const modulos = videos.reduce((a, v) => a + (v.fields?.Modulos_detectados || 0), 0)

  const filtrados = videos.filter(v => {
    const e = v.fields?.Estado?.toLowerCase() || ''
    if (filtro === 'completados') return e === 'completado'
    if (filtro === 'proceso') return e === 'procesando' || e === 'pendiente'
    return true
  })

  const planActual = user?.plan || 'Free'
  const inicial = user?.nombre?.[0]?.toUpperCase() || 'U'
  const porcentaje = Math.min(100, (creditos / creditosMax) * 100)

  const NavItem = ({ href, label, icon, active, badge }: { href: string, label: string, icon: string, active: boolean, badge?: number }) => (
    <Link href={href} onClick={() => isMobile && setSidebarOpen(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 12px', color: active ? 'var(--t1)' : 'var(--t2)',
        textDecoration: 'none', borderRadius: '9px', marginBottom: '2px',
        fontSize: '14px', fontWeight: 500,
        background: active ? 'rgba(0,168,232,0.08)' : 'transparent',
        border: active ? '1px solid var(--b)' : '1px solid transparent',
        transition: 'all .2s'
      }}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
        stroke={active ? 'var(--c)' : 'var(--t3)'}
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d={icon}/>
      </svg>
      {label}
      {badge ? (
        <span style={{
          marginLeft: 'auto', background: 'var(--warn)', color: '#000',
          fontSize: '10px', fontWeight: 800, padding: '1px 7px', borderRadius: '100px'
        }}>{badge}</span>
      ) : null}
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
          <img src="/isotipo.png" alt="GISTO" style={{ height: '52px', width: 'auto', objectFit: 'contain' }}/>
          <span style={{
            fontFamily: "'Cabinet Grotesk',sans-serif",
            fontWeight: 900, fontSize: '18px', color: 'var(--t1)'
          }}>THE <span style={{ color: 'var(--c)' }}>GISTO</span></span>
        </Link>

        <NavItem href="/dashboard" label="Dashboard" icon="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" active={true}/>
        <NavItem href="/upload" label="Subir video" icon="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" active={false} badge={enProceso || undefined}/>
        <NavItem href="/perfil" label="Mi perfil" icon="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" active={false}/>
        <NavItem href="/planes" label="Planes y pagos" icon="M1 4h22v16H1zM1 10h22" active={false}/>

        {/* Créditos */}
        <div style={{
          marginTop: 'auto',
          background: 'rgba(0,168,232,.06)', border: '1px solid var(--b)',
          borderRadius: '12px', padding: '14px'
        }}>
          <div style={{ fontSize: '11px', color: 'var(--t2)', marginBottom: '6px' }}>Créditos disponibles</div>
          <div style={{ height: '5px', background: 'rgba(0,168,232,.12)', borderRadius: '3px', overflow: 'hidden', marginBottom: '6px' }}>
            <div style={{
              height: '100%', width: `${porcentaje}%`,
              background: 'linear-gradient(90deg,var(--c),var(--c2))',
              borderRadius: '3px', transition: 'width .5s',
              boxShadow: '0 0 6px rgba(0,168,232,.4)'
            }}/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--t2)' }}>
            <strong style={{ color: 'var(--c)' }}>{creditos} min</strong>
            <span>/ {creditosMax} min</span>
          </div>
        </div>

        {/* Usuario */}
        <Link href="/perfil" onClick={() => isMobile && setSidebarOpen(false)}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '14px 12px 0', borderTop: '1px solid var(--b)',
            marginTop: '12px', textDecoration: 'none', cursor: 'pointer'
          }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            overflow: 'hidden', flexShrink: 0, border: '2px solid var(--b)'
          }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={user?.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
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
            <div style={{ fontSize: '13px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{user?.nombre || 'Usuario'}</div>
            <div style={{ fontSize: '11px', color: 'var(--t2)' }}>{planActual}</div>
          </div>
        </Link>

        {/* Sign Out */}
        <button onClick={logout} style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 12px', color: 'var(--err)', background: 'none',
          border: 'none', borderRadius: '9px', marginTop: '6px',
          fontSize: '14px', fontWeight: 500, cursor: 'pointer', width: '100%',
          transition: 'background .2s'
        }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          Cerrar sesión
        </button>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' as const, minWidth: 0 }}>
        {/* Topbar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 24px', borderBottom: '1px solid var(--b)',
          background: 'rgba(6,8,16,.8)', backdropFilter: 'blur(16px)',
          position: 'sticky' as const, top: 0, zIndex: 50, flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isMobile && (
              <button onClick={() => setSidebarOpen(v => !v)} style={{
                background: 'rgba(255,255,255,.06)', border: '1px solid var(--b)',
                borderRadius: '8px', color: 'var(--t1)', padding: '8px',
                cursor: 'pointer', display: 'flex', alignItems: 'center'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/>
                  <line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              </button>
            )}
            <div>
              <h1 style={{
                fontFamily: "'Cabinet Grotesk',sans-serif",
                fontSize: '20px', fontWeight: 900, letterSpacing: '-.5px', lineHeight: 1
              }}>Dashboard</h1>
              <p style={{
                fontSize: '12px', color: 'var(--t2)', marginTop: '2px',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}>
                {hayProcesando && (
                  <span style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: 'var(--warn)', boxShadow: '0 0 6px var(--warn)',
                    display: 'inline-block', animation: 'pulse 1.5s infinite'
                  }}/>
                )}
                {hayProcesando ? 'Motor GISTO procesando...' : 'Todo al día'}
              </p>
            </div>
          </div>
          <Link href="/upload" style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'linear-gradient(135deg,#00A8E8,#00D4FF)',
            color: '#000', padding: '9px 18px', borderRadius: '9px',
            fontWeight: 800, fontSize: '13px', textDecoration: 'none',
            boxShadow: '0 4px 14px rgba(0,168,232,.3)',
            transition: 'all .2s', position: 'relative' as const, overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute' as const, inset: 0,
              background: 'linear-gradient(135deg,rgba(255,255,255,.15),transparent)',
              pointerEvents: 'none'
            }}/>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            {isMobile ? 'Nuevo' : 'Nuevo video'}
          </Link>
        </div>

        <div style={{ padding: isMobile ? '16px' : '24px 28px', flex: 1 }}>
          {/* Stats grid con glassmorphism */}
          <div ref={statsRef} style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)',
            gap: '14px', marginBottom: '24px'
          }}>
            {[
              {
                label: 'Créditos', badge: planActual,
                bc: PLAN_COLORS[planActual] || 'var(--c)',
                bbg: PLAN_BG[planActual] || 'rgba(0,168,232,.08)',
                icon: 'M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 4v6l4 2',
                value: statsVisible ? creditos : 0, suffix: ' min'
              },
              {
                label: 'Videos procesados', badge: 'Total',
                bc: 'var(--ok)', bbg: 'rgba(0,229,160,.08)',
                icon: 'M23 7l-7 5 7 5V7zM1 5h15a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H1z',
                value: statsVisible ? videos.length : 0, suffix: ''
              },
              {
                label: 'Módulos generados', badge: 'Total',
                bc: '#A078FF', bbg: 'rgba(160,120,255,.08)',
                icon: 'M22 12h-4l-3 9L9 3l-3 9H2',
                value: statsVisible ? modulos : 0, suffix: ''
              },
              {
                label: enProceso > 0 ? 'En proceso' : 'Sin cola', badge: enProceso > 0 ? 'Activo' : 'Libre',
                bc: enProceso > 0 ? 'var(--warn)' : 'var(--ok)',
                bbg: enProceso > 0 ? 'rgba(255,176,32,.08)' : 'rgba(0,229,160,.08)',
                icon: 'M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 4v6l4 2',
                value: statsVisible ? enProceso : 0, suffix: ''
              }
            ].map((s, i) => (
              <div key={i} style={{
                background: `linear-gradient(135deg,${s.bbg},rgba(12,16,24,.8))`,
                border: `1px solid ${s.bc}22`,
                borderRadius: '14px', padding: '18px',
                boxShadow: `0 4px 24px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.04)`,
                backdropFilter: 'blur(8px)', transition: 'all .3s'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{
                    width: '34px', height: '34px',
                    background: `${s.bc}18`,
                    border: `1px solid ${s.bc}30`,
                    borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke={s.bc} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d={s.icon}/>
                    </svg>
                  </div>
                  <span style={{
                    fontSize: '10px', fontWeight: 700, padding: '3px 9px',
                    borderRadius: '100px', color: s.bc,
                    background: `${s.bc}15`, border: `1px solid ${s.bc}30`
                  }}>{s.badge}</span>
                </div>
                <div style={{
                  fontFamily: "'Cabinet Grotesk',sans-serif",
                  fontSize: '30px', fontWeight: 900, lineHeight: 1, marginBottom: '4px',
                  background: `linear-gradient(135deg,${s.bc},${s.bc}99)`,
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  {loading ? '—' : <AnimatedNumber value={s.value} suffix={s.suffix}/>}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--t2)' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Banner nuevo video */}
          <Link href="/upload" style={{
            display: 'flex', alignItems: 'center', gap: '20px',
            background: 'rgba(0,168,232,.03)',
            border: '1.5px dashed rgba(0,168,232,.2)',
            borderRadius: '14px', padding: '18px 24px',
            marginBottom: '24px', textDecoration: 'none',
            flexWrap: 'wrap' as const, transition: 'all .3s'
          }}>
            <div style={{
              width: '46px', height: '46px',
              background: 'linear-gradient(135deg,rgba(0,168,232,.15),rgba(0,168,232,.05))',
              border: '1px solid rgba(0,168,232,.2)',
              borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="var(--c)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{
                fontFamily: "'Cabinet Grotesk',sans-serif",
                fontSize: '15px', fontWeight: 700, marginBottom: '3px', color: 'var(--t1)'
              }}>Procesar nuevo video</h3>
              <p style={{ fontSize: '12px', color: 'var(--t2)' }}>
                Arrastra un archivo o pega un link de Drive / Dropbox
              </p>
            </div>
            <span style={{
              background: 'linear-gradient(135deg,#00A8E8,#00D4FF)',
              color: '#000', padding: '9px 20px', borderRadius: '8px',
              fontSize: '13px', fontWeight: 700, flexShrink: 0,
              boxShadow: '0 4px 12px rgba(0,168,232,.3)'
            }}>Subir →</span>
          </Link>

          {/* Header lista de videos */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '14px', flexWrap: 'wrap' as const, gap: '12px'
          }}>
            <div>
              <div style={{
                fontFamily: "'Cabinet Grotesk',sans-serif",
                fontSize: '16px', fontWeight: 700
              }}>Mis videos</div>
              <div style={{ fontSize: '12px', color: 'var(--t3)', marginTop: '2px' }}>
                {videos.length} videos · actualiza automáticamente
              </div>
            </div>
            <div style={{
              display: 'flex', gap: '3px',
              background: 'var(--s1)', border: '1px solid var(--b)',
              padding: '3px', borderRadius: '9px'
            }}>
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'completados', label: 'Completados' },
                { id: 'proceso', label: 'En proceso' }
              ].map(f => (
                <button key={f.id} onClick={() => setFiltro(f.id)} style={{
                  padding: '5px 12px', borderRadius: '6px',
                  fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  border: 'none', transition: 'all .2s',
                  background: filtro === f.id ? 'linear-gradient(135deg,#00A8E8,#00D4FF)' : 'transparent',
                  color: filtro === f.id ? '#000' : 'var(--t2)'
                }}>{f.label}</button>
              ))}
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--t3)' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                border: '2px solid var(--b)', borderTop: '2px solid var(--c)',
                animation: 'spin 1s linear infinite', margin: '0 auto 12px'
              }}/>
              Cargando tus videos...
            </div>
          )}

          {/* Empty state con personalidad */}
          {!loading && filtrados.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '56px 24px',
              background: 'var(--s1)', borderRadius: '16px',
              border: '1px solid var(--b)'
            }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '16px',
                background: 'rgba(0,168,232,.08)', border: '1px solid rgba(0,168,232,.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                  stroke="var(--c)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="23 7 16 12 23 17 23 7"/>
                  <rect x="1" y="5" width="15" height="14" rx="2"/>
                </svg>
              </div>
              <div style={{
                fontFamily: "'Cabinet Grotesk',sans-serif",
                fontSize: '18px', fontWeight: 800, color: 'var(--t1)',
                marginBottom: '8px', letterSpacing: '-.5px'
              }}>
                {filtro === 'proceso' ? 'Sin videos en proceso' :
                 filtro === 'completados' ? 'Sin videos completados aún' :
                 'Tu primer curso está a un video de distancia'}
              </div>
              <p style={{ fontSize: '14px', color: 'var(--t2)', marginBottom: '20px', maxWidth: '320px', margin: '0 auto 20px' }}>
                {filtro === 'todos'
                  ? 'Sube una grabación de Zoom o Meet y GISTO la convierte en un curso profesional en minutos.'
                  : 'Cambia el filtro para ver todos tus videos.'}
              </p>
              {filtro === 'todos' && (
                <Link href="/upload" style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  background: 'linear-gradient(135deg,#00A8E8,#00D4FF)',
                  color: '#000', padding: '11px 22px', borderRadius: '9px',
                  fontWeight: 700, fontSize: '14px', textDecoration: 'none',
                  boxShadow: '0 4px 16px rgba(0,168,232,.3)'
                }}>Subir mi primer video →</Link>
              )}
            </div>
          )}

          {/* Lista de videos */}
          {filtrados.map((v: any) => {
            const f = v.fields || {}
            const estado = f.Estado || 'Pendiente'
            const done = estado === 'Completado'
            const processing = estado === 'Procesando' || estado === 'Pendiente'
            const durText = formatDuracion(f)

            return (
              <div key={v.id} style={{
                background: done
                  ? 'linear-gradient(135deg,rgba(0,229,160,.04),rgba(12,16,24,.8))'
                  : processing
                  ? 'linear-gradient(135deg,rgba(255,176,32,.04),rgba(12,16,24,.8))'
                  : 'var(--s1)',
                border: `1px solid ${done ? 'rgba(0,229,160,.15)' : processing ? 'rgba(255,176,32,.15)' : 'var(--b)'}`,
                borderRadius: '14px', marginBottom: '10px', overflow: 'hidden',
                transition: 'all .3s',
                boxShadow: done ? '0 2px 16px rgba(0,229,160,.05)' : processing ? '0 2px 16px rgba(255,176,32,.05)' : 'none'
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px'
                }}>
                  {/* Icono estado */}
                  <div style={{
                    width: '44px', height: '36px', borderRadius: '8px', flexShrink: 0,
                    background: done ? 'rgba(0,229,160,.08)' : processing ? 'rgba(255,176,32,.08)' : 'var(--s2)',
                    border: `1px solid ${done ? 'rgba(0,229,160,.2)' : processing ? 'rgba(255,176,32,.2)' : 'var(--b)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke={done ? 'var(--ok)' : processing ? 'var(--warn)' : 'var(--t3)'}
                      strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="23 7 16 12 23 17 23 7"/>
                      <rect x="1" y="5" width="15" height="14" rx="2"/>
                    </svg>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '14px', fontWeight: 600,
                      whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis',
                      marginBottom: '3px', color: 'var(--t1)'
                    }}>{f.VideoID || 'Sin nombre'}</div>
                    <div style={{
                      fontSize: '11px', color: 'var(--t2)',
                      display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' as const
                    }}>
                      {durText && <span>{durText}</span>}
                      {f.Modulos_detectados && (
                        <><span style={{ color: 'var(--t3)' }}>·</span>
                        <span>{f.Modulos_detectados} módulos</span></>
                      )}
                      <span style={{ color: 'var(--t3)' }}>·</span>
                      <span>{formatFecha(v)}</span>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span style={{
                      padding: '4px 10px', borderRadius: '100px',
                      fontSize: '11px', fontWeight: 700,
                      background: done ? 'rgba(0,229,160,.1)' : processing ? 'rgba(255,176,32,.1)' : 'rgba(255,255,255,.05)',
                      color: done ? 'var(--ok)' : processing ? 'var(--warn)' : 'var(--t2)',
                      border: `1px solid ${done ? 'rgba(0,229,160,.25)' : processing ? 'rgba(255,176,32,.25)' : 'rgba(255,255,255,.1)'}`
                    }}>{estado}</span>

                    {done && (f.Resultado || f.Zip_Key) && (
                      <button onClick={() => descargarZip(v)} disabled={descargando === v.id}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '5px',
                          background: 'transparent',
                          border: '1px solid var(--b)', color: 'var(--t2)',
                          padding: '6px 12px', borderRadius: '8px',
                          fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                          transition: 'all .2s', opacity: descargando === v.id ? 0.5 : 1
                        }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                        </svg>
                        {descargando === v.id ? '...' : (isMobile ? 'ZIP' : 'Descargar ZIP')}
                      </button>
                    )}
                  </div>
                </div>

                {/* Barra progreso si está procesando */}
                {processing && (
                  <AnimatedProgress createdAt={f?.['Created time'] || v.createdTime || v.id}/>
                )}

                {/* Chips de entregables si está completado */}
                {done && (
                  <div style={{
                    padding: '0 16px 14px',
                    display: 'flex', gap: '6px', flexWrap: 'wrap' as const
                  }}>
                    {[
                      `${f.Modulos_detectados || '?'} cápsulas de video`,
                      `${f.Modulos_detectados || '?'} guías de estudio`,
                      'Quiz y glosario',
                      'Bibliografía APA'
                    ].map((item, i) => (
                      <span key={i} style={{
                        fontSize: '11px', color: 'var(--ok)',
                        background: 'rgba(0,229,160,.06)',
                        border: '1px solid rgba(0,229,160,.15)',
                        padding: '3px 10px', borderRadius: '100px',
                        display: 'flex', alignItems: 'center', gap: '4px'
                      }}>
                        <span style={{ fontSize: '9px', fontWeight: 700 }}>✓</span>{item}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </main>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:.5} }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes indeterminate {
          0%{left:-40%;right:100%}
          60%{left:100%;right:-40%}
          100%{left:100%;right:-40%}
        }
        a[href="/upload"]:hover > span:last-child,
        a[href="/upload"]:hover {
          box-shadow: 0 8px 28px rgba(0,168,232,.45) !important;
        }
      `}</style>
    </div>
  )
}
