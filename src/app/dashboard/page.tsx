'use client'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  PLANS,
  PLAN_COLORS,
  PLAN_BG,
  PLAN_MAX_MINUTOS,
  resolverPlan,
  formatHorasMin,
  type PlanId
} from '@/lib/plans'

// ─────────────────────────────────────────────────────────────
// Dashboard de usuario
//
// Fuente única para nombres/colores/máximos de plan: lib/plans.ts.
// NO redefinir MAX_CREDITOS/PLAN_COLORS aquí — ya estaban con nombres
// viejos (Free/Starter/Professional/Academia) y rompían la barra cuando
// el usuario tenía plan 'premium' o 'estandar' (caían a default 40min).
// ─────────────────────────────────────────────────────────────

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

/** Normaliza el campo Estado de Airtable. Maneja mayúsculas, tildes, espacios. */
function normalizeEstado(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

function isCompletado(estado: unknown): boolean {
  return normalizeEstado(estado) === 'completado'
}

function isEnProceso(estado: unknown): boolean {
  const e = normalizeEstado(estado)
  return e === 'procesando' || e === 'pendiente'
}

function isEnRevision(estado: unknown): boolean {
  const e = normalizeEstado(estado)
  return e === 'en revision' || e === 'revision' || e === 'soporte'
}

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
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)

  const capsulas = Array.from({ length: modulos || 0 }, (_, i) => ({ id: `C${i + 1}` }))

  useEffect(() => {
    const init: FeedbackVideo = {}
    capsulas.forEach(c => { init[c.id] = { val: null, errores: [] } })
    setEstado(init)
  }, [modulos])

  const setVal = (capId: string, val: ValorCorte) =>
    setEstado(prev => ({
      ...prev,
      [capId]: {
        val,
        errores: val === 'bien' ? [] : prev[capId]?.errores ?? []
      }
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
    setErrorEnvio(null)
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
      const r = await fetch('/api/airtable/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record_id: record.id, feedback: resumen })
      })
      if (!r.ok) {
        // FIX: NO marcar como enviado si la API falla (Auditoría punto 14)
        setErrorEnvio('No pudimos guardar tu feedback. Intenta otra vez en unos minutos.')
        setEnviando(false)
        return
      }
      setEnviado(true)
      setAbierto(false)
    } catch {
      setErrorEnvio('No pudimos guardar tu feedback. Verifica tu conexión e intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
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
            Marque cada cápsula. Solo las <span style={{ color: '#e24b4a' }}>Malo</span> necesitan detalle. Puede marcar varios motivos si aplican.
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
                    <p style={{ fontSize: '10px', color: 'var(--t3)', marginBottom: '6px' }}>¿Qué le faltó? (puede marcar varios)</p>
                    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '6px' }}>
                      {ERRORES_CORTE.map(err => {
                        const activo = s.errores.includes(err.id)
                        return (
                          <button
                            key={err.id}
                            onClick={() => toggleError(cap.id, err.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '6px 10px',
                              borderRadius: '7px',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '11px',
                              textAlign: 'left' as const,
                              background: activo ? 'rgba(226,75,75,.15)' : 'rgba(255,255,255,.04)',
                              color: activo ? '#e24b4a' : 'var(--t2)',
                              outline: activo ? '1px solid rgba(226,75,75,.35)' : '1px solid rgba(240,246,252,.08)',
                              fontWeight: activo ? 600 : 400,
                              transition: 'all .15s'
                            }}>
                            <span style={{
                              width: '14px',
                              height: '14px',
                              borderRadius: '3px',
                              border: activo ? '1.5px solid #e24b4a' : '1.5px solid rgba(255,255,255,.2)',
                              background: activo ? '#e24b4a' : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              {activo && (
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                              )}
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
            <p style={{ fontSize: '10px', color: 'var(--t3)', marginBottom: '5px' }}>¿Algo más que quieras contarnos? (opcional)</p>
            <textarea
              value={comentarioGlobal}
              onChange={e => setComentarioGlobal(e.target.value)}
              placeholder="Ej: El docente mencionó datos de contacto al final, o falta contexto al inicio..."
              maxLength={300}
              rows={2}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,.03)',
                border: '1px solid rgba(240,246,252,.08)',
                borderRadius: '7px',
                padding: '8px 10px',
                fontSize: '11px',
                color: 'var(--t1)',
                fontFamily: 'inherit',
                resize: 'vertical' as const,
                outline: 'none'
              }}
            />
            <div style={{ fontSize: '9px', color: 'var(--t3)', textAlign: 'right' as const, marginTop: '2px' }}>
              {comentarioGlobal.length}/300
            </div>
          </div>

          {errorEnvio && (
            <div style={{ marginTop: '10px', padding: '8px 10px', background: 'rgba(226,75,75,.06)', border: '1px solid rgba(226,75,75,.2)', borderRadius: '7px', fontSize: '11px', color: '#e24b4a' }}>
              {errorEnvio}
            </div>
          )}

          <button onClick={enviarFeedback} disabled={!todoRespondido || enviando} style={{ marginTop: '12px', width: '100%', padding: '9px', background: todoRespondido ? 'linear-gradient(135deg,#00A8E8,#00D4FF)' : 'rgba(0,168,232,.15)', color: todoRespondido ? '#000' : 'rgba(255,255,255,.3)', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: todoRespondido ? 'pointer' : 'not-allowed', transition: 'all .2s' }}>
            {enviando ? 'Enviando...' : 'Enviar feedback →'}
          </button>
        </div>
      )}
    </>
  )
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

function AnimatedProgress({ createdAt }: { createdAt: string | null | undefined }) {
  const [msgIdx, setMsgIdx] = React.useState(0)
  React.useEffect(() => {
    // FIX: validar fecha — antes se pasaba v.id como fallback y new Date('recXXX') = Invalid Date
    const parsed = createdAt ? new Date(createdAt).getTime() : NaN
    const base = Number.isFinite(parsed) ? parsed : Date.now()
    setMsgIdx(Math.floor((Date.now() - base) / 20000) % PROGRESS_MSGS.length)
    const interval = setInterval(() => {
      setMsgIdx(prev => (prev + 1) % PROGRESS_MSGS.length)
    }, 20000)
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
        <div style={{ marginTop: '8px', fontSize: '10px', color: 'var(--t3)', lineHeight: 1.4 }}>
          Te avisaremos por correo cuando esté listo.
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
  const [planId, setPlanId] = useState<PlanId>('demo')
  const [creditosMax, setCreditosMax] = useState(PLAN_MAX_MINUTOS.demo)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [descargando, setDescargando] = useState<string | null>(null)
  const [erroresDescarga, setErroresDescarga] = useState<Record<string, string>>({})
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [statsVisible, setStatsVisible] = useState(false)
  const statsRef = useRef<HTMLDivElement>(null)
  const fetchingRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)

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

  // FIX: AbortController + bandera para no acumular requests si la API es lenta (Auditoría punto 18)
  const fetchVideos = useCallback(async () => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    try {
      const r = await fetch('/api/airtable/videos', { signal: ctrl.signal })
      const data = await r.json()
      if (data.records) setVideos(data.records)
    } catch {
      // ignorar AbortError silencioso
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }, [])

  useEffect(() => {
    // FIX: try/catch en JSON.parse de localStorage (Auditoría punto 19)
    let parsed: any = null
    try {
      const u = localStorage.getItem('gisto_user')
      if (!u) { router.push('/login'); return }
      parsed = JSON.parse(u)
    } catch {
      try { localStorage.removeItem('gisto_user') } catch {}
      router.push('/login')
      return
    }

    const planInicial = resolverPlan(parsed.plan)
    setUser(parsed)
    setCreditos(parsed.creditos || 0)
    setPlanId(planInicial)
    setCreditosMax(PLAN_MAX_MINUTOS[planInicial])
    if (parsed.avatarUrl) setAvatarUrl(parsed.avatarUrl)

    // FIX: el servidor manda. Eliminamos Math.min(local, airtable) que dejaba
    // créditos visualmente menores tras una compra (Auditoría puntos 8, 39).
    fetch('/api/airtable/usuario').then(r => r.json()).then(data => {
      if (data.error) return
      const credAirtable = data.creditos || 0
      const planAirtable = resolverPlan(data.plan)
      setCreditos(credAirtable)
      setPlanId(planAirtable)
      setCreditosMax(PLAN_MAX_MINUTOS[planAirtable])
      if (data.avatar_url) setAvatarUrl(data.avatar_url)
      try {
        const updated = { ...parsed, creditos: credAirtable, plan: planAirtable, nombre: data.nombre, avatarUrl: data.avatar_url || '' }
        localStorage.setItem('gisto_user', JSON.stringify(updated))
        setUser(updated)
      } catch {}
    }).catch(() => {})

    fetchVideos()
    const interval = setInterval(fetchVideos, 8000)
    return () => {
      clearInterval(interval)
      abortRef.current?.abort()
    }
  }, [fetchVideos, router])

  async function logout() {
    try { await fetch('/api/auth/logout', { method: 'POST' }) } catch {}
    try { localStorage.removeItem('gisto_user') } catch {}
    router.push('/login')
  }

  async function descargarZip(record: any) {
    const f = record.fields || {}
    const zipKey = f.Zip_Key || f.zip_key
    if (!zipKey && f.Resultado) { window.open(f.Resultado, '_blank'); return }
    if (!zipKey) return
    setDescargando(record.id)
    setErroresDescarga(prev => ({ ...prev, [record.id]: '' }))
    try {
      const r = await fetch('/api/download', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ zip_key: zipKey }) })
      const data = await r.json()
      if (r.ok && data.download_url) {
        window.open(data.download_url, '_blank')
      } else {
        // FIX: no fallar silenciosamente (Auditoría punto 13)
        setErroresDescarga(prev => ({ ...prev, [record.id]: 'No pudimos generar el enlace. Intenta de nuevo o contacta soporte.' }))
      }
    } catch {
      setErroresDescarga(prev => ({ ...prev, [record.id]: 'No pudimos generar el enlace. Intenta de nuevo o contacta soporte.' }))
    } finally {
      setDescargando(null)
    }
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

  const hayProcesando = videos.some(v => isEnProceso(v.fields?.Estado))
  const enProceso = videos.filter(v => isEnProceso(v.fields?.Estado)).length

  // FIX: "Videos procesados" solo cuenta los completados (Auditoría punto 10)
  const completados = videos.filter(v => isCompletado(v.fields?.Estado)).length
  const modulos = videos
    .filter(v => isCompletado(v.fields?.Estado))
    .reduce((a, v) => a + (v.fields?.Modulos_detectados || 0), 0)

  const filtrados = videos.filter(v => {
    const e = v.fields?.Estado
    if (filtro === 'completados') return isCompletado(e)
    if (filtro === 'proceso') return isEnProceso(e)
    return true
  })

  const planActual = PLANS[planId]
  const planLabel = planActual.nombre
  const planColor = PLAN_COLORS[planId]
  const planBgColor = PLAN_BG[planId]
  const inicial = user?.nombre?.[0]?.toUpperCase() || 'U'

  // FIX: si créditos = 0 la barra debe ser 0%, no Math.max(2, ...) que dejaba
  // barra visualmente llena cuando saldo era 0 (Auditoría punto 9)
  const porcentaje = creditos <= 0 || creditosMax <= 0
    ? 0
    : Math.min(100, (creditos / creditosMax) * 100)

  const NavItem = ({ href, label, icon, active, badge }: any) => (
    <Link href={href} onClick={() => isMobile && setSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', color: active ? 'var(--t1)' : 'var(--t2)', textDecoration: 'none', borderRadius: '9px', marginBottom: '2px', fontSize: '14px', fontWeight: 500, background: active ? 'rgba(0,168,232,0.08)' : 'transparent', border: active ? '1px solid var(--b)' : '1px solid transparent', transition: 'all .2s' }}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={active ? '#00A8E8' : '#667788'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={icon}/></svg>
      {label}
      {badge ? <span style={{ marginLeft: 'auto', background: 'var(--warn)', color: '#000', fontSize: '10px', fontWeight: 800, padding: '1px 7px', borderRadius: '100px' }}>{badge}</span> : null}
    </Link>
  )

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
        <NavItem href="/perfil" label="Mi perfil" icon="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" active={false}/>
        <NavItem href="/planes" label="Planes y pagos" icon="M1 4h22v16H1zM1 10h22" active={false}/>
        <div style={{ marginTop: 'auto', background: 'rgba(0,168,232,.06)', border: '1px solid var(--b)', borderRadius: '12px', padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--t2)', marginBottom: '8px' }}>Créditos disponibles</div>
          <div style={{ height: '6px', background: 'rgba(0,168,232,.12)', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px', position: 'relative' as const }}>
            <div style={{ height: '100%', width: `${porcentaje}%`, background: 'linear-gradient(90deg,#00A8E8,#00D4FF)', borderRadius: '3px', transition: 'width .5s ease', boxShadow: porcentaje > 0 ? '0 0 6px rgba(0,168,232,.4)' : 'none' }}/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '12px' }}>
            <strong style={{ color: '#00A8E8', fontSize: '15px' }}>{creditos} min</strong>
            <span style={{ color: '#667788' }}>/ {creditosMax} min</span>
          </div>
          <div style={{ marginTop: '6px' }}>
            <Link href="/planes" style={{ textDecoration: 'none' }}>
              <span style={{ display: 'inline-block', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '100px', color: planColor, background: planBgColor, border: `1px solid ${planColor}30` }}>{planLabel}</span>
            </Link>
          </div>
        </div>
        <Link href="/perfil" onClick={() => isMobile && setSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 12px 0', borderTop: '1px solid var(--b)', marginTop: '12px', textDecoration: 'none', cursor: 'pointer' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '2px solid var(--b)' }}>
            {avatarUrl ? <img src={avatarUrl} alt={user?.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#00A8E8,#00D4FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cabinet Grotesk',sans-serif", fontWeight: 800, fontSize: '13px', color: '#000' }}>{inicial}</div>}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{user?.nombre || 'Usuario'}</div>
            <div style={{ fontSize: '11px', color: 'var(--t2)' }}>{planLabel}</div>
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
          {isMobile && <Link href="/planes" style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', textDecoration: 'none', gap: '3px' }}><span style={{ fontSize: '13px', fontWeight: 800, color: '#00A8E8' }}>{creditos} min</span><div style={{ width: '60px', height: '3px', background: 'rgba(0,168,232,.15)', borderRadius: '2px', overflow: 'hidden' }}><div style={{ height: '100%', width: `${porcentaje}%`, background: 'linear-gradient(90deg,#00A8E8,#00D4FF)', borderRadius: '2px' }}/></div></Link>}
          {!isMobile && <Link href="/upload" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg,#00A8E8,#00D4FF)', color: '#000', padding: '9px 18px', borderRadius: '9px', fontWeight: 800, fontSize: '13px', textDecoration: 'none', boxShadow: '0 4px 14px rgba(0,168,232,.3)' }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Nuevo video</Link>}
        </div>

        <div style={{ padding: isMobile ? '14px' : '24px 28px', flex: 1 }}>
          <div ref={statsRef} style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: isMobile ? '10px' : '14px', marginBottom: isMobile ? '14px' : '24px' }}>
            {[
              { label: 'Créditos disponibles', sublabel: planLabel, color: planColor, icon: 'M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 4v6l4 2', value: loading ? null : creditos, suffix: ' min', extra: (<div style={{ marginTop: '10px' }}><div style={{ height: '3px', background: 'rgba(255,255,255,0.07)', borderRadius: '2px', overflow: 'hidden' }}><div style={{ height: '100%', width: `${porcentaje}%`, background: planColor, borderRadius: '2px', transition: 'width .8s ease' }}/></div><div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px', fontSize: '10px', color: '#667788' }}><span style={{ fontWeight: 700, color: planColor }}>{creditos} min</span><span>{creditosMax} min</span></div></div>) },
              { label: 'Videos procesados', sublabel: 'Completados', color: '#00E5A0', icon: 'M23 7l-7 5 7 5V7zM1 5h15a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H1z', value: loading ? null : completados, suffix: '', extra: null },
              { label: 'Módulos generados', sublabel: 'En tus cursos completados', color: '#A078FF', icon: 'M22 12h-4l-3 9L9 3l-3 9H2', value: loading ? null : modulos, suffix: '', extra: null },
              { label: enProceso > 0 ? 'Videos en proceso' : 'Cola de proceso', sublabel: enProceso > 0 ? 'Motor activo' : 'Motor libre', color: enProceso > 0 ? '#FFB020' : '#00E5A0', icon: enProceso > 0 ? 'M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 4v6l4 2' : 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3', value: loading ? null : enProceso, suffix: '', extra: null }
            ].map((stat: any, i: number) => (
              <div key={i} style={{ background: 'var(--s1)', border: '1px solid var(--b)', borderRadius: '14px', padding: isMobile ? '14px' : '18px', opacity: statsVisible ? 1 : 0, transform: statsVisible ? 'translateY(0)' : 'translateY(10px)', transition: `all .5s ease ${i * 0.08}s` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--t2)', fontWeight: 600 }}>{stat.label}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={stat.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={stat.icon}/></svg>
                </div>
                <div style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontSize: isMobile ? '24px' : '30px', fontWeight: 900, color: stat.color, letterSpacing: '-1px', lineHeight: 1 }}>
                  {stat.value === null ? '—' : <AnimatedNumber value={stat.value} suffix={stat.suffix}/>}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--t3)', marginTop: '4px' }}>{stat.sublabel}</div>
                {stat.extra}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' as const }}>
            {[{ id: 'todos', label: 'Todos' }, { id: 'completados', label: isMobile ? 'OK' : 'Completados' }, { id: 'proceso', label: isMobile ? 'Activos' : 'En proceso' }].map(f => (
              <button key={f.id} onClick={() => setFiltro(f.id)} style={{ padding: '7px 14px', borderRadius: '9px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', background: filtro === f.id ? '#00A8E8' : 'rgba(255,255,255,.04)', color: filtro === f.id ? '#000' : 'var(--t2)', border: filtro === f.id ? 'none' : '1px solid var(--b)', transition: 'all .2s' }}>
                {f.label}
              </button>
            ))}
          </div>

          {!loading && filtrados.length === 0 && (
            <div style={{ textAlign: 'center', padding: isMobile ? '36px 20px' : '56px 24px', background: 'var(--s1)', borderRadius: '16px', border: '1px solid var(--b)' }}>
              <div style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontSize: isMobile ? '15px' : '18px', fontWeight: 800, marginBottom: '8px' }}>{filtro === 'proceso' ? 'Sin videos en proceso' : filtro === 'completados' ? 'Sin videos completados' : 'Tu primer curso está a un video de distancia'}</div>
              {filtro === 'todos' && <Link href="/upload" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg,#00A8E8,#00D4FF)', color: '#000', padding: '11px 22px', borderRadius: '9px', fontWeight: 700, fontSize: '14px', textDecoration: 'none', marginTop: '12px' }}>Subir mi primer video →</Link>}
            </div>
          )}

          {filtrados.map((v: any) => {
            const f = v.fields || {}
            const estado = f.Estado || 'Pendiente'
            const done = isCompletado(estado)
            const processing = isEnProceso(estado)
            const enRevision = isEnRevision(estado)
            const durText = formatDuracion(f)
            const errorDescarga = erroresDescarga[v.id]
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
                    <span style={{ padding: '4px 9px', borderRadius: '100px', fontSize: '10px', fontWeight: 700, background: done ? 'rgba(0,229,160,.1)' : processing ? 'rgba(255,176,32,.1)' : enRevision ? 'rgba(160,120,255,.1)' : 'rgba(255,255,255,.05)', color: done ? 'var(--ok)' : processing ? 'var(--warn)' : enRevision ? '#A078FF' : 'var(--t2)', border: `1px solid ${done ? 'rgba(0,229,160,.25)' : processing ? 'rgba(255,176,32,.25)' : enRevision ? 'rgba(160,120,255,.25)' : 'rgba(255,255,255,.1)'}` }}>{enRevision ? 'Revisión de calidad' : estado}</span>
                    {done && (f.Resultado || f.Zip_Key) && (
                      <button onClick={() => descargarZip(v)} disabled={descargando === v.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'transparent', border: '1px solid var(--b)', color: 'var(--t2)', padding: '6px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', opacity: descargando === v.id ? 0.5 : 1 }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                        {descargando === v.id ? '...' : 'ZIP'}
                      </button>
                    )}
                  </div>
                </div>
                {errorDescarga && (
                  <div style={{ padding: '0 16px 12px', fontSize: '11px', color: '#e24b4a' }}>
                    {errorDescarga}
                  </div>
                )}
                {processing && <AnimatedProgress createdAt={f?.['Created time'] || v.createdTime || null}/>}
                {enRevision && (
                  <div style={{ padding: '0 16px 14px' }}>
                    <div style={{ background: 'rgba(160,120,255,.05)', border: '1px solid rgba(160,120,255,.15)', borderRadius: '10px', padding: '12px 14px', fontSize: '12px', color: 'var(--t2)', lineHeight: 1.5 }}>
                      Estamos haciendo una revisión final de calidad. Te avisaremos por correo cuando esté listo. No necesitas hacer nada.
                    </div>
                  </div>
                )}
                {done && (
                  <>
                    <div style={{ padding: '0 14px 12px', display: 'flex', gap: '5px', flexWrap: 'wrap' as const }}>
                      {[`${f.Modulos_detectados||'?'} cápsulas de video`,`${f.Modulos_detectados||'?'} guías de estudio`,'Quiz y glosario','Bibliografía APA'].map((item, i) => (
                        <span key={i} style={{ fontSize: '10px', color: 'var(--ok)', background: 'rgba(0,229,160,.06)', border: '1px solid rgba(0,229,160,.15)', padding: '3px 9px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span style={{ fontSize: '9px', fontWeight: 700 }}>✓</span>{item}
                        </span>
                      ))}
                    </div>
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
