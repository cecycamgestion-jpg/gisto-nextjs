'use client'
import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { resolverPlan, getPlan, PLAN_MAX_MINUTOS as MAX_CREDITOS, PLAN_COLORS } from '@/lib/plans'

const PAISES = [
  'Argentina','Bolivia','Chile','Colombia','Costa Rica','Ecuador',
  'El Salvador','España','Estados Unidos','Guatemala','Honduras',
  'Mexico','Nicaragua','Panama','Paraguay','Peru','Republica Dominicana',
  'Uruguay','Venezuela','Otro'
]
const TIPOS_DOCUMENTO = ['DNI','RUC','Pasaporte','Tax ID','Cedula','Otro']

function fmtHoras(min: number): string {
  if (!min || min <= 0) return '0 min'
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${m} min`
}

function fmtFecha(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch { return iso }
}

const NavItem = ({ href, label, icon, active, onClick }: any) => (
  <Link href={href} onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', color: active ? 'var(--t1)' : 'var(--t2)', textDecoration: 'none', borderRadius: '9px', marginBottom: '2px', fontSize: '14px', fontWeight: 500, background: active ? 'rgba(0,168,232,0.08)' : 'transparent', border: active ? '1px solid var(--b)' : '1px solid transparent', transition: 'all .2s' }}>
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={active ? '#00A8E8' : '#667788'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={icon}/></svg>
    {label}
  </Link>
)

export default function Perfil() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [creditos, setCreditos] = useState(0)
  const [videos, setVideos] = useState<any[]>([])
  const [ordenes, setOrdenes] = useState<any[]>([])
  const [avatarUrl, setAvatarUrl] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)
  const [tab, setTab] = useState<'datos'|'facturacion'|'consumo'>('datos')
  const [isMobile, setIsMobile] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // Campos editables
  const [nombre, setNombre] = useState('')
  const [tipoDoc, setTipoDoc] = useState('')
  const [numDoc, setNumDoc] = useState('')
  const [pais, setPais] = useState('')
  const [razonSocial, setRazonSocial] = useState('')
  // Pieza 1: tipo de comprobante
  const [tipoComprobante, setTipoComprobante] = useState<'Boleta'|'Factura'>('Boleta')
  // Pieza 2: cambiar correo
  const [nuevoEmail, setNuevoEmail] = useState('')
  const [passParaCambio, setPassParaCambio] = useState('')
  const [cambiandoEmail, setCambiandoEmail] = useState(false)
  const [emailCambiado, setEmailCambiado] = useState(false)
  const [errorEmail, setErrorEmail] = useState('')
  const [mostrarCambioEmail, setMostrarCambioEmail] = useState(false)
  // Avatar
  const [avatarSubiendo, setAvatarSubiendo] = useState(false)
  // Facturacion internacional
  const [paisFactura, setPaisFactura] = useState('')
  const [idFiscal, setIdFiscal] = useState('')
  const [razonSocialFactura, setRazonSocialFactura] = useState('')
  const [direccionFiscal, setDireccionFiscal] = useState('')
  // Pieza 3: eliminar cuenta
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [passParaEliminar, setPassParaEliminar] = useState('')
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState('')

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    const u = localStorage.getItem('gisto_user')
    if (!u) { router.push('/login'); return }
    const parsed = JSON.parse(u)
    setUser(parsed)
    setNombre(parsed.nombre || '')
    setTipoDoc(parsed.tipo_documento || '')
    setNumDoc(parsed.numero_documento || '')
    setPais(parsed.pais || '')
    setRazonSocial(parsed.razon_social || '')
    setTipoComprobante((parsed.tipo_comprobante || 'Boleta') as 'Boleta'|'Factura')
    setPaisFactura(parsed.pais_factura || '')
    setIdFiscal(parsed.id_fiscal || '')
    setRazonSocialFactura(parsed.razon_social_factura || '')
    setDireccionFiscal(parsed.direccion_fiscal || '')
    if (parsed.avatarUrl) setAvatarUrl(parsed.avatarUrl)

    fetch('/api/airtable/usuario').then(r => r.json()).then(data => {
      if (data.error) return
      setCreditos(data.creditos || 0)
      if (data.avatar_url) setAvatarUrl(data.avatar_url)
      setNombre(data.nombre || parsed.nombre || '')
      setTipoDoc(data.tipo_documento || parsed.tipo_documento || '')
      setNumDoc(data.numero_documento || parsed.numero_documento || '')
      setPais(data.pais || parsed.pais || '')
      setRazonSocial(data.razon_social || parsed.razon_social || '')
      setTipoComprobante(((data.tipo_comprobante || parsed.tipo_comprobante || 'Boleta') as 'Boleta'|'Factura'))
      setPaisFactura(data.pais_factura || parsed.pais_factura || '')
      setIdFiscal(data.id_fiscal || parsed.id_fiscal || '')
      setRazonSocialFactura(data.razon_social_factura || parsed.razon_social_factura || '')
      setDireccionFiscal(data.direccion_fiscal || parsed.direccion_fiscal || '')
    }).catch(() => {})

    const email = parsed.email || ''
    if (email) {
      fetch(`/api/airtable/videos?email=${encodeURIComponent(email)}`).then(r => r.json()).then(data => {
        if (data.records) setVideos(data.records)
      }).catch(() => {})
    }
    fetch('/api/airtable/ordenes').then(r => r.json()).then(data => {
      if (data.records) setOrdenes(data.records)
    }).catch(() => {})
  }, [router])

  async function guardarDatos() {
    setGuardando(true)
    try {
      const r = await fetch('/api/airtable/usuario', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, tipo_documento: tipoDoc, numero_documento: numDoc, pais, razon_social: razonSocial, tipo_comprobante: tipoComprobante, pais_factura: paisFactura, id_fiscal: idFiscal, razon_social_factura: razonSocialFactura, direccion_fiscal: direccionFiscal })
      })
      if (r.ok) {
        const updated = { ...user, nombre, tipo_documento: tipoDoc, numero_documento: numDoc, pais, razon_social: razonSocial, tipo_comprobante: tipoComprobante, pais_factura: paisFactura, id_fiscal: idFiscal, razon_social_factura: razonSocialFactura, direccion_fiscal: direccionFiscal }
        localStorage.setItem('gisto_user', JSON.stringify(updated))
        setUser(updated); setGuardado(true); setTimeout(() => setGuardado(false), 2500)
      }
    } catch {}
    setGuardando(false)
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    if (file.size > 5 * 1024 * 1024) { alert('La imagen debe ser menor a 5MB'); return }
    setAvatarSubiendo(true)
    try {
      const fd = new FormData()
      fd.append('avatar', file)
      const res = await fetch('/api/airtable/usuario/avatar', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.avatar_url) {
        setAvatarUrl(data.avatar_url)
        const updated = { ...user, avatarUrl: data.avatar_url }
        localStorage.setItem('gisto_user', JSON.stringify(updated))
        setUser(updated)
      }
    } catch { alert('Error subiendo imagen. Intenta de nuevo.') }
    setAvatarSubiendo(false)
  }

  async function cambiarEmail() {
    setErrorEmail('')
    if (!nuevoEmail.includes('@')) { setErrorEmail('Ingresa un correo valido'); return }
    if (!passParaCambio) { setErrorEmail('Ingresa tu contrasena actual'); return }
    setCambiandoEmail(true)
    try {
      const res = await fetch('/api/auth/change-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_email: nuevoEmail, password: passParaCambio })
      })
      const data = await res.json()
      if (!res.ok) { setErrorEmail(data.error || 'Error desconocido'); setCambiandoEmail(false); return }
      // Actualizar localStorage con el nuevo correo
      const updated = { ...user, email: nuevoEmail }
      localStorage.setItem('gisto_user', JSON.stringify(updated))
      setUser(updated)
      setEmailCambiado(true)
      setNuevoEmail('')
      setPassParaCambio('')
      setTimeout(() => { setEmailCambiado(false); setMostrarCambioEmail(false) }, 3000)
    } catch { setErrorEmail('Error de conexion. Intenta de nuevo.') }
    setCambiandoEmail(false)
  }

  async function eliminarCuenta() {
    setErrorEliminar('')
    if (confirmText !== 'ELIMINAR') { setErrorEliminar('Escribe ELIMINAR para confirmar'); return }
    if (!passParaEliminar) { setErrorEliminar('La contrasena es requerida'); return }
    setEliminando(true)
    try {
      const res = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passParaEliminar })
      })
      const data = await res.json()
      if (!res.ok) { setErrorEliminar(data.error || 'Error desconocido'); setEliminando(false); return }
      // Limpiar localStorage y redirigir
      localStorage.removeItem('gisto_user')
      localStorage.removeItem('gisto_plan_intent')
      router.push('/login')
    } catch { setErrorEliminar('Error de conexion. Intenta de nuevo.') }
    setEliminando(false)
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    localStorage.removeItem('gisto_user'); router.push('/login')
  }

  const inicial = nombre?.[0]?.toUpperCase() || 'U'
  // PIEZA 0: usar @/lib/plans como fuente unica
  const planActual = resolverPlan(user?.plan)
  const planNombre = getPlan(user?.plan).nombre
  const creditosMax = MAX_CREDITOS[planActual]
  const porcentaje = creditosMax > 0 ? Math.max(2, Math.min(100, (creditos / creditosMax) * 100)) : 2

  const videosCompletados = videos.filter(v => (v.fields?.Estado || '').toLowerCase() === 'completado')
  const totalMinConsumidos = videosCompletados.reduce((s, v) => s + (v.fields?.Duracion_entregada || v.fields?.Duracion || 0), 0)
  const totalRecargas = ordenes.reduce((s, o) => s + (o.fields?.Monto_USD || 0), 0)

  const consumoPorMes: Record<string, number> = {}
  videosCompletados.forEach(v => {
    const fecha = new Date(v.createdTime || v.fields?.['Created time'] || Date.now())
    const clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
    consumoPorMes[clave] = (consumoPorMes[clave] || 0) + (v.fields?.Duracion_entregada || v.fields?.Duracion || 30)
  })
  const meses = Object.entries(consumoPorMes).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 4)

  const getFiscalLabel = (pais: string) => {
    const map: Record<string, string> = {
      'Peru': 'RUC (11 digitos)', 'Chile': 'RUT', 'Mexico': 'RFC',
      'Colombia': 'NIT', 'Argentina': 'CUIT', 'Espana': 'CIF / NIF',
      'Estados Unidos': 'EIN / Tax ID', 'Bolivia': 'NIT Bolivia',
      'Ecuador': 'RUC Ecuador', 'Venezuela': 'RIF'
    }
    return map[pais] || 'Numero fiscal / Tax ID'
  }
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const inp: React.CSSProperties = { width: '100%', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(240,246,252,.1)', borderRadius: '10px', padding: '11px 14px', color: 'var(--t1)', fontSize: '14px', outline: 'none', fontFamily: 'inherit' }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {isMobile && sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 99 }}/>}

      <aside style={{ width: '260px', background: 'var(--s1)', borderRight: '1px solid var(--b)', padding: '20px 16px', display: 'flex', flexDirection: 'column', flexShrink: 0, ...(isMobile ? { position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100, transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform .3s ease' } : { position: 'relative' }) }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', marginBottom: '36px' }}>
          <img src="/isotipo.png" alt="GISTO" style={{ height: '52px', width: 'auto', objectFit: 'contain' }}/>
          <span style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontWeight: 900, fontSize: '18px', color: 'var(--t1)' }}>THE <span style={{ color: '#00A8E8' }}>GISTO</span></span>
        </Link>
        <NavItem href="/dashboard" label="Dashboard" icon="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" active={false} onClick={() => setSidebarOpen(false)}/>
        <NavItem href="/upload" label="Subir video" icon="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" active={false} onClick={() => setSidebarOpen(false)}/>
        <NavItem href="/perfil" label="Mi perfil" icon="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" active={true} onClick={() => setSidebarOpen(false)}/>
        <NavItem href="/planes" label="Planes y pagos" icon="M1 4h22v16H1zM1 10h22" active={false} onClick={() => setSidebarOpen(false)}/>

        <div style={{ marginTop: 'auto', background: 'rgba(0,168,232,.06)', border: '1px solid var(--b)', borderRadius: '12px', padding: '14px' }}>
          <div style={{ fontSize: '11px', color: 'var(--t2)', marginBottom: '8px' }}>Creditos disponibles</div>
          <div style={{ height: '6px', background: 'rgba(0,168,232,.12)', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
            <div style={{ height: '100%', width: `${porcentaje}%`, minWidth: '4px', background: 'linear-gradient(90deg,#00A8E8,#00D4FF)', borderRadius: '3px', transition: 'width .5s ease' }}/>
          </div>
          <strong style={{ color: '#00A8E8', fontSize: '15px' }}>{fmtHoras(creditos)}</strong>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 12px 0', borderTop: '1px solid var(--b)', marginTop: '12px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '2px solid var(--b)' }}>
            {avatarUrl ? <img src={avatarUrl} alt={nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#00A8E8,#00D4FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px', color: '#000' }}>{inicial}</div>}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nombre || 'Usuario'}</div>
            <div style={{ fontSize: '11px', color: 'var(--t2)' }}>{planNombre}</div>
          </div>
        </div>
        <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', color: 'var(--err)', background: 'none', border: 'none', borderRadius: '9px', marginTop: '6px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', width: '100%' }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          Cerrar sesion
        </button>
      </aside>

      <main style={{ flex: 1, overflow: 'auto', padding: isMobile ? '14px' : '28px 36px' }}>
        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <button onClick={() => setSidebarOpen(v => !v)} style={{ background: 'rgba(255,255,255,.06)', border: '1px solid var(--b)', borderRadius: '8px', color: 'var(--t1)', padding: '8px', cursor: 'pointer' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <span style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontWeight: 800, fontSize: '16px' }}>Mi perfil</span>
          </div>
        )}

        {!isMobile && (
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontWeight: 900, fontSize: '26px', letterSpacing: '-.5px' }}>Mi perfil</h1>
            <p style={{ color: 'var(--t2)', fontSize: '14px', marginTop: '4px' }}>Gestiona tus datos, revisa tu facturacion y analiza tu consumo.</p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '3px', background: 'rgba(255,255,255,.04)', border: '1px solid var(--b)', padding: '3px', borderRadius: '10px', marginBottom: '24px', width: 'fit-content' }}>
          {([
            { id: 'datos', label: 'Mis datos' },
            { id: 'facturacion', label: 'Facturacion' },
            { id: 'consumo', label: 'Mi consumo' },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'all .2s', background: tab === t.id ? 'linear-gradient(135deg,#00A8E8,#00D4FF)' : 'transparent', color: tab === t.id ? '#000' : 'var(--t2)' }}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'datos' && (
          <div style={{ maxWidth: '560px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
              <div
                onClick={() => avatarInputRef.current?.click()}
                style={{ width: '72px', height: '72px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--b)', flexShrink: 0, cursor: 'pointer', position: 'relative' as const }}
                title="Cambiar foto"
              >
                {avatarUrl ? <img src={avatarUrl} alt={nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#00A8E8,#00D4FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cabinet Grotesk',sans-serif", fontWeight: 900, fontSize: '28px', color: '#000' }}>{inicial}</div>}
                <div style={{ position: 'absolute' as const, inset: 0, background: avatarSubiendo ? 'rgba(0,0,0,.6)' : 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .2s' }}
                  onMouseEnter={e => (e.currentTarget.style.background='rgba(0,0,0,.5)')}
                  onMouseLeave={e => (e.currentTarget.style.background='rgba(0,0,0,0)')}>
                  {avatarSubiendo
                    ? <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: '2px solid rgba(255,255,255,.3)', borderTop: '2px solid #fff', animation: 'spin 1s linear infinite' }}/>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  }
                </div>
              </div>
              <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleAvatarChange} />
              <div>
                <div style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontWeight: 800, fontSize: '20px' }}>{nombre || 'Sin nombre'}</div>
                <div style={{ fontSize: '13px', color: 'var(--t2)', marginTop: '2px' }}>{user?.email}</div>
                <span style={{ display: 'inline-block', marginTop: '6px', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '100px', color: PLAN_COLORS[planActual] || '#00A8E8', background: `${PLAN_COLORS[planActual] || '#00A8E8'}18`, border: `1px solid ${PLAN_COLORS[planActual] || '#00A8E8'}35` }}>{planNombre}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--t3)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Nombre completo</label>
                <input style={inp} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Tu nombre"/>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--t3)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Pais</label>
                <select style={{ ...inp, WebkitAppearance: 'none' }} value={pais} onChange={e => setPais(e.target.value)}>
                  <option value="">Selecciona</option>
                  {PAISES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--t3)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Tipo de documento{tipoComprobante === 'Factura' ? ' *' : ''}
                </label>
                <select style={{ ...inp, WebkitAppearance: 'none' }} value={tipoDoc} onChange={e => setTipoDoc(e.target.value)}>
                  <option value="">Selecciona</option>
                  {TIPOS_DOCUMENTO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--t3)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>
                  {tipoComprobante === 'Factura' ? 'RUC *' : 'N de documento'}
                </label>
                <input
                  style={{ ...inp, borderColor: tipoComprobante === 'Factura' && !numDoc ? 'rgba(255,176,32,.5)' : 'rgba(240,246,252,.1)' }}
                  value={numDoc}
                  onChange={e => setNumDoc(e.target.value)}
                  placeholder={tipoComprobante === 'Factura' ? 'Tu RUC (11 digitos)' : 'Tu numero'}
                />
              </div>
              <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--t3)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Razon social (opcional)</label>
                <input style={inp} value={razonSocial} onChange={e => setRazonSocial(e.target.value)} placeholder="Para factura a empresa"/>
              </div>

              {/* PIEZA 1 — Comprobante + Facturación internacional */}
              <div style={{ gridColumn: isMobile ? '1' : '1 / -1', background: 'rgba(0,168,232,.04)', border: '1px solid rgba(0,168,232,.15)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--t3)', letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: '10px' }}>
                  Tipo de comprobante
                </div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  {(['Boleta', 'Factura'] as const).map(tipo => (
                    <button key={tipo} onClick={() => setTipoComprobante(tipo)} style={{
                      flex: 1, padding: '10px', borderRadius: '9px', border: 'none', cursor: 'pointer',
                      fontSize: '14px', fontWeight: 700, transition: 'all .2s',
                      background: tipoComprobante === tipo ? 'linear-gradient(135deg,#00A8E8,#00D4FF)' : 'rgba(255,255,255,.04)',
                      color: tipoComprobante === tipo ? '#000' : 'var(--t2)',
                      outline: tipoComprobante !== tipo ? '1px solid rgba(240,246,252,.08)' : 'none',
                      boxShadow: tipoComprobante === tipo ? '0 0 16px rgba(0,168,232,.3)' : 'none'
                    }}>
                      {tipo}
                    </button>
                  ))}
                </div>

                {tipoComprobante === 'Factura' && (
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                    <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--t3)', letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: '6px' }}>
                        Pais de facturacion
                      </label>
                      <select
                        style={{ ...inp, WebkitAppearance: 'none', borderColor: 'rgba(0,168,232,.2)' }}
                        value={paisFactura}
                        onChange={e => setPaisFactura(e.target.value)}
                      >
                        <option value="">Selecciona el pais</option>
                        {PAISES.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      <div style={{ fontSize: '10px', color: 'var(--t3)', marginTop: '4px' }}>
                        Puede ser diferente al pais de tu registro personal.
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--t3)', letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: '6px' }}>
                        {paisFactura ? getFiscalLabel(paisFactura) : 'ID fiscal'}
                      </label>
                      <input
                        style={{ ...inp, borderColor: 'rgba(0,168,232,.2)' }}
                        value={idFiscal}
                        onChange={e => setIdFiscal(e.target.value)}
                        placeholder={paisFactura ? getFiscalLabel(paisFactura) : 'Selecciona pais primero'}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--t3)', letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: '6px' }}>
                        Razon social / Empresa
                      </label>
                      <input
                        style={{ ...inp, borderColor: 'rgba(0,168,232,.2)' }}
                        value={razonSocialFactura}
                        onChange={e => setRazonSocialFactura(e.target.value)}
                        placeholder="Nombre de la empresa"
                      />
                    </div>
                    <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--t3)', letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: '6px' }}>
                        Direccion fiscal
                      </label>
                      <input
                        style={{ ...inp, borderColor: 'rgba(0,168,232,.2)' }}
                        value={direccionFiscal}
                        onChange={e => setDireccionFiscal(e.target.value)}
                        placeholder="Calle, numero, ciudad, pais"
                      />
                    </div>
                    <div style={{ gridColumn: isMobile ? '1' : '1 / -1', fontSize: '11px', color: 'var(--t3)', lineHeight: 1.6, padding: '10px 12px', background: 'rgba(255,176,32,.05)', border: '1px solid rgba(255,176,32,.12)', borderRadius: '8px' }}>
                      Los datos de facturacion son de tu responsabilidad. Aplican a tu proxima compra.
                      Para corregir una factura ya emitida escribe a{' '}
                      <a href="mailto:admin@thegisto.com" style={{ color: '#00A8E8', textDecoration: 'none', fontWeight: 600 }}>admin@thegisto.com</a>.
                    </div>
                  </div>
                )}

                {tipoComprobante === 'Boleta' && (
                  <div style={{ fontSize: '11px', color: 'var(--t3)', lineHeight: 1.6 }}>
                    Se emitira boleta a tu nombre personal. Si necesitas factura, selecciona arriba.
                  </div>
                )}
              </div>
            </div>

            <button onClick={guardarDatos} disabled={guardando} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: guardado ? 'rgba(0,229,160,.15)' : 'linear-gradient(135deg,#00A8E8,#00D4FF)', color: guardado ? '#00E5A0' : '#000', padding: '11px 24px', borderRadius: '10px', fontWeight: 700, fontSize: '14px', border: 'none', cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? .6 : 1 }}>
              {guardado ? 'Guardado' : guardando ? 'Guardando...' : 'Guardar cambios'}
            </button>

            {/* PIEZA 2 — Cambiar correo electronico */}
            <div style={{ marginTop: '28px', paddingTop: '24px', borderTop: '1px solid rgba(240,246,252,.08)' }}>
              <button
                onClick={() => { setMostrarCambioEmail(v => !v); setErrorEmail(''); setNuevoEmail(''); setPassParaCambio('') }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--t2)', cursor: 'pointer', fontSize: '13px', fontWeight: 500, padding: 0 }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                </svg>
                Cambiar correo electronico
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: mostrarCambioEmail ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {mostrarCambioEmail && (
                <div style={{ marginTop: '16px', background: 'rgba(0,168,232,.04)', border: '1px solid rgba(0,168,232,.12)', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--t2)', marginBottom: '14px', lineHeight: 1.5 }}>
                    Correo actual: <strong style={{ color: 'var(--t1)' }}>{user?.email}</strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--t3)', letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: '6px' }}>Nuevo correo</label>
                      <input
                        type="email"
                        value={nuevoEmail}
                        onChange={e => setNuevoEmail(e.target.value)}
                        placeholder="nuevo@correo.com"
                        style={{ width: '100%', background: 'rgba(12,16,24,0.85)', border: '1px solid rgba(240,246,252,.1)', borderRadius: '10px', padding: '11px 14px', color: 'var(--t1)', fontSize: '14px', outline: 'none', fontFamily: 'inherit' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--t3)', letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: '6px' }}>Contrasena actual</label>
                      <input
                        type="password"
                        value={passParaCambio}
                        onChange={e => setPassParaCambio(e.target.value)}
                        placeholder="Para confirmar tu identidad"
                        style={{ width: '100%', background: 'rgba(12,16,24,0.85)', border: '1px solid rgba(240,246,252,.1)', borderRadius: '10px', padding: '11px 14px', color: 'var(--t1)', fontSize: '14px', outline: 'none', fontFamily: 'inherit' }}
                      />
                    </div>
                    {errorEmail && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 12px', background: 'rgba(255,70,100,.08)', border: '1px solid rgba(255,70,100,.2)', borderRadius: '8px', fontSize: '12px', color: 'var(--err)' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        {errorEmail}
                      </div>
                    )}
                    {emailCambiado && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 12px', background: 'rgba(0,229,160,.08)', border: '1px solid rgba(0,229,160,.2)', borderRadius: '8px', fontSize: '12px', color: '#00E5A0' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#00E5A0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        Correo actualizado correctamente.
                      </div>
                    )}
                    <button
                      onClick={cambiarEmail}
                      disabled={cambiandoEmail || !nuevoEmail || !passParaCambio}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '7px',
                        background: (cambiandoEmail || !nuevoEmail || !passParaCambio) ? 'rgba(0,168,232,.2)' : 'linear-gradient(135deg,#00A8E8,#00D4FF)',
                        color: (cambiandoEmail || !nuevoEmail || !passParaCambio) ? 'rgba(0,0,0,.4)' : '#000',
                        padding: '10px 20px', borderRadius: '9px', fontWeight: 700, fontSize: '13px',
                        border: 'none', cursor: (cambiandoEmail || !nuevoEmail || !passParaCambio) ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {cambiandoEmail ? 'Actualizando...' : 'Actualizar correo'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* PIEZA 3 — Zona de peligro: eliminar cuenta */}
            <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid rgba(226,92,92,.15)' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--err)', marginBottom: '6px' }}>Zona de peligro</div>
              <div style={{ fontSize: '12px', color: 'var(--t3)', marginBottom: '12px', lineHeight: 1.5 }}>
                Eliminar tu cuenta borra permanentemente tus videos y creditos. Los comprobantes de pago se conservan por obligacion legal.
              </div>
              <button
                onClick={() => { setShowDeleteModal(true); setConfirmText(''); setPassParaEliminar(''); setErrorEliminar('') }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'rgba(226,92,92,.08)', border: '1px solid rgba(226,92,92,.3)', color: 'var(--err)', padding: '9px 18px', borderRadius: '9px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
                Eliminar mi cuenta
              </button>
            </div>
          </div>
        )}

        {/* MODAL eliminar cuenta */}
        {showDeleteModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
            onClick={e => { if (e.target === e.currentTarget) setShowDeleteModal(false) }}>
            <div style={{ background: '#0a0e16', border: '1px solid rgba(226,92,92,.3)', borderRadius: '16px', padding: '28px', maxWidth: '440px', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: 'rgba(226,92,92,.1)', border: '1px solid rgba(226,92,92,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontWeight: 800, fontSize: '17px', color: 'var(--t1)' }}>Eliminar cuenta</div>
                  <div style={{ fontSize: '12px', color: 'var(--t3)' }}>Esta accion es permanente e irreversible</div>
                </div>
              </div>

              <div style={{ background: 'rgba(226,92,92,.06)', border: '1px solid rgba(226,92,92,.15)', borderRadius: '10px', padding: '12px 14px', marginBottom: '20px', fontSize: '13px', color: 'var(--t2)', lineHeight: 1.6 }}>
                Se eliminaran: tus videos, tus creditos y tus datos personales.<br/>
                Se conservan: tus comprobantes de pago (exigido por ley).
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--t3)', letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: '6px' }}>
                    Escribe ELIMINAR para confirmar
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={e => setConfirmText(e.target.value)}
                    placeholder="ELIMINAR"
                    style={{ width: '100%', background: 'rgba(12,16,24,0.85)', border: `1px solid ${confirmText === 'ELIMINAR' ? 'rgba(226,92,92,.5)' : 'rgba(240,246,252,.1)'}`, borderRadius: '10px', padding: '11px 14px', color: 'var(--t1)', fontSize: '14px', outline: 'none', fontFamily: 'inherit', letterSpacing: '1px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--t3)', letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: '6px' }}>
                    Contrasena actual
                  </label>
                  <input
                    type="password"
                    value={passParaEliminar}
                    onChange={e => setPassParaEliminar(e.target.value)}
                    placeholder="Para confirmar tu identidad"
                    style={{ width: '100%', background: 'rgba(12,16,24,0.85)', border: '1px solid rgba(240,246,252,.1)', borderRadius: '10px', padding: '11px 14px', color: 'var(--t1)', fontSize: '14px', outline: 'none', fontFamily: 'inherit' }}
                  />
                </div>

                {errorEliminar && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 12px', background: 'rgba(255,70,100,.08)', border: '1px solid rgba(255,70,100,.2)', borderRadius: '8px', fontSize: '12px', color: 'var(--err)' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--err)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    {errorEliminar}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    style={{ flex: 1, padding: '11px', borderRadius: '9px', border: '1px solid rgba(240,246,252,.12)', background: 'transparent', color: 'var(--t2)', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={eliminarCuenta}
                    disabled={eliminando || confirmText !== 'ELIMINAR' || !passParaEliminar}
                    style={{
                      flex: 1, padding: '11px', borderRadius: '9px', border: 'none', fontSize: '14px', fontWeight: 700, cursor: (eliminando || confirmText !== 'ELIMINAR' || !passParaEliminar) ? 'not-allowed' : 'pointer',
                      background: (eliminando || confirmText !== 'ELIMINAR' || !passParaEliminar) ? 'rgba(226,92,92,.2)' : '#E25C5C',
                      color: (eliminando || confirmText !== 'ELIMINAR' || !passParaEliminar) ? 'rgba(255,255,255,.3)' : '#fff'
                    }}
                  >
                    {eliminando ? 'Eliminando...' : 'Eliminar definitivamente'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'facturacion' && (
          <div>
            <div style={{ marginBottom: '20px', color: 'var(--t2)', fontSize: '14px' }}>
              Tu historial de compras. Recibe el comprobante por correo automaticamente.
            </div>
            {ordenes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '56px 24px', background: 'var(--s1)', borderRadius: '16px', border: '1px solid var(--b)' }}>
                <div style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontSize: '17px', fontWeight: 800, marginBottom: '8px' }}>Sin compras registradas</div>
                <div style={{ color: 'var(--t2)', fontSize: '13px', marginBottom: '16px' }}>Cuando adquieras un plan, aparecera aqui.</div>
                <Link href="/planes" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg,#00A8E8,#00D4FF)', color: '#000', padding: '10px 20px', borderRadius: '9px', fontWeight: 700, fontSize: '13px', textDecoration: 'none' }}>Ver planes</Link>
              </div>
            ) : (
              <div style={{ border: '1px solid var(--b)', borderRadius: '14px', overflow: 'hidden' }}>
                {ordenes.map((o: any, i: number) => {
                  const f = o.fields || {}
                  const fecha = fmtFecha(f.Fecha || o.createdTime)
                  const plan = f.Plan || '---'
                  const monto = f.Monto_USD ? `$${Number(f.Monto_USD).toFixed(2)}` : '---'
                  const comprobante = f.Comprobante || f.nro_comprobante || null
                  const estado = f.Estado || 'Completado'
                  const esOk = /complet|pagad|ok/i.test(estado)
                  return (
                    <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px', borderBottom: i < ordenes.length - 1 ? '1px solid var(--b)' : 'none', flexWrap: 'wrap' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: 'rgba(0,168,232,.08)', border: '1px solid rgba(0,168,232,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00A8E8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4h22v16H1zM1 10h22"/></svg>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '14px' }}>{plan} --- {monto}</div>
                        <div style={{ fontSize: '12px', color: 'var(--t2)', marginTop: '2px' }}>{fecha}{comprobante ? ` N ${comprobante}` : ''}</div>
                      </div>
                      <span style={{ padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 700, background: esOk ? 'rgba(0,229,160,.1)' : 'rgba(255,255,255,.06)', color: esOk ? '#00E5A0' : 'var(--t2)', border: `1px solid ${esOk ? 'rgba(0,229,160,.25)' : 'rgba(255,255,255,.1)'}` }}>
                        {esOk ? 'Pagado' : estado}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'consumo' && (
          <div>
            {(() => {
              const promMinVideo = videosCompletados.length > 0 ? Math.round(totalMinConsumidos / videosCompletados.length) : 0
              const videoMasLargo = videosCompletados.reduce((max, v) => {
                const dur = v.fields?.Duracion_entregada || v.fields?.Duracion || 0
                return dur > max ? dur : max
              }, 0)
              const videosRestantes = promMinVideo > 0 ? Math.floor(creditos / promMinVideo) : null
              const stats = [
                { label: 'Saldo disponible', val: fmtHoras(creditos), color: '#00A8E8', sub: 'en tu cuenta ahora' },
                { label: 'Promedio por video', val: promMinVideo > 0 ? fmtHoras(promMinVideo) : '---', color: '#00E5A0', sub: `${videosCompletados.length} video${videosCompletados.length !== 1 ? 's' : ''} procesado${videosCompletados.length !== 1 ? 's' : ''}` },
                { label: 'Video mas largo', val: videoMasLargo > 0 ? fmtHoras(videoMasLargo) : '---', color: '#A078FF', sub: 'duracion maxima procesada' },
                { label: 'Videos restantes', val: videosRestantes !== null ? `~${videosRestantes}` : '---', color: '#FFB020', sub: promMinVideo > 0 ? 'con tu saldo actual' : 'procesa videos para calcular' },
              ]
              return (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: '12px', marginBottom: '24px' }}>
                  {stats.map((s, i) => (
                    <div key={i} style={{ background: 'rgba(10,14,22,.95)', border: '1px solid rgba(240,246,252,.07)', borderRadius: '14px', overflow: 'hidden', boxShadow: `0 0 20px ${s.color}10` }}>
                      <div style={{ height: '3px', background: s.color, boxShadow: `0 0 8px ${s.color}` }}/>
                      <div style={{ padding: '16px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--t2)', marginBottom: '8px', fontWeight: 500 }}>{s.label}</div>
                        <div style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontSize: isMobile ? '20px' : '26px', fontWeight: 900, letterSpacing: '-1px', color: s.color, textShadow: `0 0 20px ${s.color}60`, marginBottom: '4px' }}>{s.val}</div>
                        <div style={{ fontSize: '10px', color: 'var(--t3)' }}>{s.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}

            {meses.length > 0 && (
              <div style={{ background: 'var(--s1)', border: '1px solid var(--b)', borderRadius: '14px', padding: '20px', marginBottom: '20px' }}>
                <div style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontWeight: 700, fontSize: '15px', marginBottom: '16px' }}>Consumo mensual</div>
                {meses.map(([mes, min]) => {
                  const maxMin = Math.max(...meses.map(m => m[1]))
                  const pct = maxMin > 0 ? (min / maxMin) * 100 : 0
                  const [anio, m] = mes.split('-')
                  const nombreMes = new Date(Number(anio), Number(m) - 1).toLocaleDateString('es', { month: 'long', year: 'numeric' })
                  return (
                    <div key={mes} style={{ marginBottom: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' }}>
                        <span style={{ textTransform: 'capitalize' }}>{nombreMes}</span>
                        <span style={{ fontWeight: 700, color: '#00E5A0' }}>{fmtHoras(min)}</span>
                      </div>
                      <div style={{ height: '6px', background: 'rgba(255,255,255,.06)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#00A8E8,#00E5A0)', borderRadius: '3px', transition: 'width .6s ease' }}/>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {creditos > 0 && (
              <div style={{ background: 'rgba(0,229,160,.04)', border: '1px solid rgba(0,229,160,.15)', borderRadius: '14px', padding: '20px' }}>
                <div style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontWeight: 700, fontSize: '15px', marginBottom: '8px', color: '#00E5A0' }}>
                  Con tu saldo actual
                </div>
                <div style={{ fontSize: '14px', color: 'var(--t2)', lineHeight: 1.6 }}>
                  Tienes <strong style={{ color: 'var(--t1)' }}>{fmtHoras(creditos)}</strong> disponibles.
                  {meses.length > 0 && (() => {
                    const promMensual = meses.reduce((s, m) => s + m[1], 0) / meses.length
                    if (promMensual > 0) {
                      const mesesRestantes = creditos / promMensual
                      return <span> A tu ritmo actual (~{fmtHoras(Math.round(promMensual))}/mes), te alcanzan para aproximadamente <strong style={{ color: 'var(--t1)' }}>{mesesRestantes < 1 ? 'menos de 1 mes' : `${Math.floor(mesesRestantes)} mes${Math.floor(mesesRestantes) !== 1 ? 'es' : ''}`}</strong>.</span>
                    }
                    return null
                  })()}
                </div>
                <Link href="/planes" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '14px', background: 'linear-gradient(135deg,#00A8E8,#00D4FF)', color: '#000', padding: '9px 18px', borderRadius: '9px', fontWeight: 700, fontSize: '13px', textDecoration: 'none' }}>
                  Recargar horas
                </Link>
              </div>
            )}

            {videos.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px', color: 'var(--t2)', fontSize: '14px' }}>
                Aun no has procesado videos. Aqui veras tu analisis de consumo cuando subas tu primera clase.
              </div>
            )}
          </div>
        )}
      </main>

      <style>{`
        :root {
          --s1: rgba(12,16,26,.97);
          --b: rgba(240,246,252,.1);
          --t1: #f0f6fc;
          --t2: rgba(240,246,252,.75);
          --t3: rgba(240,246,252,.45);
          --c: #00BFFF;
          --c2: #00E8FF;
          --ok: #00F5B0;
          --warn: #FFB020;
          --err: #E25C5C;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0c1018; color: var(--t1); font-family: 'DM Sans',sans-serif; -webkit-font-smoothing: antialiased; }
        select option { background: #0c1018; color: #f0f6fc; }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
