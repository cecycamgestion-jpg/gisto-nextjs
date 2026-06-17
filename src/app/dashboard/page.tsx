'use client'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  resolverPlan,
  getPlan,
  PLAN_MAX_MINUTOS as MAX_CREDITOS,
  PLAN_COLORS,
  PLAN_BG,
} from '@/lib/plans'
const PROGRESS_MSGS = [
  'Transcribiendo el audio...','Analizando estructura pedagógica...',
  'Limpiando interacciones del aula...','Aplicando corte anatómico...',
  'Generando documentos Word...','Empaquetando tu curso...',
  'Casi listo...','Un momento más...'
]
const ERRORES_CORTE = [
  { id: 'corto_despues', label: 'Debió cortar antes (es muy larga)' },
  { id: 'corto_antes',   label: 'Debió cortar después (es muy corta)' },
  { id: 'mezcla_temas',  label: 'Trata más de un tema (debería ser dos cápsulas)' }
]

type ValorCorte = 'bien' | 'malo' | null
interface EstadoCapsula {
  val: ValorCorte
  errores: string[]
}
interface FeedbackVideo { [capId: string]: EstadoCapsula }

function FeedbackPanel({ record, modulos }: { record: any; modulos: number }) {
  const f = record.fields || {}
  const [abierto, setAbierto] = useState(false)
  const [estado, setEstado] = useState<FeedbackVideo>({})
  const [comentarioGlobal, setComentarioGlobal] = useState('')
  const [enviado, setEnviado] = useState(!!(f.Calidad_Feedback && f.Calidad_Feedback !== ''))
  const [enviando, setEnviando] = useState(false)

  const capsulas = Array.from({ length: modulos || 0 }, (_, i) => ({ id: `C${i + 1}` }))

  useEffect(() => {
    const init: FeedbackVideo = {}
    capsulas.forEach(c => { init[c.id] = { val: null, errores: [] } })
    setEstado(init)
  }, [modulos])

  const setVal = (capId: string, val: ValorCorte) =>
    setEstado(prev => ({
      ...prev,
      [capId]: { val, errores: val === 'bien' ? [] : prev[capId]?.errores ?? [] }
    }))

  const toggleError = (capId: string, errId: string) =>
    setEstado(prev => {
      const actual = prev[capId]?.errores ?? []
      const existe = actual.includes(errId)
      const nuevos = existe ? actual.filter(e => e !== errId) : [...actual, errId]
      return { ...prev, [capId]: { ...prev[capId], errores: nuevos } }
    })

  const todoRespondido = capsulas.length > 0 && capsulas.every(c => {
    const s = estado[c.id]
    if (!s || s.val === null) return false
    if (s.val === 'malo' && s.errores.length === 0) return false
    return true
  })

  async function enviarFeedback() {
    setEnviando(true)
    const buenos = capsulas.filter(c => estado[c.id]?.val === 'bien').length
    const malos  = capsulas.filter(c => estado[c.id]?.val === 'malo')
    const labelCorto: Record<string,string> = {
      'corto_despues': 'cortar antes',
      'corto_antes':   'cortar después',
      'mezcla_temas':  'mezcla de temas'
    }
    let resumen = malos.length === 0
      ? `${buenos} correctas`
      : `${buenos} correctas · ${malos.length} con error: ${malos.map(c => {
          const errs = (estado[c.id].errores || []).map(e => labelCorto[e] || e).join('+')
          return `${c.id}:${errs}`
        }).join(', ')}`
    if (comentarioGlobal.trim()) {
      resumen += ` | Nota: ${comentarioGlobal.trim().slice(0, 300)}`
    }
    try {
      await fetch('/api/airtable/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record_id: record.id, feedback: resumen })
      })
    } catch {}
    setEnviado(true); setEnviando(false); setAbierto(false)
  }

  if (enviado) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 14px 10px', borderTop: '1px solid rgba(0,229,160,.1)', fontSize: '11px', color: 'var(--t3)' }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#00E5A0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3"/>
      </svg>
      Feedback enviado{f.Calidad_Feedback ? ` · ${f.Calidad_Feedback}` : ''}
    </div>
  )

  if (capsulas.length === 0) return null

  return (
    <>
      <div onClick={() => setAbierto(v => !v)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderTop: '1px solid rgba(240,246,252,.06)', background: 'rgba(255,255,255,.02)', cursor: 'pointer', userSelect: 'none' as const, borderRadius: abierto ? '0' : '0 0 14px 14px' }}>
        <span style={{ fontSize: '11px', color: 'var(--t3)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          ¿Cómo quedaron los cortes?
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: abierto ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      {abierto && (
        <div style={{ borderTop: '1px solid rgba(240,246,252,.06)', padding: '12px 14px 14px', background: 'rgba(255,255,255,.015)', borderRadius: '0 0 14px 14px' }}>
          <p style={{ fontSize: '10px', color: 'var(--t3)', marginBottom: '10px', lineHeight: 1.4 }}>
            Marque cada cápsula. Solo las <span style={{ color: '#e24b4a' }}>Malo</span> necesitan detalle.
          </p>
          {capsulas.map((cap, idx) => {
            const s = estado[cap.id] || { val: null, errores: [] }
            const isLast = idx === capsulas.length - 1
            return (
              <div key={cap.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: isLast && s.val !== 'malo' ? 'none' : '1px solid rgba(240,246,252,.04)' }}>
                  <span style={{ fontSize: '10px', color: 'var(--t3)', minWidth: '24px', fontWeight: 600 }}>{cap.id}</span>
                  <span style={{ flex: 1, fontSize: '12px', color: 'var(--t2)' }}>Cápsula {idx + 1}</span>
                  <button onClick={() => setVal(cap.id, 'bien')} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: s.val === 'bien' ? 600 : 400, background: s.val === 'bien' ? 'rgba(0,229,160,.1)' : 'rgba(255,255,255,.04)', color: s.val === 'bien' ? '#00E5A0' : 'var(--t3)', outline: s.val === 'bien' ? '1px solid rgba(0,229,160,.3)' : '1px solid rgba(240,246,252,.08)', transition: 'all .15s' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    Bien
                  </button>
                  <button onClick={() => setVal(cap.id, 'malo')} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: s.val === 'malo' ? 600 : 400, background: s.val === 'malo' ? 'rgba(226,75,75,.1)' : 'rgba(255,255,255,.04)', color: s.val === 'malo' ? '#e24b4a' : 'var(--t3)', outline: s.val === 'malo' ? '1px solid rgba(226,75,75,.3)' : '1px solid rgba(240,246,252,.08)', transition: 'all .15s' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    Malo
                  </button>
                </div>
                {s.val === 'malo' && (
                  <div style={{ margin: '5px 0 6px 24px', padding: '8px 10px', background: 'rgba(226,75,75,.04)', border: '1px solid rgba(226,75,75,.15)', borderRadius: '8px' }}>
                    <p style={{ fontSize: '10px', color: 'var(--t3)', marginBottom: '6px' }}>¿Qué le faltó?</p>
                    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '6px' }}>
                      {ERRORES_CORTE.map(err => {
                        const activo = s.errores.includes(err.id)
                        return (
                          <button key={err.id} onClick={() => toggleError(cap.id, err.id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '11px', textAlign: 'left' as const, background: activo ? 'rgba(226,75,75,.15)' : 'rgba(255,255,255,.04)', color: activo ? '#e24b4a' : 'var(--t2)', outline: activo ? '1px solid rgba(226,75,75,.35)' : '1px solid rgba(240,246,252,.08)', fontWeight: activo ? 600 : 400, transition: 'all .15s' }}>
                            <span style={{ width: '14px', height: '14px', borderRadius: '3px', border: activo ? '1.5px solid #e24b4a' : '1.5px solid rgba(255,255,255,.2)', background: activo ? '#e24b4a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {activo && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                            </span>
                            {err.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          <div style={{ marginTop: '12px' }}>
            <p style={{ fontSize: '10px', color: 'var(--t3)', marginBottom: '5px' }}>¿Algo más? (opcional)</p>
            <textarea value={comentarioGlobal} onChange={e => setComentarioGlobal(e.target.value)} placeholder="Ej: El docente mencionó datos de contacto al final..." maxLength={300} rows={2} style={{ width: '100%', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(240,246,252,.08)', borderRadius: '7px', padding: '8px 10px', fontSize: '11px', color: 'var(--t1)', fontFamily: 'inherit', resize: 'vertical' as const, outline: 'none' }}/>
            <div style={{ fontSize: '9px', color: 'var(--t3)', textAlign: 'right' as const, marginTop: '2px' }}>{comentarioGlobal.length}/300</div>
          </div>
          <button onClick={enviarFeedback} disabled={!todoRespondido || enviando} style={{ marginTop: '12px', width: '100%', padding: '9px', background: todoRespondido ? 'linear-gradient(135deg,#00A8E8,#00D4FF)' : 'rgba(0,168,232,.15)', color: todoRespondido ? '#000' : 'rgba(255,255,255,.3)', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: todoRespondido ? 'pointer' : 'not-allowed', transition: 'all .2s' }}>
            {enviando ? 'Enviando...' : 'Enviar feedback →'}
          </button>
        </div>
      )}
    </>
  )
}

function fmtHoras(min: number): string {
  if (!min || min <= 0) return '0 min'
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${m} min`
}

function AnimatedNumber({ value, suffix = '' }: { value: number, suffix?: string }) {
  const [display, setDisplay] = useState(0)
  const prevRef = useRef(0)
  useEffect(() => {
    const from = prevRef.current; const to = value
    if (from === to) return
    const duration = 1200; const start = performance.now()
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
      <div style={{ background: 'rgba(255,176,32,.04)', border: '1px solid rgba(255,176,32,.12)', borderRadius: '10px', padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--warn)', boxShadow: '0 0 8px var(--warn)', flexShrink: 0, animation: 'pulse 1s infinite', display: 'inline-block' }}/>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--warn)' }}>{PROGRESS_MSGS[msgIdx]}</span>
        </div>
        <div style={{ height: '3px', background: 'rgba(255,255,255,.06)', borderRadius: '2px', overflow: 'hidden', position: 'relative' as const }}>
          <div style={{ position: 'absolute' as const, height: '100%', width: '40%', background: 'linear-gradient(90deg,transparent,var(--warn),transparent)', borderRadius: '2px', animation: 'indeterminate 1.8s ease-in-out infinite' }}/>
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
  const [busqueda, setBusqueda] = useState('')
  const [etiquetasMap, setEtiquetasMap] = useState<Record<string, { texto: string; color: string }>>({})
  const statsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

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
      const u = localStorage.getItem('gisto_user')
      const email = u ? (JSON.parse(u).email || '') : ''
      const r = await fetch('/api/airtable/videos?email=' + encodeURIComponent(email))
      const data = await r.json()
      if (data.records) setVideos(data.records)
      setLoading(false)
    } catch { setLoading(false) }
  }, [])

  useEffect(() => {
    const u = localStorage.getItem('gisto_user')
    if (!u) { router.push('/login'); return }
    const parsed = JSON.parse(u)
    setUser(parsed); setCreditos(parsed.creditos || 0)
    setCreditosMax(MAX_CREDITOS[resolverPlan(parsed.plan)])
    if (parsed.avatarUrl) setAvatarUrl(parsed.avatarUrl)
    fetch('/api/airtable/usuario').then(r => r.json()).then(data => {
      if (data.error) return
      const credAirtable = data.creditos || 0; const plan = data.plan || 'Free'
      const credLocal = parsed.creditos || 0
      const cred = Math.min(credLocal, credAirtable)
      setCreditos(cred); setCreditosMax(MAX_CREDITOS[resolverPlan(plan)])
      if (data.avatar_url) setAvatarUrl(data.avatar_url)
      const updated = { ...parsed, creditos: cred, plan, nombre: data.nombre, avatarUrl: data.avatar_url || '' }
      localStorage.setItem('gisto_user', JSON.stringify(updated)); setUser(updated)
    }).catch(() => {})
    fetchVideos()
    const interval = setInterval(fetchVideos, 8000)
    return () => clearInterval(interval)
  }, [fetchVideos, router])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    localStorage.removeItem('gisto_user'); router.push('/login')
  }

  async function descargarZip(record: any) {
    const f = record.fields || {}
    const zipKey = f.Zip_Key || f.zip_key
    if (!zipKey && f.Resultado) { window.open(f.Resultado, '_blank'); return }
    if (!zipKey) return
    setDescargando(record.id)
    try {
      const r = await fetch('/api/download', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ zip_key: zipKey }) })
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
    const mins = Math.floor(diff / 60000); const hrs = Math.floor(mins / 60); const days = Math.floor(hrs / 24)
    if (mins < 1) return 'Ahora mismo'
    if (mins < 60) return `Hace ${mins} min`
    if (hrs < 24) return `Hace ${hrs}h`
    return `Hace ${days}d`
  }

  const hayProcesando = videos.some(v => { const e = v.fields?.Estado?.toLowerCase(); return e === 'procesando' || e === 'pendiente' })
  const enProceso = videos.filter(v => { const e = v.fields?.Estado?.toLowerCase(); return e === 'procesando' || e === 'pendiente' }).length
  const modulos = videos.reduce((a, v) => a + (v.fields?.Modulos_detectados || 0), 0)
  const filtrados = videos.filter(v => {
    const e = v.fields?.Estado?.toLowerCase() || ''
    const nombre = (v.fields?.VideoID || '').toLowerCase()
    const q = busqueda.toLowerCase()
    const matchBusqueda = !q || nombre.includes(q)
    const matchFiltro = filtro === 'completados' ? e === 'completado' : filtro === 'proceso' ? (e === 'procesando' || e === 'pendiente') : true
    return matchBusqueda && matchFiltro
  })

  const planActual = resolverPlan(user?.plan)
  const planNombre = getPlan(user?.plan).nombre
  const inicial = user?.nombre?.[0]?.toUpperCase() || 'U'
  const porcentaje = creditosMax > 0 ? Math.max(2, Math.min(100, (creditos / creditosMax) * 100)) : 2

  const NavItem = ({ href, label, icon, active, badge }: any) => (
    <Link href={href} onClick={() => isMobile && setSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', color: active ? 'var(--t1)' : 'var(--t2)', textDecoration: 'none', borderRadius: '9px', marginBottom: '2px', fontSize: '14px', fontWeight: 500, background: active ? 'rgba(0,168,232,0.08)' : 'transparent', border: active ? '1px solid var(--b)' : '1px solid transparent', transition: 'all .2s' }}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={active ? '#00A8E8' : '#667788'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={icon}/></svg>
      {label}
      {badge ? <span style={{ marginLeft: 'auto', background: 'var(--warn)', color: '#000', fontSize: '10px', fontWeight: 800, padding: '1px 7px', borderRadius: '100px' }}>{badge}</span> : null}
    </Link>
  )

  function estadoHumano(e: string): { label: string; color: string; bg: string; border: string; dot?: boolean } {
    const lower = e?.toLowerCase() || ''
    if (lower === 'completado') return { label: 'Listo para descargar', color: '#00E5A0', bg: 'rgba(0,229,160,.1)', border: 'rgba(0,229,160,.25)' }
    if (lower === 'procesando') return { label: 'Procesando', color: '#FFB020', bg: 'rgba(255,176,32,.1)', border: 'rgba(255,176,32,.25)', dot: true }
    if (lower === 'pendiente')  return { label: 'Recibido', color: '#00A8E8', bg: 'rgba(0,168,232,.1)', border: 'rgba(0,168,232,.25)', dot: true }
    if (lower === 'en_revision' || lower === 'en revisión') return { label: 'En revisión', color: '#A078FF', bg: 'rgba(160,120,255,.1)', border: 'rgba(160,120,255,.25)', dot: true }
    if (lower.includes('error')) return { label: 'Error — contacta soporte', color: '#E25C5C', bg: 'rgba(226,92,92,.1)', border: 'rgba(226,92,92,.25)' }
    return { label: e, color: '#667788', bg: 'rgba(255,255,255,.05)', border: 'rgba(255,255,255,.1)' }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', position: 'relative' as const, zIndex: 1 }}>
      {isMobile && sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 99 }}/>}

      <aside style={{ width: '260px', background: 'var(--s1)', borderRight: '1px solid var(--b)', padding: '20px 16px', display: 'flex', flexDirection: 'column' as const, flexShrink: 0, ...(isMobile ? { position: 'fixed' as const, top: 0, left: 0, bottom: 0, zIndex: 100, transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform .3s ease', boxShadow: sidebarOpen ? '4px 0 32px rgba(0,0,0,.6)' : 'none' } : { position: 'relative' as const }) }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', marginBottom: '36px' }}>
          <img src="/isotipo.png" alt="GISTO" style={{ height: '52px', width: 'auto', objectFit: 'contain' }}/>
          <span style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontWeight: 900, fontSize: '18px', color: 'var(--t1)' }}>THE <span style={{ color: '#00A8E8' }}>GISTO</span></span>
        </Link>
        <NavItem href="/dashboard" label="Dashboard" icon="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" active={true}/>
        <NavItem href="/upload" label="Subir video" icon="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" active={false} badge={enProceso || undefined}/>
        <NavItem href="/perfil" label="Mi perfil" icon="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" active={false}/>
        <NavItem href="/planes" label="Planes y pagos" icon="M1 4h22v16H1zM1 10h22" active={false}/>
        <div style={{ marginTop: 'auto', background: 'rgba(0,168,232,.06)', border: '1px solid var(--b)', borderRadius: '12px', padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--t2)', marginBottom: '8px' }}>Créditos disponibles</div>
          <div style={{ height: '6px', background: 'rgba(0,168,232,.12)', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px', position: 'relative' as const }}>
            <div style={{ height: '100%', width: `${porcentaje}%`, minWidth: '4px', background: 'linear-gradient(90deg,#00A8E8,#00D4FF)', borderRadius: '3px', transition: 'width .5s ease', boxShadow: '0 0 6px rgba(0,168,232,.4)' }}/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '12px' }}>
            <strong style={{ color: '#00A8E8', fontSize: '15px' }}>{fmtHoras(creditos)}</strong>
            <span style={{ color: '#667788' }}>/ {fmtHoras(creditosMax)}</span>
          </div>
          <div style={{ marginTop: '6px' }}>
            <Link href="/planes" style={{ textDecoration: 'none' }}>
              <span style={{ display: 'inline-block', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '100px', color: PLAN_COLORS[planActual]||'#00A8E8', background: PLAN_BG[planActual]||'rgba(0,168,232,.08)', border: `1px solid ${PLAN_COLORS[planActual]||'#00A8E8'}30` }}>{planNombre}</span>
            </Link>
          </div>
        </div>
        <Link href="/perfil" onClick={() => isMobile && setSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 12px 0', borderTop: '1px solid var(--b)', marginTop: '12px', textDecoration: 'none', cursor: 'pointer' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '2px solid var(--b)' }}>
            {avatarUrl ? <img src={avatarUrl} alt={user?.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#00A8E8,#00D4FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cabinet Grotesk',sans-serif", fontWeight: 800, fontSize: '13px', color: '#000' }}>{inicial}</div>}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{user?.nombre || 'Usuario'}</div>
            <div style={{ fontSize: '11px', color: 'var(--t2)' }}>{planNombre}</div>
          </div>
        </Link>
        <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', color: 'var(--err)', background: 'none', border: 'none', borderRadius: '9px', marginTop: '6px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', width: '100%' }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          Cerrar sesión
        </button>
      </aside>

      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' as const, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '12px 16px' : '16px 24px', borderBottom: '1px solid var(--b)', background: 'rgba(6,8,16,.8)', backdropFilter: 'blur(16px)', position: 'sticky' as const, top: 0, zIndex: 50, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isMobile && <button onClick={() => setSidebarOpen(v => !v)} style={{ background: 'rgba(255,255,255,.06)', border: '1px solid var(--b)', borderRadius: '8px', color: 'var(--t1)', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg></button>}
            <div>
              <h1 style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontSize: isMobile ? '16px' : '20px', fontWeight: 900, letterSpacing: '-.5px', lineHeight: 1 }}>Dashboard</h1>
              <p style={{ fontSize: '11px', color: 'var(--t2)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                {hayProcesando && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--warn)', boxShadow: '0 0 6px var(--warn)', display: 'inline-block', animation: 'pulse 1.5s infinite' }}/>}
                {hayProcesando ? 'Motor GISTO procesando...' : 'Todo al día'}
              </p>
            </div>
          </div>
          {isMobile && <Link href="/planes" style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', textDecoration: 'none', gap: '3px' }}><span style={{ fontSize: '13px', fontWeight: 800, color: '#00A8E8' }}>{fmtHoras(creditos)}</span><div style={{ width: '60px', height: '3px', background: 'rgba(0,168,232,.15)', borderRadius: '2px', overflow: 'hidden' }}><div style={{ height: '100%', width: `${porcentaje}%`, minWidth: '3px', background: 'linear-gradient(90deg,#00A8E8,#00D4FF)', borderRadius: '2px' }}/></div></Link>}
          {!isMobile && <Link href="/upload" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg,#00A8E8,#00D4FF)', color: '#000', padding: '9px 18px', borderRadius: '9px', fontWeight: 800, fontSize: '13px', textDecoration: 'none', boxShadow: '0 4px 14px rgba(0,168,232,.3)' }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Nuevo video</Link>}
        </div>

        <div style={{ padding: isMobile ? '14px' : '24px 28px', flex: 1 }}>
          {(() => {
            if (loading) return null
            const esDemo = planActual === 'demo'
            const sinCreditos = creditos <= 0
            if (!esDemo && !sinCreditos) return null
            let titulo: string, texto: string, cta: string
            if (esDemo && !sinCreditos) {
              titulo = 'Estás en modo demo'
              texto = 'Tu saldo de prueba sirve para conocer GISTO. Al adquirir un plan, los minutos de la prueba no se acumulan.'
              cta = 'Ver planes →'
            } else if (esDemo && sinCreditos) {
              titulo = 'Agotaste tu demo'
              texto = 'Para seguir procesando tus clases, elige un plan. Tus créditos no vencen.'
              cta = 'Elegir un plan →'
            } else {
              titulo = 'Te quedaste sin créditos'
              texto = 'Recarga horas para seguir procesando. Tus créditos no vencen.'
              cta = 'Recargar →'
            }
            return (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' as const,
                background: 'linear-gradient(135deg, rgba(0,168,232,.08), rgba(0,168,232,.02))',
                border: '1px solid rgba(0,168,232,.25)', borderRadius: '14px',
                padding: isMobile ? '14px 16px' : '16px 20px',
                marginBottom: isMobile ? '14px' : '20px'
              }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '10px', flexShrink: 0,
                  background: 'rgba(0,168,232,.15)', border: '1px solid rgba(0,168,232,.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00A8E8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 4h22v16H1zM1 10h22"/>
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: '180px' }}>
                  <div style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontWeight: 800, fontSize: isMobile ? '14px' : '15px', color: 'var(--t1)', marginBottom: '2px' }}>{titulo}</div>
                  <div style={{ fontSize: '12px', color: 'var(--t2)', lineHeight: 1.45 }}>{texto}</div>
                </div>
                <Link href="/planes" style={{
                  flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '6px',
                  background: 'linear-gradient(135deg,#00A8E8,#00D4FF)', color: '#000',
                  padding: '10px 18px', borderRadius: '9px', fontWeight: 800, fontSize: '13px',
                  textDecoration: 'none', boxShadow: '0 4px 14px rgba(0,168,232,.3)'
                }}>{cta}</Link>
              </div>
            )
          })()}
          <div ref={statsRef} style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: isMobile ? '10px' : '14px', marginBottom: isMobile ? '14px' : '24px' }}>
            {[
              { label: 'Créditos disponibles', sublabel: planNombre, color: PLAN_COLORS[planActual]||'#00A8E8', icon: 'M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 4v6l4 2', value: loading ? null : creditos, suffix: '', extra: (<div style={{ marginTop: '10px' }}><div style={{ height: '3px', background: 'rgba(255,255,255,0.07)', borderRadius: '2px', overflow: 'hidden' }}><div style={{ height: '100%', width: `${porcentaje}%`, minWidth: '4px', background: PLAN_COLORS[planActual]||'#00A8E8', borderRadius: '2px', transition: 'width .8s ease' }}/></div><div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', fontSize: '10px', color: '#667788' }}><span style={{ fontWeight: 700, color: PLAN_COLORS[planActual]||'#00A8E8' }}>{creditos} min</span><span>{creditosMax} min</span></div></div>) },
              { label: 'Videos procesados', sublabel: 'Total acumulado', color: '#00E5A0', icon: 'M23 7l-7 5 7 5V7zM1 5h15a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H1z', value: loading ? null : videos.length, suffix: '', extra: null },
              { label: 'Módulos generados', sublabel: 'En todos tus videos', color: '#A078FF', icon: 'M22 12h-4l-3 9L9 3l-3 9H2', value: loading ? null : modulos, suffix: '', extra: null },
              { label: enProceso > 0 ? 'Videos en proceso' : 'Cola de proceso', sublabel: enProceso > 0 ? 'Motor activo' : 'Motor libre', color: enProceso > 0 ? '#FFB020' : '#00E5A0', icon: enProceso > 0 ? 'M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 4v6l4 2' : 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3', value: loading ? null : enProceso, suffix: '', extra: null }
            ].map((s, i) => (
              <div key={i} style={{ background: 'rgba(10,14,22,0.9)', border: '1px solid rgba(240,246,252,0.06)', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,.25)', position: 'relative' as const }}>
                <div style={{ height: '3px', background: s.color }}/>
                <div style={{ padding: isMobile ? '14px' : '18px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${s.color}14`, border: `1px solid ${s.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={s.icon}/></svg>
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: s.color, background: `${s.color}12`, border: `1px solid ${s.color}25`, padding: '3px 8px', borderRadius: '100px', whiteSpace: 'nowrap' as const }}>{s.sublabel}</span>
                  </div>
                  <div style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontSize: isMobile ? '28px' : '36px', fontWeight: 900, lineHeight: 1, marginBottom: '4px', color: '#f0f6fc', letterSpacing: '-1px' }}>
                    {s.value === null ? <span style={{ color: '#334455', fontSize: '20px' }}>—</span> : (s.label === 'Créditos disponibles' ? <span style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:isMobile?'22px':'28px',fontWeight:900,letterSpacing:'-1px'}}>{fmtHoras(statsVisible ? s.value as number : 0)}</span> : <AnimatedNumber value={statsVisible ? (s.value as number) : 0} suffix={s.suffix}/>)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#667788', fontWeight: 500 }}>{s.label}</div>
                  {s.extra}
                </div>
              </div>
            ))}
          </div>

          <Link href="/upload" style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '20px', background: 'rgba(0,168,232,.03)', border: '1.5px dashed rgba(0,168,232,.2)', borderRadius: '14px', padding: isMobile ? '14px 16px' : '18px 24px', marginBottom: isMobile ? '16px' : '24px', textDecoration: 'none', flexWrap: 'wrap' as const }}>
            <div style={{ width: isMobile ? '38px' : '46px', height: isMobile ? '38px' : '46px', background: 'linear-gradient(135deg,rgba(0,168,232,.15),rgba(0,168,232,.05))', border: '1px solid rgba(0,168,232,.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width={isMobile ? 17 : 20} height={isMobile ? 17 : 20} viewBox="0 0 24 24" fill="none" stroke="#00A8E8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontSize: isMobile ? '13px' : '15px', fontWeight: 700, marginBottom: '2px', color: 'var(--t1)' }}>Procesar nuevo video</h3>
              <p style={{ fontSize: isMobile ? '11px' : '12px', color: 'var(--t2)' }}>Arrastra un archivo o pega un link de Drive / Dropbox</p>
            </div>
            <span style={{ background: 'linear-gradient(135deg,#00A8E8,#00D4FF)', color: '#000', padding: isMobile ? '7px 14px' : '9px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>Subir →</span>
          </Link>

          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: '10px', marginBottom: '10px' }}>
              <div>
                <div style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontSize: isMobile ? '14px' : '16px', fontWeight: 700 }}>Mis videos</div>
                <div style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '1px' }}>{filtrados.length}{filtrados.length !== videos.length ? ` de ${videos.length}` : ''} videos · auto-actualiza</div>
              </div>
              <div style={{ display: 'flex', gap: '3px', background: 'var(--s1)', border: '1px solid var(--b)', padding: '3px', borderRadius: '9px' }}>
                {[{ id: 'todos', label: 'Todos' }, { id: 'completados', label: isMobile ? 'OK' : 'Completados' }, { id: 'proceso', label: isMobile ? 'Activos' : 'En proceso' }].map(f => (
                  <button key={f.id} onClick={() => setFiltro(f.id)} style={{ padding: isMobile ? '5px 9px' : '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all .2s', background: filtro === f.id ? 'linear-gradient(135deg,#00A8E8,#00D4FF)' : 'transparent', color: filtro === f.id ? '#000' : 'var(--t2)' }}>{f.label}</button>
                ))}
              </div>
            </div>
            <div style={{ position: 'relative' as const }}>
              <svg style={{ position: 'absolute' as const, left: '11px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por nombre..." style={{ width: '100%', background: 'var(--s1)', border: '1px solid var(--b)', borderRadius: '9px', padding: '9px 12px 9px 34px', color: 'var(--t1)', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
              {busqueda && <button onClick={() => setBusqueda('')} style={{ position: 'absolute' as const, right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>×</button>}
            </div>
          </div>

          {loading && <div style={{ textAlign: 'center', padding: '48px', color: 'var(--t3)' }}><div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid var(--b)', borderTop: '2px solid #00A8E8', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }}/>Cargando tus videos...</div>}

          {!loading && filtrados.length === 0 && (
            <div style={{ textAlign: 'center', padding: isMobile ? '36px 20px' : '56px 24px', background: 'var(--s1)', borderRadius: '16px', border: '1px solid var(--b)' }}>
              <div style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontSize: isMobile ? '15px' : '18px', fontWeight: 800, marginBottom: '8px' }}>{filtro === 'proceso' ? 'Sin videos en proceso' : filtro === 'completados' ? 'Sin videos completados' : 'Tu primer curso está a un video de distancia'}</div>
              {filtro === 'todos' && <Link href="/upload" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg,#00A8E8,#00D4FF)', color: '#000', padding: '11px 22px', borderRadius: '9px', fontWeight: 700, fontSize: '14px', textDecoration: 'none', marginTop: '12px' }}>Subir mi primer video →</Link>}
            </div>
          )}

          {filtrados.map((v: any) => {
            const f = v.fields || {}
            const estado = f.Estado || 'Pendiente'
            const done = estado === 'Completado'
            const processing = estado === 'Procesando' || estado === 'Pendiente'
            const durText = formatDuracion(f)
            return (
              <div key={v.id} style={{ background: done ? 'linear-gradient(135deg,rgba(0,229,160,.04),rgba(12,16,24,.8))' : processing ? 'linear-gradient(135deg,rgba(255,176,32,.04),rgba(12,16,24,.8))' : 'var(--s1)', border: `1px solid ${done ? 'rgba(0,229,160,.15)' : processing ? 'rgba(255,176,32,.15)' : 'var(--b)'}`, borderRadius: '14px', marginBottom: '10px', overflow: 'hidden', transition: 'all .3s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '14px', padding: isMobile ? '12px 14px' : '14px 16px' }}>
                  <div style={{ width: isMobile ? '36px' : '44px', height: isMobile ? '30px' : '36px', borderRadius: '8px', flexShrink: 0, background: done ? 'rgba(0,229,160,.08)' : processing ? 'rgba(255,176,32,.08)' : 'var(--s2)', border: `1px solid ${done ? 'rgba(0,229,160,.2)' : processing ? 'rgba(255,176,32,.2)' : 'var(--b)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={done ? 'var(--ok)' : processing ? 'var(--warn)' : 'var(--t3)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: isMobile ? '12px' : '14px', fontWeight: 600, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '3px' }}>{f.VideoID || 'Sin nombre'}</div>
                    <div style={{ fontSize: '11px', color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' as const }}>
                      {durText && <span>{durText}</span>}
                      {f.Modulos_detectados && <><span style={{ color: 'var(--t3)' }}>·</span><span>{f.Modulos_detectados} módulos</span></>}
                      <span style={{ color: 'var(--t3)' }}>·</span><span>{formatFecha(v)}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {(() => { const es = estadoHumano(estado); return (<span style={{ padding: '4px 9px', borderRadius: '100px', fontSize: '10px', fontWeight: 700, background: es.bg, color: es.color, border: `1px solid ${es.border}`, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>{es.dot && <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: es.color, animation: 'pulse 1.5s infinite', display: 'inline-block' }}/>}{es.label}</span>) })()}
                    {done && (f.Resultado || f.Zip_Key) && (
                      <button onClick={() => descargarZip(v)} disabled={descargando === v.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg,rgba(0,229,160,.15),rgba(0,229,160,.05))', border: '1px solid rgba(0,229,160,.3)', color: '#00E5A0', padding: '7px 14px', borderRadius: '9px', fontSize: '12px', fontWeight: 700, cursor: descargando === v.id ? 'not-allowed' : 'pointer', opacity: descargando === v.id ? 0.5 : 1 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                        {descargando === v.id ? 'Descargando...' : 'Descargar archivos'}
                      </button>
                    )}
                  </div>
                </div>
                {processing && <AnimatedProgress createdAt={f?.['Created time'] || v.createdTime || v.id}/>}
                {done && (
                  <>
                    <div style={{ padding: '0 14px 12px', display: 'flex', gap: '5px', flexWrap: 'wrap' as const }}>
                      {[`${f.Modulos_detectados||'?'} cápsulas de video`,`${f.Modulos_detectados||'?'} guías de estudio`,'Quiz y glosario','Bibliografía APA'].map((item, i) => (
                        <span key={i} style={{ fontSize: '10px', color: 'var(--ok)', background: 'rgba(0,229,160,.06)', border: '1px solid rgba(0,229,160,.15)', padding: '3px 9px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span style={{ fontSize: '9px', fontWeight: 700 }}>✓</span>{item}
                        </span>
                      ))}
                    </div>
                    {(() => {
                      const tag = etiquetasMap[v.id]
                      return (
                        <div style={{ padding: '0 14px 8px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' as const }}>
                          {tag ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 600, background: `${tag.color}18`, border: `1px solid ${tag.color}40`, color: tag.color }}>
                              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: tag.color, flexShrink: 0 }}/>
                              {tag.texto}
                              <button onClick={() => setEtiquetasMap(prev => { const n = {...prev}; delete n[v.id]; return n })} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', opacity: .6, fontSize: '13px', lineHeight: 1, padding: '0 0 0 2px' }}>×</button>
                            </span>
                          ) : (
                            <button onClick={() => {
                              const txt = prompt('Nombre de la etiqueta:')
                              if (!txt) return
                              const colors = ['#00A8E8','#00E5A0','#A078FF','#FFB020','#E25C5C','#00D4FF']
                              const color = colors[Object.keys(etiquetasMap).length % colors.length]
                              setEtiquetasMap(prev => ({ ...prev, [v.id]: { texto: txt, color } }))
                            }} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 500, background: 'rgba(255,255,255,.04)', border: '1px dashed rgba(255,255,255,.12)', color: 'var(--t3)', cursor: 'pointer' }}>
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                              Etiqueta
                            </button>
                          )}
                        </div>
                      )
                    })()}
                    <FeedbackPanel record={v} modulos={f.Modulos_detectados || 0} />
                  </>
                )}
              </div>
            )
          })}
        </div>
      </main>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:.5} }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes indeterminate { 0%{left:-40%;right:100%} 60%{left:100%;right:-40%} 100%{left:100%;right:-40%} }
      `}</style>
    </div>
  )
}
