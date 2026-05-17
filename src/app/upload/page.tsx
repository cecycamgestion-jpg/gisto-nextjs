'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const RAILWAY_URL = process.env.NEXT_PUBLIC_RAILWAY_URL
const AIRTABLE_KEY = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY
const AIRTABLE_BASE = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID

const MAX_CREDITOS: any = {
  'Free':40,'Starter':120,'Professional':480,'Profesional':480,'Academia':1200
}

const PASOS = [
  { n:'01', titulo:'Sube tu grabación', desc:'MP4, MOV, AVI o link de Drive/Dropbox', icon:'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12' },
  { n:'02', titulo:'GISTO analiza', desc:'Transcripción + estructura pedagógica automática', icon:'M22 12h-4l-3 9L9 3l-3 9H2' },
  { n:'03', titulo:'Descarga tu curso', desc:'ZIP con cápsulas, Word, quiz, glosario y bibliografía', icon:'M21 8l-8-5-8 5v10l8 5 8-5V8z' },
]

const ENTREGABLES = [
  { icon:'M23 7l-7 5 7 5V7zM1 5h15a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H1z', label:'Cápsulas de video', color:'#E25C5C', bg:'rgba(226,92,92,.08)', border:'rgba(226,92,92,.18)' },
  { icon:'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6', label:'Guía de estudio Word', color:'#4A90D9', bg:'rgba(74,144,217,.08)', border:'rgba(74,144,217,.18)' },
  { icon:'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11', label:'Quiz multinivel', color:'#00E5A0', bg:'rgba(0,229,160,.08)', border:'rgba(0,229,160,.18)' },
  { icon:'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z', label:'Glosario técnico', color:'#00A8E8', bg:'rgba(0,168,232,.08)', border:'rgba(0,168,232,.18)' },
  { icon:'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z', label:'Bibliografía APA', color:'#FFB020', bg:'rgba(255,176,32,.08)', border:'rgba(255,176,32,.18)' },
  { icon:'M21 8l-8-5-8 5v10l8 5 8-5V8z', label:'ZIP para tu LMS', color:'#A078FF', bg:'rgba(160,120,255,.08)', border:'rgba(160,120,255,.18)' },
]

type Step = 'form' | 'uploading' | 'queued' | 'error'

function getMimeType(file: File): string {
  if (file.type) return file.type
  const ext = file.name.split('.').pop()?.toLowerCase()
  const map: Record<string, string> = {
    mp4:'video/mp4', mov:'video/quicktime', avi:'video/x-msvideo',
    mkv:'video/x-matroska', webm:'video/webm', wmv:'video/x-ms-wmv',
  }
  return map[ext||''] || 'video/mp4'
}

export default function Upload() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [tab, setTab] = useState<'link'|'file'>('link')
  const [url, setUrl] = useState('')
  const [nombre, setNombre] = useState('')
  const [archivo, setArchivo] = useState<File|null>(null)
  const [step, setStep] = useState<Step>('form')
  const [progreso, setProgreso] = useState(0)
  const [error, setError] = useState('')
  const [drag, setDrag] = useState(false)
  const [btnHover, setBtnHover] = useState(false)

  const [user, setUser] = useState<any>(null)
  const [creditos, setCreditos] = useState(0)
  const [creditosMax, setCreditosMax] = useState(40)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [historial, setHistorial] = useState<any[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
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
      }).catch(() => {})

    fetch('/api/airtable/videos')
      .then(r => r.json())
      .then(data => {
        if (data.records) setHistorial(data.records.slice(0, 3))
      }).catch(() => {})
  }, [router])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDrag(false)
    const f = e.dataTransfer.files[0]
    if (f?.type.startsWith('video/')) setArchivo(f)
  }, [])

  async function subirS3(file: File): Promise<string> {
    const contentType = getMimeType(file)
    const r = await fetch(`${RAILWAY_URL}/get-upload-url`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ filename: file.name, content_type: contentType })
    })
    if (!r.ok) throw new Error('Error obteniendo URL de subida')
    const { upload_url, public_url } = await r.json()
    await new Promise<void>((res, rej) => {
      const xhr = new XMLHttpRequest()
      xhr.upload.addEventListener('progress', e => {
        if (e.lengthComputable) setProgreso(Math.round(e.loaded / e.total * 95))
      })
      xhr.addEventListener('load', () => xhr.status === 200 ? res() : rej(new Error(`Error S3: ${xhr.status}`)))
      xhr.addEventListener('error', () => rej(new Error('Error de conexión')))
      xhr.timeout = 600000
      xhr.open('PUT', upload_url)
      xhr.setRequestHeader('Content-Type', contentType)
      xhr.send(file)
    })
    return public_url
  }

  async function handleProcesar() {
    setError('')
    if (tab === 'link') {
      if (!url.startsWith('http')) { setError('Ingresa un link válido de Drive o Dropbox'); return }
      setStep('uploading')
      await guardarYProcesar(url)
    } else {
      if (!archivo) { setError('Selecciona un archivo de video'); return }
      setStep('uploading')
      try {
        const pubUrl = await subirS3(archivo)
        await guardarYProcesar(pubUrl)
      } catch (e: any) { setError(e.message); setStep('error') }
    }
  }

  async function guardarYProcesar(vUrl: string) {
    try {
      const userStr = localStorage.getItem('gisto_user')
      if (!userStr) { setError('Debes iniciar sesión'); setStep('error'); return }
      const userData = JSON.parse(userStr)
      const cred = userData.creditos || 0

      let duracionMin = 0
      try {
        const ar = await fetch(`${RAILWAY_URL}/analizar-video`, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ video_url: vUrl })
        })
        if (ar.ok) { const a = await ar.json(); duracionMin = a.duracion_minutos || 0 }
      } catch {}

      if (duracionMin > 0 && cred < duracionMin) {
        setError(`Tu video dura ${Math.round(duracionMin)} min pero solo tienes ${cred} min de crédito.`)
        setStep('error'); return
      }

      const r = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/Videos`, {
        method:'POST',
        headers:{ 'Authorization': `Bearer ${AIRTABLE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: {
          URL: vUrl,
          VideoID: nombre || `Video-${Date.now()}`,
          Estado: 'Pendiente',
          Usuario_Email: JSON.parse(localStorage.getItem('gisto_user')||'{}').email || ''
        }})
      })
      if (!r.ok) throw new Error('Error registrando video')
      setStep('queued')
    } catch (e: any) { setError(e.message); setStep('error') }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method:'POST' })
    localStorage.removeItem('gisto_user')
    router.push('/login')
  }

  const inicial = user?.nombre?.[0]?.toUpperCase() || 'U'
  const porcentaje = Math.min(100, (creditos / creditosMax) * 100)
  const planActual = user?.plan || 'Free'

  const inputStyle: React.CSSProperties = {
    width:'100%', background:'rgba(255,255,255,0.04)',
    border:'1px solid rgba(240,246,252,0.1)', borderRadius:'10px',
    padding:'13px 16px', color:'var(--t1)', fontSize:'14px',
    outline:'none', fontFamily:'inherit', transition:'all .2s'
  }

  const NavItem = ({ href, label, icon, active }: { href: string, label: string, icon: string, active: boolean }) => (
    <Link href={href} onClick={() => isMobile && setSidebarOpen(false)}
      style={{
        display:'flex', alignItems:'center', gap:'10px',
        padding:'10px 12px', color: active ? 'var(--t1)' : 'var(--t2)',
        textDecoration:'none', borderRadius:'9px', marginBottom:'2px',
        fontSize:'14px', fontWeight:500,
        background: active ? 'rgba(0,168,232,0.08)' : 'transparent',
        border: active ? '1px solid var(--b)' : '1px solid transparent',
        transition:'all .2s'
      }}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
        stroke={active ? 'var(--c)' : 'var(--t3)'}
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d={icon}/>
      </svg>
      {label}
    </Link>
  )

  // ── PANTALLA DE ÉXITO ─────────────────────────────────────────────────────
  if (step === 'queued') return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px' }}>
      <div style={{ textAlign:'center', maxWidth:'520px' }}>
        <div style={{
          width:'80px', height:'80px', borderRadius:'50%',
          background:'rgba(0,229,160,.1)', border:'2px solid rgba(0,229,160,.3)',
          display:'flex', alignItems:'center', justifyContent:'center',
          margin:'0 auto 24px',
          boxShadow:'0 0 32px rgba(0,229,160,.15)'
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
            stroke="var(--ok)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h2 style={{
          fontFamily:"'Cabinet Grotesk',sans-serif",
          fontSize:'32px', fontWeight:900, letterSpacing:'-1px', marginBottom:'12px'
        }}>¡Video en cola!</h2>
        <p style={{ fontSize:'15px', color:'var(--t2)', lineHeight:1.7, marginBottom:'28px' }}>
          El Motor GISTO está procesando tu video.<br/>
          En minutos tendrás tu curso completo listo.
        </p>
        <div style={{
          background:'var(--s1)', border:'1px solid var(--b)',
          borderRadius:'14px', padding:'20px', marginBottom:'28px', textAlign:'left'
        }}>
          <div style={{ fontSize:'10px', fontWeight:700, color:'var(--t3)', letterSpacing:'2px', textTransform:'uppercase' as const, marginBottom:'14px' }}>
            Recibirás en tu dashboard
          </div>
          {ENTREGABLES.map((e, i) => (
            <div key={i} style={{
              display:'flex', alignItems:'center', gap:'10px',
              fontSize:'13px', color:'var(--t2)',
              marginBottom: i < ENTREGABLES.length-1 ? '10px' : 0
            }}>
              <div style={{
                width:'24px', height:'24px', borderRadius:'6px',
                background: e.bg, border:`1px solid ${e.border}`,
                display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0
              }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                  stroke={e.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={e.icon}/>
                </svg>
              </div>
              {e.label}
            </div>
          ))}
        </div>
        <Link href="/dashboard" style={{
          display:'inline-flex', alignItems:'center', gap:'7px',
          background:'linear-gradient(135deg,#00A8E8,#00D4FF)',
          color:'#000', padding:'13px 28px', borderRadius:'10px',
          fontWeight:800, fontSize:'14px', textDecoration:'none',
          boxShadow:'0 4px 20px rgba(0,168,232,.35)'
        }}>Ver en dashboard →</Link>
      </div>
    </div>
  )

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', position:'relative' as const, zIndex:1 }}>
      {/* Overlay móvil */}
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{
          position:'fixed' as const, inset:0, background:'rgba(0,0,0,.6)', zIndex:99
        }}/>
      )}

      {/* SIDEBAR IZQUIERDO */}
      <aside style={{
        width:'240px', background:'var(--s1)',
        borderRight:'1px solid var(--b)', padding:'20px 16px',
        display:'flex', flexDirection:'column' as const, flexShrink:0,
        ...(isMobile ? {
          position:'fixed' as const, top:0, left:0, bottom:0, zIndex:100,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition:'transform .3s ease',
          boxShadow: sidebarOpen ? '4px 0 32px rgba(0,0,0,.6)' : 'none'
        } : { position:'relative' as const })
      }}>
        <Link href="/" style={{
          display:'flex', alignItems:'center', gap:'10px',
          textDecoration:'none', marginBottom:'32px'
        }}>
          <img src="/isotipo.png" alt="GISTO" style={{ height:'52px', width:'auto', objectFit:'contain' }}/>
          <span style={{
            fontFamily:"'Cabinet Grotesk',sans-serif",
            fontWeight:900, fontSize:'18px', color:'var(--t1)'
          }}>THE <span style={{ color:'var(--c)' }}>GISTO</span></span>
        </Link>

        <NavItem href="/dashboard" label="Dashboard" icon="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" active={false}/>
        <NavItem href="/upload" label="Subir video" icon="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" active={true}/>
        <NavItem href="/perfil" label="Mi perfil" icon="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" active={false}/>
        <NavItem href="/planes" label="Planes y pagos" icon="M1 4h22v16H1zM1 10h22" active={false}/>

        {/* Entregables */}
        <div style={{ marginTop:'auto' }}>
          <div style={{
            fontSize:'10px', fontWeight:700, letterSpacing:'2px',
            textTransform:'uppercase' as const, color:'var(--t3)',
            marginBottom:'10px', paddingLeft:'2px'
          }}>Lo que recibirás</div>
          <div style={{ display:'flex', flexDirection:'column' as const, gap:'5px' }}>
            {ENTREGABLES.map((e, i) => (
              <div key={i} style={{
                display:'flex', alignItems:'center', gap:'9px',
                padding:'7px 9px', borderRadius:'8px',
                background: e.bg, border:`1px solid ${e.border}`
              }}>
                <div style={{
                  width:'24px', height:'24px', borderRadius:'6px',
                  background: e.bg, border:`1px solid ${e.border}`,
                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0
                }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                    stroke={e.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={e.icon}/>
                  </svg>
                </div>
                <span style={{ fontSize:'11px', fontWeight:600, color:'var(--t1)', lineHeight:1.2 }}>{e.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Usuario + Sign Out */}
        <div style={{
          display:'flex', alignItems:'center', gap:'10px',
          padding:'14px 12px 0', borderTop:'1px solid var(--b)', marginTop:'12px'
        }}>
          <div style={{
            width:'30px', height:'30px', borderRadius:'50%',
            overflow:'hidden', flexShrink:0, border:'2px solid var(--b)'
          }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
            ) : (
              <div style={{
                width:'100%', height:'100%',
                background:'linear-gradient(135deg,var(--c),var(--c2))',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontFamily:"'Cabinet Grotesk',sans-serif", fontWeight:800, fontSize:'12px', color:'#000'
              }}>{inicial}</div>
            )}
          </div>
          <div style={{ minWidth:0, flex:1 }}>
            <div style={{ fontSize:'12px', fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>{user?.nombre || 'Usuario'}</div>
            <div style={{ fontSize:'10px', color:'var(--t2)' }}>{planActual}</div>
          </div>
        </div>
        <button onClick={logout} style={{
          display:'flex', alignItems:'center', gap:'10px',
          padding:'8px 12px', color:'var(--err)', background:'none',
          border:'none', borderRadius:'9px', marginTop:'6px',
          fontSize:'13px', fontWeight:500, cursor:'pointer', width:'100%'
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          Cerrar sesión
        </button>
      </aside>

      {/* MAIN — formulario central */}
      <main style={{
        flex:1, overflow:'auto', display:'flex',
        background:'radial-gradient(ellipse 60% 50% at 50% 30%,rgba(0,168,232,.05) 0%,transparent 60%)'
      }}>
        {/* Topbar móvil */}
        {isMobile && (
          <div style={{
            position:'fixed' as const, top:0, left:0, right:0, zIndex:50,
            display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'12px 20px', background:'rgba(6,8,16,.9)',
            backdropFilter:'blur(12px)', borderBottom:'1px solid var(--b)'
          }}>
            <button onClick={() => setSidebarOpen(v => !v)} style={{
              background:'rgba(255,255,255,.06)', border:'1px solid var(--b)',
              borderRadius:'8px', color:'var(--t1)', padding:'8px',
              cursor:'pointer', display:'flex', alignItems:'center'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <span style={{ fontFamily:"'Cabinet Grotesk',sans-serif", fontWeight:800, fontSize:'15px' }}>Subir video</span>
            <div style={{ width:'36px' }}/>
          </div>
        )}

        {/* Contenido central */}
        <div style={{
          flex:1, display:'flex', flexDirection:'column' as const,
          alignItems:'center', justifyContent:'center',
          padding: isMobile ? '80px 20px 40px' : '40px 32px',
          minWidth:0
        }}>
          {/* Header */}
          <div style={{ textAlign:'center', marginBottom:'28px', width:'100%', maxWidth:'560px' }}>
            <div style={{
              display:'inline-flex', alignItems:'center', gap:'8px',
              background:'rgba(0,168,232,.08)', border:'1px solid var(--b)',
              padding:'5px 14px', borderRadius:'100px',
              fontSize:'11px', fontWeight:600, color:'var(--c)',
              letterSpacing:'1.5px', textTransform:'uppercase' as const, marginBottom:'16px'
            }}>
              <span style={{
                width:'6px', height:'6px', background:'var(--ok)',
                borderRadius:'50%', boxShadow:'0 0 8px var(--ok)'
              }}/>
              Motor GISTO activo
            </div>
            <h1 style={{
              fontFamily:"'Cabinet Grotesk',sans-serif",
              fontSize: isMobile ? '26px' : '34px', fontWeight:900,
              letterSpacing:'-1.5px', lineHeight:1.05, marginBottom:'8px'
            }}>
              Transforma tu clase<br/>
              <span style={{
                background:'linear-gradient(90deg,var(--c),var(--c2))',
                WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
                backgroundClip:'text'
              }}>en un curso profesional</span>
            </h1>
            <p style={{ fontSize:'14px', color:'var(--t2)', lineHeight:1.65 }}>
              Sube tu grabación de Zoom o Meet. GISTO analiza,<br/>
              limpia y estructura en módulos pedagógicos.
            </p>
          </div>

          {/* Card formulario */}
          <div style={{
            width:'100%', maxWidth:'560px',
            background:'var(--s1)', border:'1px solid var(--b)',
            borderRadius:'20px', overflow:'hidden',
            boxShadow:'0 24px 48px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.04)'
          }}>
            <div style={{ height:'2px', background:'linear-gradient(90deg,transparent,var(--c),var(--c2),transparent)' }}/>
            <div style={{ padding:'28px' }}>

              {/* Estado: uploading */}
              {step === 'uploading' && (
                <div style={{ textAlign:'center', padding:'32px 0' }}>
                  <div style={{
                    width:'56px', height:'56px', borderRadius:'50%',
                    border:'2px solid var(--b)', borderTop:'2px solid var(--c)',
                    margin:'0 auto 20px', animation:'spin 1s linear infinite'
                  }}/>
                  <h3 style={{
                    fontFamily:"'Cabinet Grotesk',sans-serif",
                    fontSize:'18px', fontWeight:700, marginBottom:'12px'
                  }}>Enviando al Motor GISTO...</h3>
                  <div style={{
                    height:'5px', background:'rgba(0,168,232,.1)',
                    borderRadius:'3px', overflow:'hidden', margin:'12px 0'
                  }}>
                    <div style={{
                      height:'100%', width:`${progreso}%`,
                      background:'linear-gradient(90deg,var(--c),var(--c2))',
                      transition:'width .3s', boxShadow:'0 0 8px var(--c)'
                    }}/>
                  </div>
                  <p style={{ fontSize:'12px', color:'var(--c)', fontWeight:700, fontFamily:'monospace' }}>{progreso}%</p>
                </div>
              )}

              {/* Estado: form / error */}
              {(step === 'form' || step === 'error') && (<>
                {/* Tabs */}
                <div style={{
                  display:'flex', gap:'3px',
                  background:'rgba(255,255,255,0.04)', padding:'3px',
                  borderRadius:'11px', marginBottom:'24px',
                  border:'1px solid rgba(240,246,252,0.08)'
                }}>
                  {[
                    { id:'link', label:'Link de Drive / Dropbox', icon:'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71' },
                    { id:'file', label:'Subir desde tu PC', icon:'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12' }
                  ].map(t => (
                    <button key={t.id} onClick={() => setTab(t.id as any)} style={{
                      flex:1, padding:'10px 12px', borderRadius:'9px', border:'none',
                      cursor:'pointer', fontSize:'13px', fontWeight:600, transition:'all .2s',
                      display:'flex', alignItems:'center', justifyContent:'center', gap:'7px',
                      background: tab === t.id ? 'linear-gradient(135deg,#00A8E8,#00D4FF)' : 'transparent',
                      color: tab === t.id ? '#000' : 'var(--t2)',
                      boxShadow: tab === t.id ? '0 4px 12px rgba(0,168,232,.3)' : 'none'
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d={t.icon}/>
                      </svg>
                      {t.label}
                    </button>
                  ))}
                </div>

                {tab === 'link' && (
                  <div style={{ marginBottom:'18px' }}>
                    <label style={{
                      fontSize:'11px', fontWeight:700, color:'var(--t3)',
                      letterSpacing:'1.5px', textTransform:'uppercase' as const,
                      display:'block', marginBottom:'8px'
                    }}>URL del video</label>
                    <div style={{ position:'relative' as const }}>
                      <div style={{ position:'absolute' as const, left:'14px', top:'50%', transform:'translateY(-50%)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                          stroke="var(--t3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                        </svg>
                      </div>
                      <input type="url" value={url} onChange={e => setUrl(e.target.value)}
                        placeholder="https://drive.google.com/... o https://dropbox.com/..."
                        style={{ ...inputStyle, paddingLeft:'42px' }}/>
                    </div>
                    <p style={{ fontSize:'11px', color:'var(--t3)', marginTop:'6px' }}>
                      ⚠️ El link debe estar configurado como público
                    </p>
                  </div>
                )}

                {tab === 'file' && (
                  <div style={{ marginBottom:'18px' }}>
                    <div
                      onDragOver={e => { e.preventDefault(); setDrag(true) }}
                      onDragLeave={() => setDrag(false)}
                      onDrop={onDrop}
                      onClick={() => fileRef.current?.click()}
                      style={{
                        border:`2px dashed ${drag || archivo ? 'var(--c)' : 'rgba(0,168,232,.18)'}`,
                        borderRadius:'14px', padding:'28px 24px', textAlign:'center',
                        cursor:'pointer',
                        background: drag ? 'rgba(0,168,232,.07)' : archivo ? 'rgba(0,229,160,.04)' : 'rgba(0,168,232,.02)',
                        transition:'all .3s'
                      }}>
                      {archivo ? (
                        <div>
                          <div style={{
                            width:'44px', height:'44px', background:'rgba(0,229,160,.1)',
                            borderRadius:'10px', display:'flex', alignItems:'center',
                            justifyContent:'center', margin:'0 auto 10px'
                          }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                              stroke="var(--ok)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          </div>
                          <p style={{ fontSize:'14px', fontWeight:600, marginBottom:'2px' }}>{archivo.name}</p>
                          <p style={{ fontSize:'12px', color:'var(--t2)' }}>{(archivo.size/(1024*1024)).toFixed(1)} MB</p>
                          <button onClick={e => { e.stopPropagation(); setArchivo(null) }}
                            style={{ marginTop:'8px', background:'none', border:'none', color:'var(--t3)', fontSize:'11px', cursor:'pointer' }}>
                            Cambiar
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div style={{
                            width:'48px', height:'48px',
                            background:'rgba(0,168,232,.08)', border:'1px solid rgba(0,168,232,.15)',
                            borderRadius:'12px', display:'flex', alignItems:'center',
                            justifyContent:'center', margin:'0 auto 12px'
                          }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                              stroke="var(--c)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                            </svg>
                          </div>
                          <p style={{ fontSize:'14px', fontWeight:500, marginBottom:'4px' }}>
                            {drag ? 'Suelta aquí' : 'Arrastra o click para seleccionar'}
                          </p>
                          <p style={{ fontSize:'12px', color:'var(--t3)' }}>MP4 · MOV · AVI · MKV · WEBM · Máximo 4GB</p>
                        </div>
                      )}
                    </div>
                    <input ref={fileRef} type="file" accept="video/*" style={{ display:'none' }}
                      onChange={e => setArchivo(e.target.files?.[0] || null)}/>
                  </div>
                )}

                {/* Nombre del curso */}
                <div style={{ marginBottom:'16px' }}>
                  <label style={{
                    fontSize:'11px', fontWeight:700, color:'var(--t3)',
                    letterSpacing:'1.5px', textTransform:'uppercase' as const,
                    display:'block', marginBottom:'8px'
                  }}>Nombre del curso</label>
                  <div style={{ position:'relative' as const }}>
                    <div style={{ position:'absolute' as const, left:'12px', top:'50%', transform:'translateY(-50%)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="var(--t3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                      </svg>
                    </div>
                    <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                      placeholder="Ej: Excel Avanzado 2026"
                      style={{ ...inputStyle, padding:'11px 14px 11px 36px' }}/>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div style={{
                    padding:'12px 16px', borderRadius:'10px', fontSize:'13px',
                    marginBottom:'16px', background:'rgba(255,70,100,.08)',
                    border:'1px solid rgba(255,70,100,.2)', color:'var(--err)',
                    display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' as const
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="var(--err)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    {error}
                    {error.includes('crédito') && (
                      <Link href="/planes" style={{ color:'var(--c)', textDecoration:'none', fontWeight:700, marginLeft:'4px' }}>
                        Ver planes →
                      </Link>
                    )}
                  </div>
                )}

                {/* Botón principal */}
                <button
                  onClick={handleProcesar}
                  onMouseEnter={() => setBtnHover(true)}
                  onMouseLeave={() => setBtnHover(false)}
                  style={{
                    width:'100%', padding:'15px',
                    background: btnHover ? 'linear-gradient(135deg,#00B8F8,#00E4FF)' : 'linear-gradient(135deg,#00A8E8,#00D4FF)',
                    color:'#000', border:'none', borderRadius:'11px',
                    fontFamily:"'Cabinet Grotesk',sans-serif",
                    fontSize:'16px', fontWeight:900, cursor:'pointer',
                    display:'flex', alignItems:'center', justifyContent:'center', gap:'10px',
                    boxShadow: btnHover ? '0 8px 32px rgba(0,168,232,.55)' : '0 4px 20px rgba(0,168,232,.35)',
                    transition:'all .25s cubic-bezier(.23,1,.32,1)',
                    transform: btnHover ? 'translateY(-2px)' : 'translateY(0)',
                    position:'relative' as const, overflow:'hidden'
                  }}>
                  <div style={{
                    position:'absolute' as const, inset:0,
                    background:'linear-gradient(135deg,rgba(255,255,255,.15),transparent)',
                    pointerEvents:'none'
                  }}/>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                  </svg>
                  Procesar con Motor GISTO
                </button>

                {/* Proof */}
                <div style={{
                  display:'flex', justifyContent:'center', gap:'20px',
                  marginTop:'12px', flexWrap:'wrap' as const
                }}>
                  {['Sin tarjeta', 'Análisis automático', 'Video limpio profesional'].map(t => (
                    <span key={t} style={{
                      fontSize:'11px', color:'var(--t3)',
                      display:'flex', alignItems:'center', gap:'4px'
                    }}>
                      <span style={{ color:'var(--ok)', fontWeight:700, fontSize:'10px' }}>✓</span>{t}
                    </span>
                  ))}
                </div>
              </>)}
            </div>
          </div>
        </div>

        {/* PANEL DERECHO */}
        {!isMobile && (
          <div style={{
            width:'280px', flexShrink:0, padding:'40px 24px',
            display:'flex', flexDirection:'column' as const, gap:'20px',
            borderLeft:'1px solid var(--b)'
          }}>
            {/* Créditos */}
            <div style={{
              background:'linear-gradient(135deg,rgba(0,168,232,.08),rgba(0,168,232,.03))',
              border:'1px solid rgba(0,168,232,.2)', borderRadius:'14px', padding:'18px'
            }}>
              <div style={{
                fontSize:'10px', fontWeight:700, color:'var(--t3)',
                letterSpacing:'2px', textTransform:'uppercase' as const, marginBottom:'10px'
              }}>Créditos disponibles</div>
              <div style={{ display:'flex', alignItems:'baseline', gap:'6px', marginBottom:'10px' }}>
                <span style={{
                  fontFamily:"'Cabinet Grotesk',sans-serif", fontSize:'32px', fontWeight:900,
                  background:'linear-gradient(135deg,var(--c),var(--c2))',
                  WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
                  backgroundClip:'text', lineHeight:1
                }}>{creditos}</span>
                <span style={{ fontSize:'13px', color:'var(--t2)' }}>/ {creditosMax} min</span>
              </div>
              <div style={{ height:'5px', background:'rgba(0,168,232,.12)', borderRadius:'3px', overflow:'hidden' }}>
                <div style={{
                  height:'100%', width:`${porcentaje}%`,
                  background:'linear-gradient(90deg,var(--c),var(--c2))',
                  borderRadius:'3px', boxShadow:'0 0 6px rgba(0,168,232,.4)'
                }}/>
              </div>
              <Link href="/planes" style={{
                display:'inline-block', marginTop:'12px',
                fontSize:'12px', color:'var(--c)', textDecoration:'none', fontWeight:600
              }}>Comprar más créditos →</Link>
            </div>

            {/* Pasos */}
            <div style={{
              background:'var(--s1)', border:'1px solid var(--b)',
              borderRadius:'14px', padding:'18px'
            }}>
              <div style={{
                fontSize:'10px', fontWeight:700, color:'var(--t3)',
                letterSpacing:'2px', textTransform:'uppercase' as const, marginBottom:'14px'
              }}>Cómo funciona</div>
              {PASOS.map((p, i) => (
                <div key={i} style={{
                  display:'flex', gap:'12px', marginBottom: i < PASOS.length-1 ? '14px' : 0,
                  position:'relative' as const
                }}>
                  {i < PASOS.length-1 && (
                    <div style={{
                      position:'absolute' as const, left:'15px', top:'28px',
                      width:'1px', height:'calc(100% + 2px)',
                      background:'rgba(0,168,232,.15)'
                    }}/>
                  )}
                  <div style={{
                    width:'30px', height:'30px', borderRadius:'8px', flexShrink:0,
                    background:'rgba(0,168,232,.1)', border:'1px solid rgba(0,168,232,.2)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    position:'relative' as const, zIndex:1
                  }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                      stroke="var(--c)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={p.icon}/>
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize:'12px', fontWeight:700, color:'var(--t1)', marginBottom:'2px' }}>{p.titulo}</div>
                    <div style={{ fontSize:'11px', color:'var(--t3)', lineHeight:1.4 }}>{p.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Historial últimos 3 videos */}
            {historial.length > 0 && (
              <div style={{
                background:'var(--s1)', border:'1px solid var(--b)',
                borderRadius:'14px', padding:'18px'
              }}>
                <div style={{
                  fontSize:'10px', fontWeight:700, color:'var(--t3)',
                  letterSpacing:'2px', textTransform:'uppercase' as const, marginBottom:'12px'
                }}>Procesados recientemente</div>
                {historial.map((v: any, i: number) => {
                  const f = v.fields || {}
                  const done = f.Estado === 'Completado'
                  const processing = f.Estado === 'Procesando' || f.Estado === 'Pendiente'
                  return (
                    <div key={v.id} style={{
                      display:'flex', alignItems:'center', gap:'10px',
                      marginBottom: i < historial.length-1 ? '10px' : 0,
                      paddingBottom: i < historial.length-1 ? '10px' : 0,
                      borderBottom: i < historial.length-1 ? '1px solid rgba(240,246,252,.04)' : 'none'
                    }}>
                      <div style={{
                        width:'8px', height:'8px', borderRadius:'50%', flexShrink:0,
                        background: done ? 'var(--ok)' : processing ? 'var(--warn)' : 'var(--t3)',
                        boxShadow: processing ? '0 0 6px var(--warn)' : 'none'
                      }}/>
                      <div style={{ minWidth:0, flex:1 }}>
                        <div style={{
                          fontSize:'12px', fontWeight:600, color:'var(--t1)',
                          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const
                        }}>{f.VideoID || 'Video'}</div>
                        <div style={{ fontSize:'10px', color:'var(--t3)' }}>{f.Estado || 'Pendiente'}</div>
                      </div>
                    </div>
                  )
                })}
                <Link href="/dashboard" style={{
                  display:'block', textAlign:'center',
                  marginTop:'12px', fontSize:'11px', color:'var(--c)',
                  textDecoration:'none', fontWeight:600
                }}>Ver todos →</Link>
              </div>
            )}
          </div>
        )}
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        input:focus, select:focus {
          border-color: rgba(0,168,232,.5) !important;
          box-shadow: 0 0 0 3px rgba(0,168,232,.12) !important;
          background: rgba(0,168,232,0.04) !important;
        }
      `}</style>
    </div>
  )
}
