'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
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
// /upload — auditado v19.8
//
// Cambios clave respecto a la versión anterior:
//
// 1. NO LLAMA A AIRTABLE DIRECTO desde el cliente. La versión vieja usaba
//    NEXT_PUBLIC_AIRTABLE_API_KEY, lo que exponía la key a cualquiera
//    inspeccionando el bundle. Ahora todas las escrituras a Airtable van por
//    /api/airtable/videos (server-side con AIRTABLE_API_KEY privada).
//
// 2. NO DESCUENTA CRÉDITOS EN EL CLIENTE. El descuento lo hace el motor
//    backend vía reserva (creditos_minutos -> creditos_reservados). El
//    frontend solo refleja el saldo. Tocar localStorage manualmente
//    introducía ventanas de inconsistencia.
//
// 3. USA s3_key DEVUELTO POR /get-upload-url. El motor v19.8 descarga vía
//    boto3 sin pasar URL pública. Mantenemos public_url como fallback para
//    casos de Drive/Dropbox/links externos.
//
// 4. AUTH EN LLAMADAS A RAILWAY: todas las llamadas a Railway pasan por
//    /api/gisto/* (API routes Next.js que añaden X-Gisto-Token server-side).
//    Sin esto, los endpoints v19.7+ rechazan con 401.
//
// 5. CHECKBOX SRT solo visible para Premium/Empresarial.
//    Setea `Generar_SRT` boolean en el record Videos.
//
// 6. VALIDACIÓN MIME estricta + tamaño máximo 5 GiB antes de iniciar upload.
//
// 7. PLAN COMPATIBILITY: usa resolverPlan() que tolera nombres viejos
//    (Free/Starter/Professional/Academia) por compatibilidad histórica.
// ─────────────────────────────────────────────────────────────

const PASOS = [
  { titulo:'Sube tu grabación', desc:'MP4, MOV, AVI o link de Drive/Dropbox', icon:'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12' },
  { titulo:'GISTO analiza', desc:'Transcripción + estructura pedagógica automática', icon:'M22 12h-4l-3 9L9 3l-3 9H2' },
  { titulo:'Descarga tu curso', desc:'ZIP con cápsulas, Word, quiz, glosario y bibliografía', icon:'M21 8l-8-5-8 5v10l8 5 8-5V8z' },
]
const ENTREGABLES = [
  { icon:'M23 7l-7 5 7 5V7zM1 5h15a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H1z', label:'Cápsulas de video', color:'#E25C5C', bg:'rgba(226,92,92,.08)', border:'rgba(226,92,92,.18)' },
  { icon:'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6', label:'Guía de estudio Word', color:'#4A90D9', bg:'rgba(74,144,217,.08)', border:'rgba(74,144,217,.18)' },
  { icon:'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11', label:'Quiz multinivel', color:'#00E5A0', bg:'rgba(0,229,160,.08)', border:'rgba(0,229,160,.18)' },
  { icon:'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z', label:'Glosario técnico', color:'#00A8E8', bg:'rgba(0,168,232,.08)', border:'rgba(0,168,232,.18)' },
  { icon:'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z', label:'Bibliografía APA', color:'#FFB020', bg:'rgba(255,176,32,.08)', border:'rgba(255,176,32,.18)' },
  { icon:'M21 8l-8-5-8 5v10l8 5 8-5V8z', label:'ZIP para tu LMS', color:'#A078FF', bg:'rgba(160,120,255,.08)', border:'rgba(160,120,255,.18)' },
]

// MIME types aceptados (debe coincidir con MIME_MAP del backend v19.8)
const MIME_PERMITIDOS: Record<string, string> = {
  mp4:  'video/mp4',
  mov:  'video/quicktime',
  avi:  'video/x-msvideo',
  mkv:  'video/x-matroska',
  webm: 'video/webm',
  wmv:  'video/x-ms-wmv',
  m4v:  'video/x-m4v',
  flv:  'video/x-flv',
}
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 * 1024  // 5 GiB (alineado con backend v19.7)

type Step = 'form' | 'uploading' | 'queued' | 'error'

function getMimeYExt(file: File): { ext: string, mime: string, ok: boolean } {
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  const mime = MIME_PERMITIDOS[ext] || ''
  return { ext, mime, ok: !!mime }
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
  const [tipoContenido, setTipoContenido] = useState<string[]>([])
  const [generarSrt, setGenerarSrt] = useState(false)

  const toggleTipo = (valor: string) => {
    setTipoContenido(prev =>
      prev.includes(valor) ? prev.filter(t => t !== valor) : [...prev, valor]
    )
  }

  const [mantenerInteracciones, setMantenerInteracciones] = useState(false)
  const [permitirCapsulasLargas, setPermitirCapsulasLargas] = useState(false)
  const [btnHover, setBtnHover] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [creditos, setCreditos] = useState(0)
  const [planId, setPlanId] = useState<PlanId>('demo')
  const [creditosMax, setCreditosMax] = useState(PLAN_MAX_MINUTOS.demo)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [historial, setHistorial] = useState<any[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    // Lectura defensiva de localStorage (heredado del bug del dashboard viejo)
    let parsed: any = null
    try {
      const u = localStorage.getItem('gisto_user')
      if (!u) { router.push('/login'); return }
      parsed = JSON.parse(u)
    } catch {
      try { localStorage.removeItem('gisto_user') } catch {}
      router.push('/login'); return
    }
    const pi = resolverPlan(parsed.plan)
    setUser(parsed)
    setCreditos(parsed.creditos || 0)
    setPlanId(pi)
    setCreditosMax(PLAN_MAX_MINUTOS[pi])
    if (parsed.avatarUrl) setAvatarUrl(parsed.avatarUrl)

    fetch('/api/airtable/usuario').then(r => r.json()).then(data => {
      if (data.error) return
      const cred = data.creditos || 0
      const piServer = resolverPlan(data.plan)
      setCreditos(cred)
      setPlanId(piServer)
      setCreditosMax(PLAN_MAX_MINUTOS[piServer])
      if (data.avatar_url) setAvatarUrl(data.avatar_url)
      try {
        const updated = { ...parsed, creditos: cred, plan: piServer, nombre: data.nombre, avatarUrl: data.avatar_url || '' }
        localStorage.setItem('gisto_user', JSON.stringify(updated))
        setUser(updated)
      } catch {}
    }).catch(() => {})

    fetch('/api/airtable/videos').then(r => r.json()).then(data => {
      if (data.records) setHistorial(data.records.slice(0, 3))
    }).catch(() => {})
  }, [router])

  // ── Plan habilita SRT? ─────────────────────────────────────────────
  const planActual = PLANS[planId]
  const puedeGenerarSrt = !!(planActual && (planId === 'premium' || planId === 'empresarial'))

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDrag(false)
    const f = e.dataTransfer.files[0]
    if (!f) return
    const { ok, ext } = getMimeYExt(f)
    if (!ok) { setError(`Formato .${ext || '?'} no soportado. Usa MP4, MOV, AVI, MKV, WEBM, WMV, M4V o FLV.`); return }
    if (f.size > MAX_UPLOAD_BYTES) {
      setError(`Archivo demasiado grande (${(f.size/1024/1024/1024).toFixed(1)} GiB). Máximo 5 GiB.`); return
    }
    setError(''); setArchivo(f)
  }, [])

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const { ok, ext } = getMimeYExt(f)
    if (!ok) { setError(`Formato .${ext || '?'} no soportado. Usa MP4, MOV, AVI, MKV, WEBM, WMV, M4V o FLV.`); return }
    if (f.size > MAX_UPLOAD_BYTES) {
      setError(`Archivo demasiado grande (${(f.size/1024/1024/1024).toFixed(1)} GiB). Máximo 5 GiB.`); return
    }
    setError(''); setArchivo(f)
  }

  /**
   * Sube archivo a S3 vía presigned URL del backend.
   * Devuelve { publicUrl, s3Key } para que el motor descargue vía boto3.
   */
  async function subirS3(file: File): Promise<{ publicUrl: string, s3Key: string }> {
    const { mime } = getMimeYExt(file)
    const r = await fetch('/api/gisto/get-upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: file.name, content_type: mime }),
    })
    if (!r.ok) {
      const e = await r.json().catch(() => ({}))
      throw new Error(e.error || 'No se pudo iniciar la subida')
    }
    const { upload_url, public_url, s3_key } = await r.json()
    await new Promise<void>((res, rej) => {
      const xhr = new XMLHttpRequest()
      xhr.upload.addEventListener('progress', e => {
        if (e.lengthComputable) setProgreso(Math.round(e.loaded / e.total * 95))
      })
      xhr.addEventListener('load', () => xhr.status === 200 ? res() : rej(new Error(`Error S3 (${xhr.status})`)))
      xhr.addEventListener('error', () => rej(new Error('Error de conexión durante la subida')))
      xhr.addEventListener('timeout', () => rej(new Error('Tiempo de subida excedido')))
      xhr.timeout = 600000  // 10 min
      xhr.open('PUT', upload_url)
      xhr.setRequestHeader('Content-Type', mime)
      xhr.send(file)
    })
    return { publicUrl: public_url, s3Key: s3_key || '' }
  }

  async function handleProcesar() {
    setError('')
    if (tipoContenido.length === 0) {
      setError('Selecciona al menos un tipo de contenido del video'); return
    }
    if (tab === 'link') {
      if (!url.startsWith('http')) { setError('Ingresa un link válido de Drive o Dropbox'); return }
      setStep('uploading')
      await guardarYProcesar({ vUrl: url })
    } else {
      if (!archivo) { setError('Selecciona un archivo de video'); return }
      setStep('uploading')
      try {
        const { publicUrl, s3Key } = await subirS3(archivo)
        await guardarYProcesar({ vUrl: publicUrl, s3Key })
      } catch (e: any) {
        setError(e.message || 'Error subiendo el archivo')
        setStep('error')
      }
    }
  }

  /**
   * Crea el record en Airtable Videos (vía API route server-side) y dispara
   * el procesamiento. NO descuenta créditos en cliente: el motor v19.8 hace
   * la reserva atómica y refleja en Airtable.
   */
  async function guardarYProcesar({ vUrl, s3Key }: { vUrl: string, s3Key?: string }) {
    try {
      const userStr = localStorage.getItem('gisto_user')
      if (!userStr) { setError('Debes iniciar sesión'); setStep('error'); return }
      let userData: any = null
      try { userData = JSON.parse(userStr) } catch { setError('Sesión inválida. Vuelve a iniciar sesión.'); setStep('error'); return }

      // 1. Crear record en Airtable (vía API route — NO llamamos a Airtable directo desde el cliente)
      const crearRes = await fetch('/api/airtable/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            URL: vUrl,
            S3_Key: s3Key || '',
            VideoID: nombre || `Video-${Date.now()}`,
            Estado: 'Pendiente',
            Usuario_Email: userData.email || '',
            Tipo_Contenido: tipoContenido,
            Mantener_Interacciones: mantenerInteracciones,
            Permitir_Capsulas_Largas: permitirCapsulasLargas,
            Generar_SRT: puedeGenerarSrt && generarSrt,
          },
        }),
      })
      if (!crearRes.ok) {
        const e = await crearRes.json().catch(() => ({}))
        throw new Error(e.error || 'No se pudo registrar el video')
      }
      const crearData = await crearRes.json()
      const recordId = crearData.id || crearData.record_id || (crearData.records?.[0]?.id) || ''

      // 2. Disparar procesamiento (vía API route que añade X-Gisto-Token)
      const procRes = await fetch('/api/gisto/procesar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_url: vUrl,
          s3_key:    s3Key || '',
          record_id: recordId,
        }),
      })
      if (!procRes.ok) {
        const e = await procRes.json().catch(() => ({}))
        // El record en Airtable ya está, así que el cliente puede ver "Pendiente"
        // aunque el dispatch falle. No marcamos como error fatal — un retry desde
        // dashboard o un re-procesamiento manual desde soporte lo resuelve.
        console.warn('[upload] dispatch a /procesar falló:', e)
      }

      setStep('queued')
    } catch (e: any) {
      setError(e.message || 'Error inesperado'); setStep('error')
    }
  }

  async function logout() {
    try { await fetch('/api/auth/logout', { method: 'POST' }) } catch {}
    try { localStorage.removeItem('gisto_user') } catch {}
    router.push('/login')
  }

  const inicial = user?.nombre?.[0]?.toUpperCase() || 'U'
  // FIX dashboard: si créditos = 0, barra a 0% (no Math.max(2,...) que mentía visualmente)
  const porcentaje = creditos <= 0 || creditosMax <= 0
    ? 0
    : Math.min(100, (creditos / creditosMax) * 100)
  const planLabel = planActual?.nombre || 'Demo'
  const planColor = PLAN_COLORS[planId]
  const planBgColor = PLAN_BG[planId]

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(12,16,24,0.8)',
    border: '1px solid rgba(240,246,252,0.12)',
    borderRadius: '10px', padding: '11px 14px',
    color: 'var(--t1)', fontSize: '14px', outline: 'none',
    fontFamily: 'inherit', transition: 'all .2s',
    WebkitAppearance: 'none', appearance: 'none',
  }

  const NavItem = ({ href, label, icon, active }: any) => (
    <Link href={href} onClick={() => isMobile && setSidebarOpen(false)} style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '10px 12px', color: active ? 'var(--t1)' : 'var(--t2)',
      textDecoration: 'none', borderRadius: '9px', marginBottom: '2px',
      fontSize: '14px', fontWeight: 500,
      background: active ? 'rgba(0,168,232,0.08)' : 'transparent',
      border: active ? '1px solid var(--b)' : '1px solid transparent', transition: 'all .2s',
    }}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
        stroke={active ? '#00A8E8' : 'var(--t3)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d={icon}/>
      </svg>
      {label}
    </Link>
  )

  // ── Pantalla de éxito tras dispatch ──────────────────────────────────
  if (step === 'queued') return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ textAlign: 'center', maxWidth: '480px', width: '100%' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(0,229,160,.1)', border: '2px solid rgba(0,229,160,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 0 32px rgba(0,229,160,.15)' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2 style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontSize: '28px', fontWeight: 900, letterSpacing: '-1px', marginBottom: '10px' }}>¡Video en cola!</h2>
        <p style={{ fontSize: '14px', color: 'var(--t2)', lineHeight: 1.7, marginBottom: '20px' }}>
          Te avisaremos por correo cuando esté listo.<br/>Puedes seguir el progreso en tu dashboard.
        </p>
        <div style={{ background: 'var(--s1)', border: '1px solid var(--b)', borderRadius: '14px', padding: '16px', marginBottom: '20px', textAlign: 'left' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--t3)', letterSpacing: '2px', textTransform: 'uppercase' as const, marginBottom: '12px' }}>Recibirás en tu dashboard</div>
          {ENTREGABLES.map((e, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--t2)', marginBottom: i < ENTREGABLES.length - 1 ? '9px' : 0 }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: e.bg, border: `1px solid ${e.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={e.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={e.icon}/></svg>
              </div>
              {e.label}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const, justifyContent: 'center' }}>
          <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg,#00A8E8,#00D4FF)', color: '#000', padding: '11px 22px', borderRadius: '9px', fontWeight: 700, fontSize: '14px', textDecoration: 'none' }}>
            Ver mi dashboard →
          </Link>
          <button onClick={() => { setStep('form'); setUrl(''); setArchivo(null); setNombre(''); setProgreso(0); setTipoContenido([]); setGenerarSrt(false) }} style={{ background: 'transparent', color: 'var(--t1)', padding: '11px 22px', borderRadius: '9px', fontWeight: 600, fontSize: '14px', border: '1px solid var(--b)', cursor: 'pointer' }}>
            Subir otro video
          </button>
        </div>
      </div>
    </div>
  )

  // ── Pantalla de subida en progreso ───────────────────────────────────
  if (step === 'uploading') return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ textAlign: 'center', maxWidth: '420px', width: '100%' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(0,168,232,.1)', border: '2px solid rgba(0,168,232,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 0 32px rgba(0,168,232,.15)' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00A8E8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 2s linear infinite' }}>
            <line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/>
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
            <line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
          </svg>
        </div>
        <h2 style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontSize: '22px', fontWeight: 900, marginBottom: '8px' }}>Subiendo tu video...</h2>
        <p style={{ fontSize: '13px', color: 'var(--t2)', marginBottom: '20px' }}>
          No cierres esta pestaña. Te llevamos al dashboard cuando termine.
        </p>
        <div style={{ height: '6px', background: 'rgba(0,168,232,.12)', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
          <div style={{ height: '100%', width: `${progreso}%`, background: 'linear-gradient(90deg,#00A8E8,#00D4FF)', borderRadius: '3px', transition: 'width .3s ease', boxShadow: '0 0 10px rgba(0,168,232,.5)' }}/>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--t3)', fontFamily: 'monospace' }}>{progreso}%</div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  // ── Pantalla de error ────────────────────────────────────────────────
  if (step === 'error') return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ textAlign: 'center', maxWidth: '420px', width: '100%' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(226,75,75,.1)', border: '2px solid rgba(226,75,75,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#e24b4a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </div>
        <h2 style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>No se pudo procesar</h2>
        <p style={{ fontSize: '13px', color: 'var(--t2)', marginBottom: '20px', lineHeight: 1.5 }}>{error || 'Ocurrió un error inesperado.'}</p>
        <button onClick={() => { setStep('form'); setError('') }} style={{ background: 'linear-gradient(135deg,#00A8E8,#00D4FF)', color: '#000', padding: '11px 22px', borderRadius: '9px', fontWeight: 700, fontSize: '14px', border: 'none', cursor: 'pointer' }}>
          Volver a intentar
        </button>
      </div>
    </div>
  )

  // ── Form principal ────────────────────────────────────────────────────
  const TIPOS = [
    { id: 'Diapositivas', label: 'Diapositivas / slides', desc: 'PPT, Keynote, Google Slides' },
    { id: 'Pizarra',      label: 'Pizarra / docente',     desc: 'Docente al frente, pizarra, gestos' },
    { id: 'Demostracion', label: 'Demostración práctica', desc: 'Software, manualidad, procedimiento' },
    { id: 'Entrevista',   label: 'Entrevista / panel',    desc: 'Conversación entre 2+ personas' },
  ]

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', position: 'relative' as const, zIndex: 1 }}>
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 99 }}/>
      )}
      <aside style={{
        width: '260px', background: 'var(--s1)', borderRight: '1px solid var(--b)',
        padding: '20px 16px', display: 'flex', flexDirection: 'column' as const, flexShrink: 0,
        ...(isMobile ? {
          position: 'fixed' as const, top: 0, left: 0, bottom: 0, zIndex: 100,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform .3s ease',
          boxShadow: sidebarOpen ? '4px 0 32px rgba(0,0,0,.6)' : 'none',
        } : { position: 'relative' as const }),
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', marginBottom: '36px' }}>
          <img src="/isotipo.png" alt="GISTO" style={{ height: '52px', width: 'auto', objectFit: 'contain' }}/>
          <span style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontWeight: 900, fontSize: '18px', color: 'var(--t1)' }}>
            THE <span style={{ color: '#00A8E8' }}>GISTO</span>
          </span>
        </Link>
        <NavItem href="/dashboard" label="Dashboard" icon="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" active={false}/>
        <NavItem href="/upload" label="Subir video" icon="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" active={true}/>
        <NavItem href="/perfil" label="Mi perfil" icon="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" active={false}/>
        <NavItem href="/planes" label="Planes y pagos" icon="M1 4h22v16H1zM1 10h22" active={false}/>

        <div style={{ marginTop: 'auto', background: 'rgba(0,168,232,.06)', border: '1px solid var(--b)', borderRadius: '12px', padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--t2)', marginBottom: '8px' }}>Créditos disponibles</div>
          <div style={{ height: '6px', background: 'rgba(0,168,232,.12)', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
            <div style={{ height: '100%', width: `${porcentaje}%`, background: 'linear-gradient(90deg,#00A8E8,#00D4FF)', borderRadius: '3px', transition: 'width .5s ease' }}/>
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
        <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', color: 'var(--err)', background: 'none', border: 'none', borderRadius: '9px', marginTop: '12px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', width: '100%' }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          Cerrar sesión
        </button>
      </aside>

      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' as const, minWidth: 0 }}>
        {isMobile && (
          <div style={{
            position: 'sticky' as const, top: 0, zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', background: 'rgba(6,8,16,.95)',
            backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--b)', flexShrink: 0,
          }}>
            <button onClick={() => setSidebarOpen(v => !v)} style={{ background: 'rgba(255,255,255,.06)', border: '1px solid var(--b)', borderRadius: '8px', color: 'var(--t1)', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <span style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontWeight: 800, fontSize: '15px' }}>Subir video</span>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#00A8E8' }}>{creditos} min</span>
          </div>
        )}

        <div style={{ padding: isMobile ? '16px' : '32px 40px', flex: 1 }}>
          <div style={{ maxWidth: '780px', margin: '0 auto' }}>
            <div style={{ marginBottom: '24px' }}>
              <h1 style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontSize: isMobile ? '22px' : '28px', fontWeight: 900, letterSpacing: '-1px', marginBottom: '6px' }}>Convierte tu clase grabada en un curso completo</h1>
              <p style={{ fontSize: '14px', color: 'var(--t2)', lineHeight: 1.5 }}>Sube un video de Drive, Dropbox o tu computadora. Te llegará el ZIP listo para tu LMS.</p>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <button onClick={() => setTab('link')} style={{ flex: 1, padding: '11px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', background: tab === 'link' ? '#00A8E8' : 'rgba(255,255,255,.04)', color: tab === 'link' ? '#000' : 'var(--t2)', border: tab === 'link' ? 'none' : '1px solid var(--b)' }}>
                Link (Drive / Dropbox)
              </button>
              <button onClick={() => setTab('file')} style={{ flex: 1, padding: '11px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', background: tab === 'file' ? '#00A8E8' : 'rgba(255,255,255,.04)', color: tab === 'file' ? '#000' : 'var(--t2)', border: tab === 'file' ? 'none' : '1px solid var(--b)' }}>
                Subir archivo
              </button>
            </div>

            {tab === 'link' ? (
              <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://drive.google.com/file/d/..." style={inputStyle}/>
            ) : (
              <div
                onDragOver={e => { e.preventDefault(); setDrag(true) }}
                onDragLeave={() => setDrag(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                style={{
                  padding: '32px 20px', borderRadius: '12px',
                  border: `2px dashed ${drag ? '#00A8E8' : 'var(--b)'}`,
                  background: drag ? 'rgba(0,168,232,.05)' : 'rgba(12,16,24,.5)',
                  textAlign: 'center', cursor: 'pointer', transition: 'all .2s',
                }}>
                {archivo ? (
                  <>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--t1)', marginBottom: '4px' }}>{archivo.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--t3)' }}>{(archivo.size/1024/1024).toFixed(1)} MB · clic para cambiar</div>
                  </>
                ) : (
                  <>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 8px' }}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                    </svg>
                    <div style={{ fontSize: '14px', color: 'var(--t2)', marginBottom: '4px' }}>Arrastra el archivo o clic para seleccionar</div>
                    <div style={{ fontSize: '11px', color: 'var(--t3)' }}>MP4, MOV, AVI, MKV, WEBM, WMV, M4V, FLV · máximo 5 GiB</div>
                  </>
                )}
                <input ref={fileRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={onPickFile}/>
              </div>
            )}

            <div style={{ marginTop: '16px' }}>
              <label style={{ fontSize: '12px', color: 'var(--t2)', marginBottom: '6px', display: 'block' }}>Nombre del curso (opcional)</label>
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Contabilidad financiera básica" style={inputStyle} maxLength={80}/>
            </div>

            <div style={{ marginTop: '20px' }}>
              <label style={{ fontSize: '12px', color: 'var(--t2)', marginBottom: '8px', display: 'block' }}>Tipo de contenido (puedes marcar varios)</label>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '8px' }}>
                {TIPOS.map(t => {
                  const activo = tipoContenido.includes(t.id)
                  return (
                    <button key={t.id} onClick={() => toggleTipo(t.id)} style={{
                      display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px',
                      borderRadius: '10px', cursor: 'pointer', textAlign: 'left' as const,
                      background: activo ? 'rgba(0,168,232,.08)' : 'rgba(12,16,24,.5)',
                      border: activo ? '1px solid rgba(0,168,232,.4)' : '1px solid var(--b)',
                      transition: 'all .2s',
                    }}>
                      <span style={{
                        width: '16px', height: '16px', borderRadius: '4px',
                        border: activo ? '1.5px solid #00A8E8' : '1.5px solid rgba(255,255,255,.2)',
                        background: activo ? '#00A8E8' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px',
                      }}>
                        {activo && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                      </span>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t1)' }}>{t.label}</div>
                        <div style={{ fontSize: '11px', color: 'var(--t3)' }}>{t.desc}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ marginTop: '20px', padding: '14px 16px', background: 'rgba(255,255,255,.02)', border: '1px solid var(--b)', borderRadius: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t3)', letterSpacing: '1.5px', textTransform: 'uppercase' as const, marginBottom: '10px' }}>Opciones avanzadas</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '8px' }}>
                <input type="checkbox" checked={mantenerInteracciones} onChange={e => setMantenerInteracciones(e.target.checked)}/>
                <span style={{ fontSize: '13px', color: 'var(--t2)' }}>Mantener interacciones con estudiantes (no cortar preguntas del aula)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: puedeGenerarSrt ? '8px' : 0 }}>
                <input type="checkbox" checked={permitirCapsulasLargas} onChange={e => setPermitirCapsulasLargas(e.target.checked)}/>
                <span style={{ fontSize: '13px', color: 'var(--t2)' }}>Permitir cápsulas más largas de lo habitual (hasta 25 min)</span>
              </label>
              {puedeGenerarSrt && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={generarSrt} onChange={e => setGenerarSrt(e.target.checked)}/>
                  <span style={{ fontSize: '13px', color: 'var(--t2)' }}>
                    Generar subtítulos SRT por cápsula
                    <span style={{ fontSize: '10px', color: planColor, marginLeft: '6px', fontWeight: 700 }}>{planLabel.toUpperCase()}</span>
                  </span>
                </label>
              )}
            </div>

            {error && (
              <div style={{ marginTop: '14px', padding: '11px 14px', background: 'rgba(226,75,75,.06)', border: '1px solid rgba(226,75,75,.2)', borderRadius: '10px', fontSize: '13px', color: '#e24b4a' }}>
                {error}
              </div>
            )}

            <button
              onClick={handleProcesar}
              onMouseEnter={() => setBtnHover(true)}
              onMouseLeave={() => setBtnHover(false)}
              style={{
                marginTop: '20px', width: '100%', padding: '14px',
                background: btnHover ? 'linear-gradient(135deg,#00D4FF,#00A8E8)' : 'linear-gradient(135deg,#00A8E8,#00D4FF)',
                color: '#000', border: 'none', borderRadius: '10px',
                fontWeight: 800, fontSize: '14px', cursor: 'pointer',
                boxShadow: '0 4px 18px rgba(0,168,232,.3)', transition: 'all .2s',
              }}>
              Procesar video →
            </button>

            <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--t3)', textAlign: 'center', lineHeight: 1.5 }}>
              Tu video se procesará en segundo plano. Te avisaremos por correo cuando esté listo.<br/>
              Los minutos se reservan al iniciar y se confirman al entregar.
            </div>

            {historial.length > 0 && (
              <div style={{ marginTop: '32px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t3)', letterSpacing: '1.5px', textTransform: 'uppercase' as const, marginBottom: '10px' }}>Tus últimos videos</div>
                {historial.map((v: any) => {
                  const f = v.fields || {}
                  return (
                    <Link key={v.id} href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 14px', background: 'var(--s1)', border: '1px solid var(--b)', borderRadius: '10px', marginBottom: '6px', textDecoration: 'none' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t1)', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.VideoID || 'Sin nombre'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--t3)' }}>{f.Estado || 'Pendiente'}</div>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
