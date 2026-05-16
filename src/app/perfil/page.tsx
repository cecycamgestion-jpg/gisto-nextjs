'use client'
import { useState, useEffect } from 'react'
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
  'Free': 40, 'Starter': 120, 'Professional': 480,
  'Academia': 1200, 'Profesional': 480
}

export default function Perfil() {
  const router = useRouter()
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
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState<'ok'|'err'>('ok')

  useEffect(() => {
    const u = localStorage.getItem('gisto_user')
    if (!u) { router.push('/login'); return }
    const parsed = JSON.parse(u)
    setUser(parsed)

    // Refrescar datos reales desde API route server-side
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
        const updated = { ...parsed, creditos: data.creditos, plan: data.plan, nombre: data.nombre }
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

  async function guardarPerfil() {
    if (!nombre.trim()) { setMsg('Name cannot be empty'); setMsgType('err'); return }
    if (!pais) { setMsg('Country is required'); setMsgType('err'); return }
    if (!tipoDocumento) { setMsg('ID type is required'); setMsgType('err'); return }
    if (!numeroDocumento.trim()) { setMsg('ID number is required'); setMsgType('err'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/airtable/usuario', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, pais, tipo_documento: tipoDocumento, numero_documento: numeroDocumento, razon_social: razonSocial })
      })
      if (res.ok) {
        const updated = { ...user, nombre }
        localStorage.setItem('gisto_user', JSON.stringify(updated))
        setUser(updated)
        setMsg('Profile updated successfully')
        setMsgType('ok')
      } else {
        setMsg('Error saving profile')
        setMsgType('err')
      }
    } catch { setMsg('Connection error'); setMsgType('err') }
    setLoading(false)
  }

  async function cambiarPassword() {
    if (!pwActual || !pwNueva) { setMsg('Both fields are required'); setMsgType('err'); return }
    if (pwNueva.length < 6) { setMsg('New password must be at least 6 characters'); setMsgType('err'); return }
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
        setMsg('Password updated successfully')
        setMsgType('ok')
      } else {
        setMsg(data.error || 'Error updating password')
        setMsgType('err')
      }
    } catch { setMsg('Connection error'); setMsgType('err') }
    setLoading(false)
  }

  if (!user) return null

  const planColors: any = {
    'Free': 'var(--t2)', 'Starter': 'var(--c)',
    'Professional': 'var(--ok)', 'Profesional': 'var(--ok)',
    'Academia': '#FFB020'
  }

  const porcentajeCreditos = Math.min(100, (creditos / creditosMax) * 100)

  return (
    <div style={{display:'flex',height:'100vh',overflow:'hidden',position:'relative' as const,zIndex:1}}>
      {/* SIDEBAR */}
      <aside style={{width:'260px',background:'var(--s1)',borderRight:'1px solid var(--b)',padding:'20px 16px',display:'flex',flexDirection:'column' as const,flexShrink:0}}>
        <Link href="/" style={{display:'flex',alignItems:'center',gap:'10px',textDecoration:'none',marginBottom:'36px'}}>
          <img src="/isotipo.png" alt="GISTO" style={{height:'34px'}}/>
          <span style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontWeight:900,fontSize:'18px',color:'var(--t1)'}}>THE <span style={{color:'var(--c)'}}>GISTO</span></span>
        </Link>
        {[
          {href:'/dashboard',label:'Dashboard',icon:'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z'},
          {href:'/upload',label:'Upload video',icon:'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12'},
          {href:'/planes',label:'Plans & billing',icon:'M1 4h22v16H1zM1 10h22'},
        ].map(item=>(
          <Link key={item.href} href={item.href} style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 12px',color:'var(--t2)',textDecoration:'none',borderRadius:'9px',marginBottom:'2px',fontSize:'14px',fontWeight:500,border:'1px solid transparent'}}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon}/></svg>
            {item.label}
          </Link>
        ))}
        <Link href="/perfil" style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 12px',color:'var(--t1)',textDecoration:'none',borderRadius:'9px',marginBottom:'2px',fontSize:'14px',fontWeight:500,background:'rgba(0,168,232,0.08)',border:'1px solid var(--b)'}}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--c)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>
          My profile
        </Link>
        <button onClick={logout} style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 12px',color:'var(--err)',background:'none',border:'none',borderRadius:'9px',marginTop:'auto',fontSize:'14px',fontWeight:500,cursor:'pointer',width:'100%'}}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          Sign out
        </button>
      </aside>

      {/* MAIN */}
      <main style={{flex:1,overflow:'auto',padding:'32px 40px'}}>
        <div style={{maxWidth:'640px',margin:'0 auto'}}>
          <h1 style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:'28px',fontWeight:900,letterSpacing:'-1px',marginBottom:'4px'}}>My profile</h1>
          <p style={{fontSize:'14px',color:'var(--t2)',marginBottom:'32px'}}>Manage your account and billing information</p>

          {/* PLAN & CRÉDITOS */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px',marginBottom:'28px'}}>
            <div style={{background:'var(--s1)',border:'1px solid var(--b)',borderRadius:'14px',padding:'20px'}}>
              <div style={{fontSize:'11px',fontWeight:700,color:'var(--t3)',letterSpacing:'1.5px',textTransform:'uppercase' as const,marginBottom:'10px'}}>Current plan</div>
              <div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:'26px',fontWeight:900,color:planColors[user.plan]||'var(--c)'}}>
                {user.plan||'Free'}
              </div>
              <Link href="/planes" style={{fontSize:'12px',color:'var(--c)',textDecoration:'none',display:'inline-block',marginTop:'6px'}}>
                View all plans →
              </Link>
            </div>
            <div style={{background:'var(--s1)',border:'1px solid var(--b)',borderRadius:'14px',padding:'20px'}}>
              <div style={{fontSize:'11px',fontWeight:700,color:'var(--t3)',letterSpacing:'1.5px',textTransform:'uppercase' as const,marginBottom:'10px'}}>Credits</div>
              <div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:'26px',fontWeight:900,color:'var(--c)'}}>
                {loadingCreditos ? '...' : creditos}{' '}
                <span style={{fontSize:'14px',fontWeight:400,color:'var(--t2)'}}>/ {creditosMax} min</span>
              </div>
              <div style={{height:'5px',background:'rgba(0,168,232,.12)',borderRadius:'3px',overflow:'hidden',marginTop:'10px'}}>
                <div style={{height:'100%',width:`${porcentajeCreditos}%`,background:'linear-gradient(90deg,var(--c),var(--c2))',borderRadius:'3px',transition:'width .3s'}}/>
              </div>
            </div>
          </div>

          {/* DATOS PERSONALES Y FACTURACIÓN */}
          <div style={{background:'var(--s1)',border:'1px solid var(--b)',borderRadius:'16px',padding:'24px',marginBottom:'16px'}}>
            <div style={{height:'2px',background:'linear-gradient(90deg,transparent,var(--c),var(--c2),transparent)',margin:'-24px -24px 20px'}}/>
            <h2 style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:'16px',fontWeight:700,marginBottom:'18px'}}>Personal & billing information</h2>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'12px'}}>
              <div>
                <label style={{fontSize:'11px',fontWeight:700,color:'var(--t3)',letterSpacing:'1.5px',textTransform:'uppercase' as const,display:'block',marginBottom:'8px'}}>Full name *</label>
                <input value={nombre} onChange={e=>setNombre(e.target.value)}
                  style={{width:'100%',background:'var(--s2)',border:'1px solid var(--b)',borderRadius:'10px',padding:'12px 14px',color:'var(--t1)',fontSize:'13px',outline:'none',fontFamily:'inherit'}}/>
              </div>
              <div>
                <label style={{fontSize:'11px',fontWeight:700,color:'var(--t3)',letterSpacing:'1.5px',textTransform:'uppercase' as const,display:'block',marginBottom:'8px'}}>Email</label>
                <input value={user.email} disabled
                  style={{width:'100%',background:'rgba(255,255,255,.03)',border:'1px solid var(--b)',borderRadius:'10px',padding:'12px 14px',color:'var(--t2)',fontSize:'13px',fontFamily:'inherit',cursor:'not-allowed'}}/>
              </div>
            </div>

            <div style={{marginBottom:'12px'}}>
              <label style={{fontSize:'11px',fontWeight:700,color:'var(--t3)',letterSpacing:'1.5px',textTransform:'uppercase' as const,display:'block',marginBottom:'8px'}}>Country *</label>
              <select value={pais} onChange={e=>setPais(e.target.value)}
                style={{width:'100%',background:'var(--s2)',border:'1px solid var(--b)',borderRadius:'10px',padding:'12px 14px',color:'var(--t1)',fontSize:'13px',outline:'none',fontFamily:'inherit',cursor:'pointer'}}>
                <option value="">Select your country</option>
                {PAISES.map(p=><option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1.5fr',gap:'12px',marginBottom:'12px'}}>
              <div>
                <label style={{fontSize:'11px',fontWeight:700,color:'var(--t3)',letterSpacing:'1.5px',textTransform:'uppercase' as const,display:'block',marginBottom:'8px'}}>ID Type *</label>
                <select value={tipoDocumento} onChange={e=>setTipoDocumento(e.target.value)}
                  style={{width:'100%',background:'var(--s2)',border:'1px solid var(--b)',borderRadius:'10px',padding:'12px 14px',color:'var(--t1)',fontSize:'13px',outline:'none',fontFamily:'inherit',cursor:'pointer'}}>
                  <option value="">Type</option>
                  {TIPOS_DOCUMENTO.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:'11px',fontWeight:700,color:'var(--t3)',letterSpacing:'1.5px',textTransform:'uppercase' as const,display:'block',marginBottom:'8px'}}>ID Number *</label>
                <input value={numeroDocumento} onChange={e=>setNumeroDocumento(e.target.value)}
                  style={{width:'100%',background:'var(--s2)',border:'1px solid var(--b)',borderRadius:'10px',padding:'12px 14px',color:'var(--t1)',fontSize:'13px',outline:'none',fontFamily:'inherit'}}/>
              </div>
            </div>

            <div style={{marginBottom:'20px'}}>
              <label style={{fontSize:'11px',fontWeight:700,color:'var(--t3)',letterSpacing:'1.5px',textTransform:'uppercase' as const,display:'block',marginBottom:'8px'}}>Company / Billing name <span style={{fontWeight:400,textTransform:'none' as const}}>optional</span></label>
              <input value={razonSocial} onChange={e=>setRazonSocial(e.target.value)} placeholder="Leave blank to use your full name"
                style={{width:'100%',background:'var(--s2)',border:'1px solid var(--b)',borderRadius:'10px',padding:'12px 14px',color:'var(--t1)',fontSize:'13px',outline:'none',fontFamily:'inherit'}}/>
            </div>

            {msg&&(
              <div style={{padding:'10px 14px',borderRadius:'9px',fontSize:'13px',marginBottom:'14px',background:msgType==='ok'?'rgba(0,229,160,.08)':'rgba(255,70,100,.08)',border:`1px solid ${msgType==='ok'?'rgba(0,229,160,.2)':'rgba(255,70,100,.2)'}`,color:msgType==='ok'?'var(--ok)':'var(--err)'}}>
                {msgType==='ok'?'✓ ':''}{msg}
              </div>
            )}
            <button onClick={guardarPerfil} disabled={loading}
              style={{background:'var(--c)',color:'#000',border:'none',borderRadius:'9px',padding:'12px 24px',fontWeight:700,fontSize:'14px',cursor:'pointer',fontFamily:'inherit'}}>
              {loading?'Saving...':'Save changes'}
            </button>
          </div>

          {/* CAMBIAR CONTRASEÑA */}
          <div style={{background:'var(--s1)',border:'1px solid var(--b)',borderRadius:'16px',padding:'24px'}}>
            <h2 style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:'16px',fontWeight:700,marginBottom:'18px'}}>Change password</h2>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'16px'}}>
              <div>
                <label style={{fontSize:'11px',fontWeight:700,color:'var(--t3)',letterSpacing:'1.5px',textTransform:'uppercase' as const,display:'block',marginBottom:'8px'}}>Current password</label>
                <input type="password" value={pwActual} onChange={e=>setPwActual(e.target.value)}
                  style={{width:'100%',background:'var(--s2)',border:'1px solid var(--b)',borderRadius:'10px',padding:'12px 14px',color:'var(--t1)',fontSize:'13px',outline:'none',fontFamily:'inherit'}}/>
              </div>
              <div>
                <label style={{fontSize:'11px',fontWeight:700,color:'var(--t3)',letterSpacing:'1.5px',textTransform:'uppercase' as const,display:'block',marginBottom:'8px'}}>New password</label>
                <input type="password" value={pwNueva} onChange={e=>setPwNueva(e.target.value)}
                  style={{width:'100%',background:'var(--s2)',border:'1px solid var(--b)',borderRadius:'10px',padding:'12px 14px',color:'var(--t1)',fontSize:'13px',outline:'none',fontFamily:'inherit'}}/>
              </div>
            </div>
            <button onClick={cambiarPassword} disabled={loading}
              style={{background:'var(--s2)',color:'var(--t1)',border:'1px solid var(--b)',borderRadius:'9px',padding:'12px 24px',fontWeight:600,fontSize:'14px',cursor:'pointer',fontFamily:'inherit'}}>
              {loading?'Updating...':'Update password'}
            </button>
          </div>

        </div>
      </main>
      <style>{`input:focus,select:focus{border-color:var(--c)!important;box-shadow:0 0 0 3px rgba(0,168,232,.12);}`}</style>
    </div>
  )
}
