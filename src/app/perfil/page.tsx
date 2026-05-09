'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const AIRTABLE_KEY = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY
const AIRTABLE_BASE = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID

const PAISES = ['Perú','México','Colombia','Argentina','Chile','Ecuador','Bolivia','Venezuela','España','Otro']

export default function Perfil() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [nombre, setNombre] = useState('')
  const [pais, setPais] = useState('')
  const [pwActual, setPwActual] = useState('')
  const [pwNueva, setPwNueva] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState<'ok'|'err'>('ok')

  useEffect(() => {
    const u = localStorage.getItem('gisto_user')
    if (!u) { router.push('/login'); return }
    const parsed = JSON.parse(u)
    setUser(parsed)
    setNombre(parsed.nombre || '')
    setPais(parsed.pais || '')
  }, [])

  function logout() {
    localStorage.removeItem('gisto_user')
    document.cookie = 'gisto_session=; path=/; max-age=0'
    router.push('/login')
  }

  async function guardarPerfil() {
    if (!nombre.trim()) { setMsg('El nombre no puede estar vacío'); setMsgType('err'); return }
    setLoading(true)
    try {
      await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/Usuarios/${user.id}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${AIRTABLE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { Nombre: nombre, Pais: pais } })
      })
      const updated = { ...user, nombre, pais }
      localStorage.setItem('gisto_user', JSON.stringify(updated))
      setUser(updated)
      setMsg('Perfil actualizado correctamente'); setMsgType('ok')
    } catch { setMsg('Error al guardar'); setMsgType('err') }
    setLoading(false)
  }

  async function cambiarPassword() {
    if (!pwActual || !pwNueva) { setMsg('Completa ambos campos'); setMsgType('err'); return }
    if (pwNueva.length < 6) { setMsg('La nueva contraseña debe tener al menos 6 caracteres'); setMsgType('err'); return }
    setLoading(true)
    try {
      const r = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/Usuarios/${user.id}`, {
        headers: { 'Authorization': `Bearer ${AIRTABLE_KEY}` }
      })
      const data = await r.json()
      if (data.fields?.Password !== pwActual) { setMsg('Contraseña actual incorrecta'); setMsgType('err'); setLoading(false); return }
      await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/Usuarios/${user.id}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${AIRTABLE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { Password: pwNueva } })
      })
      setPwActual(''); setPwNueva('')
      setMsg('Contraseña actualizada correctamente'); setMsgType('ok')
    } catch { setMsg('Error al cambiar contraseña'); setMsgType('err') }
    setLoading(false)
  }

  if (!user) return null

  const planColors: any = { Free: 'var(--t2)', Starter: 'var(--c)', Profesional: 'var(--ok)', Academia: '#FFB020' }

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
          {href:'/upload',label:'Subir video',icon:'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12'},
          {href:'/planes',label:'Planes y pagos',icon:'M1 4h22v16H1zM1 10h22'},
        ].map(item=>(
          <Link key={item.href} href={item.href} style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 12px',color:'var(--t2)',textDecoration:'none',borderRadius:'9px',marginBottom:'2px',fontSize:'14px',fontWeight:500,border:'1px solid transparent'}}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon}/></svg>
            {item.label}
          </Link>
        ))}
        <Link href="/perfil" style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 12px',color:'var(--t1)',textDecoration:'none',borderRadius:'9px',marginBottom:'2px',fontSize:'14px',fontWeight:500,background:'rgba(0,168,232,0.08)',border:'1px solid var(--b)'}}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--c)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/></svg>
          Mi perfil
        </Link>
        <button onClick={logout} style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 12px',color:'var(--err)',background:'none',border:'none',borderRadius:'9px',marginTop:'auto',fontSize:'14px',fontWeight:500,cursor:'pointer',width:'100%'}}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          Cerrar sesión
        </button>
      </aside>

      {/* MAIN */}
      <main style={{flex:1,overflow:'auto',padding:'32px 40px'}}>
        <div style={{maxWidth:'640px',margin:'0 auto'}}>
          <h1 style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:'28px',fontWeight:900,letterSpacing:'-1px',marginBottom:'4px'}}>Mi perfil</h1>
          <p style={{fontSize:'14px',color:'var(--t2)',marginBottom:'32px'}}>Gestiona tu cuenta y créditos</p>

          {/* PLAN & CREDITOS */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px',marginBottom:'28px'}}>
            <div style={{background:'var(--s1)',border:'1px solid var(--b)',borderRadius:'14px',padding:'20px'}}>
              <div style={{fontSize:'11px',fontWeight:700,color:'var(--t3)',letterSpacing:'1.5px',textTransform:'uppercase' as const,marginBottom:'10px'}}>Plan actual</div>
              <div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:'26px',fontWeight:900,color:planColors[user.plan]||'var(--c)'}}>{user.plan||'Free'}</div>
              <Link href="/planes" style={{fontSize:'12px',color:'var(--c)',textDecoration:'none',display:'inline-block',marginTop:'6px'}}>Ver todos los planes →</Link>
            </div>
            <div style={{background:'var(--s1)',border:'1px solid var(--b)',borderRadius:'14px',padding:'20px'}}>
              <div style={{fontSize:'11px',fontWeight:700,color:'var(--t3)',letterSpacing:'1.5px',textTransform:'uppercase' as const,marginBottom:'10px'}}>Créditos</div>
              <div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:'26px',fontWeight:900,color:'var(--c)'}}>{user.creditos||0} <span style={{fontSize:'14px',fontWeight:400,color:'var(--t2)'}}>min</span></div>
              <div style={{height:'5px',background:'rgba(0,168,232,.12)',borderRadius:'3px',overflow:'hidden',marginTop:'10px'}}>
                <div style={{height:'100%',width:`${Math.min(100,(user.creditos||0)/20*100)}%`,background:'linear-gradient(90deg,var(--c),var(--c2))',borderRadius:'3px'}}/>
              </div>
            </div>
          </div>

          {/* DATOS */}
          <div style={{background:'var(--s1)',border:'1px solid var(--b)',borderRadius:'16px',padding:'24px',marginBottom:'16px'}}>
            <div style={{height:'2px',background:'linear-gradient(90deg,transparent,var(--c),var(--c2),transparent)',margin:'-24px -24px 20px'}}/>
            <h2 style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:'16px',fontWeight:700,marginBottom:'18px'}}>Datos personales</h2>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'16px'}}>
              <div>
                <label style={{fontSize:'11px',fontWeight:700,color:'var(--t3)',letterSpacing:'1.5px',textTransform:'uppercase' as const,display:'block',marginBottom:'8px'}}>Nombre</label>
                <input value={nombre} onChange={e=>setNombre(e.target.value)} style={{width:'100%',background:'var(--s2)',border:'1px solid var(--b)',borderRadius:'10px',padding:'12px 14px',color:'var(--t1)',fontSize:'13px',outline:'none',fontFamily:'inherit'}}/>
              </div>
              <div>
                <label style={{fontSize:'11px',fontWeight:700,color:'var(--t3)',letterSpacing:'1.5px',textTransform:'uppercase' as const,display:'block',marginBottom:'8px'}}>Email</label>
                <input value={user.email} disabled style={{width:'100%',background:'rgba(255,255,255,.03)',border:'1px solid var(--b)',borderRadius:'10px',padding:'12px 14px',color:'var(--t2)',fontSize:'13px',fontFamily:'inherit',cursor:'not-allowed'}}/>
              </div>
            </div>
            <div style={{marginBottom:'20px'}}>
              <label style={{fontSize:'11px',fontWeight:700,color:'var(--t3)',letterSpacing:'1.5px',textTransform:'uppercase' as const,display:'block',marginBottom:'8px'}}>País</label>
              <select value={pais} onChange={e=>setPais(e.target.value)} style={{width:'100%',background:'var(--s2)',border:'1px solid var(--b)',borderRadius:'10px',padding:'12px 14px',color:'var(--t1)',fontSize:'13px',outline:'none',fontFamily:'inherit',cursor:'pointer'}}>
                <option value="">Selecciona tu país</option>
                {PAISES.map(p=><option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            {msg&&<div style={{padding:'10px 14px',borderRadius:'9px',fontSize:'13px',marginBottom:'14px',background:msgType==='ok'?'rgba(0,229,160,.08)':'rgba(255,70,100,.08)',border:`1px solid ${msgType==='ok'?'rgba(0,229,160,.2)':'rgba(255,70,100,.2)'}`,color:msgType==='ok'?'var(--ok)':'var(--err)'}}>{msgType==='ok'?'✓':''} {msg}</div>}
            <button onClick={guardarPerfil} disabled={loading} style={{background:'var(--c)',color:'#000',border:'none',borderRadius:'9px',padding:'12px 24px',fontWeight:700,fontSize:'14px',cursor:'pointer',fontFamily:'inherit'}}>
              {loading?'Guardando...':'Guardar cambios'}
            </button>
          </div>

          {/* CAMBIAR CONTRASEÑA */}
          <div style={{background:'var(--s1)',border:'1px solid var(--b)',borderRadius:'16px',padding:'24px'}}>
            <h2 style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:'16px',fontWeight:700,marginBottom:'18px'}}>Cambiar contraseña</h2>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'16px'}}>
              <div>
                <label style={{fontSize:'11px',fontWeight:700,color:'var(--t3)',letterSpacing:'1.5px',textTransform:'uppercase' as const,display:'block',marginBottom:'8px'}}>Contraseña actual</label>
                <input type="password" value={pwActual} onChange={e=>setPwActual(e.target.value)} style={{width:'100%',background:'var(--s2)',border:'1px solid var(--b)',borderRadius:'10px',padding:'12px 14px',color:'var(--t1)',fontSize:'13px',outline:'none',fontFamily:'inherit'}}/>
              </div>
              <div>
                <label style={{fontSize:'11px',fontWeight:700,color:'var(--t3)',letterSpacing:'1.5px',textTransform:'uppercase' as const,display:'block',marginBottom:'8px'}}>Nueva contraseña</label>
                <input type="password" value={pwNueva} onChange={e=>setPwNueva(e.target.value)} style={{width:'100%',background:'var(--s2)',border:'1px solid var(--b)',borderRadius:'10px',padding:'12px 14px',color:'var(--t1)',fontSize:'13px',outline:'none',fontFamily:'inherit'}}/>
              </div>
            </div>
            <button onClick={cambiarPassword} disabled={loading} style={{background:'var(--s2)',color:'var(--t1)',border:'1px solid var(--b)',borderRadius:'9px',padding:'12px 24px',fontWeight:600,fontSize:'14px',cursor:'pointer',fontFamily:'inherit'}}>
              {loading?'Cambiando...':'Cambiar contraseña'}
            </button>
          </div>
        </div>
      </main>
      <style>{`input:focus,select:focus{border-color:var(--c)!important;box-shadow:0 0 0 3px rgba(0,168,232,.12);}`}</style>
    </div>
  )
}
