'use client'
import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

const PROGRESS_MESSAGES = [
  'Transcribiendo audio...','Analizando contenido pedagógico...','Limpiando interacciones del aula...',
  'Aplicando corte anatómico...','Aplicando magia GISTO ✨','Empaquetando tu curso...',
  'Un momento por favor...','Casi listo...',
]

const MAX_CREDITOS: any = {
  'Free':40,'Starter':120,'Professional':480,'Profesional':480,'Academia':1200
}

function AnimatedProgress({createdAt}: {createdAt: string}) {
  const [msgIdx, setMsgIdx] = React.useState(0)
  React.useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - new Date(createdAt).getTime()
      setMsgIdx(Math.floor(elapsed / 20000) % PROGRESS_MESSAGES.length)
    }, 1000)
    return () => clearInterval(interval)
  }, [createdAt])
  return (
    <div style={{padding:'0 16px 16px'}}>
      <div style={{background:'var(--s2)',borderRadius:'10px',padding:'16px',border:'1px solid rgba(255,176,32,.15)'}}>
        <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'12px'}}>
          <span style={{width:'7px',height:'7px',borderRadius:'50%',background:'var(--warn)',boxShadow:'0 0 8px var(--warn)',flexShrink:0,animation:'pulse 1s infinite',display:'inline-block'}}/>
          <span style={{fontSize:'13px',fontWeight:600,color:'var(--warn)'}}>{PROGRESS_MESSAGES[msgIdx]}</span>
        </div>
        <div style={{height:'4px',background:'rgba(255,255,255,.06)',borderRadius:'2px',overflow:'hidden',position:'relative' as const}}>
          <div style={{position:'absolute' as const,height:'100%',width:'40%',background:'linear-gradient(90deg,transparent,var(--c),var(--c2),transparent)',borderRadius:'2px',animation:'indeterminate 1.8s ease-in-out infinite',boxShadow:'0 0 12px rgba(0,168,232,.6)'}}/>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [videos, setVideos] = useState<any[]>([])
  const [filtro, setFiltro] = useState('todos')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [creditos, setCreditos] = useState(0)
  const [creditosMax, setCreditosMax] = useState(40)
  const [descargando, setDescargando] = useState<string|null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  )

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // ── C32: Fetch videos via API route server-side ────────────────────────
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
    if (u) {
      const parsed = JSON.parse(u)
      setUser(parsed)
      setCreditos(parsed.creditos || 0)
      setCreditosMax(MAX_CREDITOS[parsed.plan] || 40)
    }

    // ── C32: Fetch usuario via API route — datos frescos ──────────────────
    fetch('/api/airtable/usuario')
      .then(r => r.json())
      .then(data => {
        if (data.error) return
        const cred = data.creditos || 0
        const plan = data.plan || 'Free'
        setCreditos(cred)
        setCreditosMax(MAX_CREDITOS[plan] || 40)
        const stored = localStorage.getItem('gisto_user')
        const parsed = stored ? JSON.parse(stored) : {}
        const updated = {...parsed, creditos: cred, plan, nombre: data.nombre}
        localStorage.setItem('gisto_user', JSON.stringify(updated))
        setUser(updated)
      })
      .catch(() => {})

    fetchVideos()
    const interval = setInterval(fetchVideos, 8000)
    return () => clearInterval(interval)
  }, [fetchVideos])

  // ── C25: Descarga ZIP con presigned URL fresco ─────────────────────────
  async function descargarZip(record: any) {
    const f = record.fields || {}
    const zipKey = f.Zip_Key || f.zip_key
    if (!zipKey && f.Resultado) { window.open(f.Resultado, '_blank'); return }
    if (!zipKey) return
    setDescargando(record.id)
    try {
      const r = await fetch('/api/download', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({zip_key: zipKey})
      })
      const data = await r.json()
      if (data.download_url) window.open(data.download_url, '_blank')
    } catch {}
    finally { setDescargando(null) }
  }

  // ── C26: Duracion entregada ────────────────────────────────────────────
  function formatDuracion(f: any) {
    const dur = f['Duracion_entregada'] || f['Duración'] || 0
    if (!dur) return null
    return `${Math.floor(dur/60)}m ${Math.round(dur%60)}s`
  }

  const hayProcesando = videos.some(v => {
    const e = v.fields?.Estado?.toLowerCase()
    return e === 'procesando' || e === 'pendiente'
  })
  const filtrados = videos.filter(v => {
    const e = v.fields?.Estado?.toLowerCase() || ''
    if(filtro === 'completados') return e === 'completado'
    if(filtro === 'proceso') return e === 'procesando' || e === 'pendiente'
    return true
  })
  const modulos = videos.reduce((a,v) => a + (v.fields?.Modulos_detectados || 0), 0)
  const enProceso = videos.filter(v => {
    const e = v.fields?.Estado?.toLowerCase()
    return e === 'procesando' || e === 'pendiente'
  }).length

  function formatFecha(record: any) {
    const d = new Date(record.fields?.['Created time'] || record.createdTime)
    if(isNaN(d.getTime())) return ''
    const diff = Date.now() - d.getTime()
    const mins = Math.floor(diff/60000), hrs = Math.floor(mins/60), days = Math.floor(hrs/24)
    if(mins < 1) return 'Ahora'
    if(mins < 60) return `Hace ${mins} min`
    if(hrs < 24) return `Hace ${hrs}h`
    return `Hace ${days}d`
  }

  const closeSidebar = () => setSidebarOpen(false)

  const S = {
    wrap:{display:'flex',height:'100vh',overflow:'hidden',position:'relative' as const,zIndex:1},
    overlay:{display:isMobile&&sidebarOpen?'block':'none',position:'fixed' as const,inset:0,background:'rgba(0,0,0,.6)',zIndex:99,cursor:'pointer'},
    sidebar:{width:'260px',background:'var(--s1)',borderRight:'1px solid var(--b)',padding:'20px 16px',display:'flex',flexDirection:'column' as const,flexShrink:0,
      ...(isMobile?{position:'fixed' as const,top:0,left:0,bottom:0,zIndex:100,transform:sidebarOpen?'translateX(0)':'translateX(-100%)',transition:'transform .3s ease',boxShadow:sidebarOpen?'4px 0 32px rgba(0,0,0,.6)':'none'}:{position:'relative' as const})},
    hamburger:{display:isMobile?'flex':'none',alignItems:'center' as const,justifyContent:'center' as const,background:'rgba(255,255,255,.06)',border:'1px solid var(--b)',borderRadius:'8px',color:'var(--t1)',padding:'8px',cursor:'pointer',marginRight:'8px',flexShrink:0},
    main:{flex:1,overflow:'auto',display:'flex',flexDirection:'column' as const,minWidth:0},
    topbar:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',borderBottom:'1px solid var(--b)',background:'rgba(6,8,16,.7)',backdropFilter:'blur(12px)',position:'sticky' as const,top:0,zIndex:50,flexShrink:0},
    content:{padding:isMobile?'16px':'24px 28px',flex:1},
    statGrid:{display:'grid',gridTemplateColumns:isMobile?'repeat(2,1fr)':'repeat(4,1fr)',gap:'14px',marginBottom:'24px'},
    statCard:{background:'var(--s1)',border:'1px solid var(--b)',borderRadius:'14px',padding:'18px',transition:'.2s'},
  }

  const NavItem = ({href,label,icon,active,badge}:{href:string,label:string,icon:string,active:boolean,badge?:number}) => (
    <Link href={href} onClick={()=>isMobile&&closeSidebar()}
      style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 12px',color:active?'var(--t1)':'var(--t2)',textDecoration:'none',borderRadius:'9px',marginBottom:'2px',fontSize:'14px',fontWeight:500,background:active?'rgba(0,168,232,0.08)':'transparent',border:active?'1px solid var(--b)':'1px solid transparent'}}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={active?'var(--c)':'var(--t3)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={icon}/></svg>
      {label}
      {badge?<span style={{marginLeft:'auto',background:'var(--c)',color:'#000',fontSize:'10px',fontWeight:800,padding:'1px 7px',borderRadius:'100px'}}>{badge}</span>:null}
    </Link>
  )

  return (
    <div style={S.wrap}>
      <div style={S.overlay} onClick={closeSidebar}/>
      <aside style={S.sidebar}>
        <Link href="/" style={{display:'flex',alignItems:'center',gap:'10px',textDecoration:'none',padding:'4px 8px',marginBottom:'36px'}}>
          <img src="/isotipo.png" alt="GISTO" style={{height:'34px'}}/>
          <span style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontWeight:900,fontSize:'18px',color:'var(--t1)'}}>THE <span style={{color:'var(--c)'}}>GISTO</span></span>
        </Link>
        <NavItem href="/dashboard" label="Dashboard" icon="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" active={true}/>
        <NavItem href="/upload" label="Subir video" icon="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" active={false} badge={enProceso||undefined}/>
        <NavItem href="/perfil" label="Mi perfil" icon="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" active={false}/>
        <NavItem href="/planes" label="Planes y pagos" icon="M1 4h22v16H1zM1 10h22" active={false}/>

        <div style={{marginTop:'auto',background:'rgba(0,168,232,.06)',border:'1px solid var(--b)',borderRadius:'12px',padding:'14px'}}>
          <div style={{fontSize:'11px',color:'var(--t2)',marginBottom:'6px'}}>Créditos disponibles</div>
          <div style={{height:'5px',background:'rgba(0,168,232,.12)',borderRadius:'3px',overflow:'hidden',marginBottom:'6px'}}>
            <div style={{height:'100%',width:`${Math.min(100,(creditos/creditosMax)*100)}%`,background:'linear-gradient(90deg,var(--c),var(--c2))',borderRadius:'3px',transition:'width .5s'}}/>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px',color:'var(--t2)'}}>
            <strong style={{color:'var(--c)'}}>{creditos} min</strong>
            <span>/ {creditosMax} min</span>
          </div>
        </div>

        <Link href="/perfil" onClick={()=>isMobile&&closeSidebar()}
          style={{display:'flex',alignItems:'center',gap:'10px',padding:'14px 12px 0',borderTop:'1px solid var(--b)',marginTop:'12px',textDecoration:'none'}}>
          <div style={{width:'32px',height:'32px',borderRadius:'50%',background:'linear-gradient(135deg,var(--c),var(--c2))',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Cabinet Grotesk',sans-serif",fontWeight:800,fontSize:'13px',color:'#000',flexShrink:0}}>
            {user?.nombre?.[0]?.toUpperCase()||'U'}
          </div>
          <div>
            <div style={{fontSize:'13px',fontWeight:700}}>{user?.nombre||'Usuario'}</div>
            <div style={{fontSize:'11px',color:'var(--t2)'}}>{user?.plan||'Plan Gratuito'}</div>
          </div>
        </Link>
      </aside>

      <main style={S.main}>
        <div style={S.topbar}>
          <div style={{display:'flex',alignItems:'center'}}>
            <button style={S.hamburger} onClick={()=>setSidebarOpen(v=>!v)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <div>
              <h1 style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:'20px',fontWeight:800,letterSpacing:'-.5px'}}>Dashboard</h1>
              <p style={{fontSize:'12px',color:'var(--t2)',marginTop:'1px',display:'flex',alignItems:'center',gap:'6px'}}>
                {hayProcesando&&<span style={{width:'6px',height:'6px',borderRadius:'50%',background:'var(--warn)',boxShadow:'0 0 6px var(--warn)',display:'inline-block',animation:'pulse 1.5s infinite'}}/>}
                {hayProcesando?'Motor GISTO procesando...':'Todo al día'}
              </p>
            </div>
          </div>
          <Link href="/upload" style={{display:'inline-flex',alignItems:'center',gap:'6px',background:'var(--c)',color:'#000',padding:'9px 16px',borderRadius:'8px',fontWeight:700,fontSize:'13px',textDecoration:'none'}}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            {isMobile?'Nuevo':'Nuevo video'}
          </Link>
        </div>

        <div style={S.content}>
          <div style={S.statGrid}>
            {[
              {label:'Créditos',val:`${creditos} min`,badge:user?.plan||'Free',bc:'var(--warn)',icon:'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2'},
              {label:'Videos procesados',val:String(videos.length),badge:'Total',bc:'var(--ok)',icon:'M23 7l-7 5 7 5V7zM1 5h15a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H1z'},
              {label:'Módulos generados',val:String(modulos),badge:'Total',bc:'var(--ok)',icon:'M22 12h-4l-3 9L9 3l-3 9H2'},
              {label:'En proceso',val:String(enProceso),badge:enProceso>0?'Activo':'Libre',bc:enProceso>0?'var(--warn)':'var(--ok)',icon:'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2'},
            ].map((s,i)=>(
              <div key={i} style={S.statCard}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
                  <div style={{width:'32px',height:'32px',background:'rgba(0,168,232,.1)',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--c)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={s.icon}/></svg>
                  </div>
                  <span style={{fontSize:'10px',fontWeight:700,padding:'2px 8px',borderRadius:'100px',color:s.bc,background:`${s.bc}20`,border:`1px solid ${s.bc}40`}}>{s.badge}</span>
                </div>
                <div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:'28px',fontWeight:900,lineHeight:1,marginBottom:'3px'}}>{loading?'...':s.val}</div>
                <div style={{fontSize:'11px',color:'var(--t2)'}}>{s.label}</div>
              </div>
            ))}
          </div>

          <Link href="/upload" style={{display:'flex',alignItems:'center',gap:'20px',background:'rgba(0,168,232,.03)',border:'1.5px dashed rgba(0,168,232,.2)',borderRadius:'14px',padding:'20px 24px',marginBottom:'24px',textDecoration:'none',flexWrap:'wrap' as const,transition:'.3s'}}>
            <div style={{width:'48px',height:'48px',background:'rgba(0,168,232,.1)',borderRadius:'12px',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--c)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
            </div>
            <div style={{flex:1}}>
              <h3 style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:'16px',fontWeight:700,marginBottom:'3px',color:'var(--t1)'}}>Procesar nuevo video</h3>
              <p style={{fontSize:'12px',color:'var(--t2)'}}>Arrastra un archivo o pega link de Drive / Dropbox</p>
            </div>
            <span style={{background:'var(--c)',color:'#000',padding:'9px 20px',borderRadius:'8px',fontSize:'13px',fontWeight:700}}>Subir →</span>
          </Link>

          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'14px',flexWrap:'wrap' as const,gap:'12px'}}>
            <div>
              <div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:'16px',fontWeight:700}}>Mis videos</div>
              <div style={{fontSize:'12px',color:'var(--t3)'}}>{videos.length} videos · actualiza automáticamente</div>
            </div>
            <div style={{display:'flex',gap:'4px',background:'var(--s1)',border:'1px solid var(--b)',padding:'3px',borderRadius:'8px'}}>
              {['todos','completados','proceso'].map(f=>(
                <button key={f} onClick={()=>setFiltro(f)}
                  style={{padding:'5px 12px',borderRadius:'6px',fontSize:'12px',fontWeight:600,cursor:'pointer',border:'none',background:filtro===f?'var(--c)':'transparent',color:filtro===f?'#000':'var(--t2)'}}>
                  {f==='todos'?'Todos':f==='completados'?'Completados':'En proceso'}
                </button>
              ))}
            </div>
          </div>

          {loading&&<div style={{textAlign:'center',padding:'40px',color:'var(--t3)'}}>Cargando...</div>}
          {!loading&&filtrados.length===0&&(
            <div style={{textAlign:'center',padding:'48px',color:'var(--t3)',background:'var(--s1)',borderRadius:'14px',border:'1px solid var(--b)'}}>
              <div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:'16px',fontWeight:700,color:'var(--t2)',marginBottom:'8px'}}>Sin videos aún</div>
              <Link href="/upload" style={{color:'var(--c)',textDecoration:'none',fontSize:'13px'}}>Sube tu primer video →</Link>
            </div>
          )}

          {filtrados.map((v:any)=>{
            const f = v.fields || {}
            const estado = f.Estado || 'Pendiente'
            const done = estado === 'Completado'
            const processing = estado === 'Procesando' || estado === 'Pendiente'
            const durText = formatDuracion(f)
            return (
              <div key={v.id} style={{background:'var(--s1)',border:`1px solid ${processing?'rgba(255,176,32,.2)':done?'rgba(0,229,160,.15)':'var(--b)'}`,borderRadius:'14px',marginBottom:'10px',overflow:'hidden',transition:'.3s'}}>
                <div style={{display:'flex',alignItems:'center',gap:'14px',padding:'14px 16px'}}>
                  <div style={{width:'48px',height:'36px',background:done?'rgba(0,229,160,.06)':processing?'rgba(255,176,32,.06)':'var(--s2)',border:`1px solid ${done?'rgba(0,229,160,.15)':processing?'rgba(255,176,32,.15)':'var(--b)'}`,borderRadius:'6px',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={done?'var(--ok)':processing?'var(--warn)':'var(--t3)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:'14px',fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',marginBottom:'3px'}}>{f.VideoID||'Sin nombre'}</div>
                    <div style={{fontSize:'11px',color:'var(--t2)',display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap' as const}}>
                      {durText&&<span>{durText}</span>}
                      {f.Modulos_detectados&&<><span style={{color:'var(--t3)'}}>·</span><span>{f.Modulos_detectados} módulos</span></>}
                      <span style={{color:'var(--t3)'}}>·</span>
                      <span>{formatFecha(v)}</span>
                    </div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:'8px',flexShrink:0}}>
                    <span style={{padding:'4px 10px',borderRadius:'100px',fontSize:'11px',fontWeight:700,background:done?'rgba(0,229,160,.08)':processing?'rgba(255,176,32,.08)':'rgba(255,255,255,.05)',color:done?'var(--ok)':processing?'var(--warn)':'var(--t2)',border:`1px solid ${done?'rgba(0,229,160,.2)':processing?'rgba(255,176,32,.2)':'rgba(255,255,255,.1)'}`}}>
                      {estado}
                    </span>
                    {done&&(f.Resultado||f.Zip_Key)&&(
                      <button onClick={()=>descargarZip(v)} disabled={descargando===v.id}
                        style={{display:'inline-flex',alignItems:'center',gap:'5px',background:'transparent',border:'1px solid var(--b)',color:'var(--t2)',padding:'6px 12px',borderRadius:'7px',fontSize:'12px',fontWeight:600,cursor:'pointer',transition:'.2s',opacity:descargando===v.id?0.6:1}}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                        {descargando===v.id?'...':(isMobile?'ZIP':'Descargar ZIP')}
                      </button>
                    )}
                  </div>
                </div>
                {processing&&<AnimatedProgress createdAt={f?.['Created time']||v.createdTime||v.id}/>}
                {done&&(
                  <div style={{padding:'0 16px 14px',display:'flex',gap:'8px',flexWrap:'wrap' as const}}>
                    {[`${f.Modulos_detectados||'?'} cápsulas de video`,`${f.Modulos_detectados||'?'} guías de estudio`,'Quiz y glosario','Bibliografía APA'].map((item,i)=>(
                      <span key={i} style={{fontSize:'11px',color:'var(--ok)',background:'rgba(0,229,160,.06)',border:'1px solid rgba(0,229,160,.15)',padding:'3px 10px',borderRadius:'100px',display:'flex',alignItems:'center',gap:'4px'}}>
                        <span style={{fontSize:'9px',fontWeight:700}}>✓</span>{item}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </main>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}@keyframes indeterminate{0%{left:-40%;right:100%}60%{left:100%;right:-40%}100%{left:100%;right:-40%}}`}</style>
    </div>
  )
}
