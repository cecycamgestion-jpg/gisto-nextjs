'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const AIRTABLE_KEY = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY
const AIRTABLE_BASE = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID

export default function Dashboard() {
  const [videos, setVideos] = useState<any[]>([])
  const [filtro, setFiltro] = useState('todos')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/Videos?maxRecords=20`, {
      headers: { 'Authorization': `Bearer ${AIRTABLE_KEY}` }
    })
    .then(r => r.json())
    .then(data => {
      setVideos(data.records || [])
      setLoading(false)
    })
    .catch(() => setLoading(false))
  }, [])

  const filtrados = videos.filter(v => {
    const estado = v.fields?.Estado?.toLowerCase() || ''
    if (filtro === 'completados') return estado === 'completado'
    if (filtro === 'proceso') return estado === 'procesando'
    return true
  })

  const completados = videos.filter(v => v.fields?.Estado === 'Completado').length
  const modulos = videos.reduce((a, v) => a + (v.fields?.Modulos_detectados || 0), 0)

  const S = {
    wrap: { display:'flex', height:'100vh', overflow:'hidden', position:'relative' as const, zIndex:1 },
    sidebar: { width:'260px', background:'var(--s1)', borderRight:'1px solid var(--b)', padding:'20px 16px', display:'flex', flexDirection:'column' as const, flexShrink:0 },
    logo: { display:'flex', alignItems:'center', gap:'10px', textDecoration:'none', padding:'4px 8px', marginBottom:'36px' },
    logoText: { fontFamily:"'Cabinet Grotesk',sans-serif", fontWeight:900, fontSize:'18px', color:'var(--t1)' },
    navItem: (active:boolean) => ({ display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px', color: active?'var(--t1)':'var(--t2)', textDecoration:'none', borderRadius:'9px', marginBottom:'2px', fontSize:'14px', fontWeight:500, background: active?'rgba(0,168,232,0.08)':'transparent', border: active?'1px solid var(--b)':'1px solid transparent' }),
    main: { flex:1, overflow:'auto', display:'flex', flexDirection:'column' as const },
    topbar: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 28px', borderBottom:'1px solid var(--b)', background:'rgba(6,8,16,0.7)', backdropFilter:'blur(12px)', position:'sticky' as const, top:0, zIndex:50 },
    content: { padding:'24px 28px', flex:1 },
    statGrid: { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'14px', marginBottom:'24px' },
    statCard: { background:'var(--s1)', border:'1px solid var(--b)', borderRadius:'14px', padding:'18px' },
    uploadZone: { background:'rgba(0,168,232,0.03)', border:'1.5px dashed rgba(0,168,232,0.2)', borderRadius:'14px', padding:'22px', marginBottom:'24px', display:'flex', alignItems:'center', gap:'20px', textDecoration:'none', flexWrap:'wrap' as const },
    row: { display:'flex', alignItems:'center', gap:'14px', padding:'14px 16px', background:'var(--s1)', border:'1px solid var(--b)', borderRadius:'12px', marginBottom:'8px' },
    pill: (ok:boolean) => ({ padding:'4px 10px', borderRadius:'100px', fontSize:'11px', fontWeight:700, background: ok?'rgba(0,229,160,0.08)':'rgba(255,176,32,0.08)', color: ok?'var(--ok)':'var(--warn)', border:`1px solid ${ok?'rgba(0,229,160,0.2)':'rgba(255,176,32,0.2)'}` }),
    dlBtn: { display:'inline-flex', alignItems:'center', gap:'5px', background:'transparent', border:'1px solid var(--b)', color:'var(--t2)', padding:'6px 12px', borderRadius:'7px', fontSize:'12px', fontWeight:600, textDecoration:'none' },
  }

  const NavItem = ({href,label,icon,active}:{href:string,label:string,icon:string,active:boolean}) => (
    <Link href={href} style={S.navItem(active)}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={active?'var(--c)':'var(--t3)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={icon}/></svg>
      {label}
    </Link>
  )

  return (
    <div style={S.wrap}>
      <aside style={S.sidebar}>
        <Link href="/" style={S.logo}>
          <img src="/isotipo.png" alt="GISTO" style={{height:'34px'}}/>
          <span style={S.logoText}>THE <span style={{color:'var(--c)'}}>GISTO</span></span>
        </Link>
        <NavItem href="/dashboard" label="Dashboard" icon="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" active={true}/>
        <NavItem href="/upload" label="Subir video" icon="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" active={false}/>
        <NavItem href="/perfil" label="Mi perfil" icon="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" active={false}/>
        <NavItem href="/planes" label="Planes y pagos" icon="M1 4h22v16H1zM1 10h22" active={false}/>
        <div style={{marginTop:'auto',background:'rgba(0,168,232,0.06)',border:'1px solid var(--b)',borderRadius:'12px',padding:'14px'}}>
          <div style={{fontSize:'11px',color:'var(--t2)',marginBottom:'6px'}}>Créditos disponibles</div>
          <div style={{height:'5px',background:'rgba(0,168,232,0.12)',borderRadius:'3px',overflow:'hidden',marginBottom:'6px'}}>
            <div style={{height:'100%',width:'70%',background:'linear-gradient(90deg,var(--c),var(--c2))',borderRadius:'3px'}}/>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px',color:'var(--t2)'}}>
            <strong style={{color:'var(--c)'}}>14 min</strong><span>/ 20 min</span>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'14px 12px 0',borderTop:'1px solid var(--b)',marginTop:'12px'}}>
          <div style={{width:'32px',height:'32px',borderRadius:'50%',background:'linear-gradient(135deg,var(--c),var(--c2))',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Cabinet Grotesk',sans-serif",fontWeight:800,fontSize:'13px',color:'#000',flexShrink:0}}>A</div>
          <div><div style={{fontSize:'13px',fontWeight:700}}>Alejandro</div><div style={{fontSize:'11px',color:'var(--t2)'}}>Plan Gratuito</div></div>
        </div>
      </aside>

      <main style={S.main}>
        <div style={S.topbar}>
          <div>
            <h1 style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:'20px',fontWeight:800,letterSpacing:'-0.5px'}}>Dashboard</h1>
            <p style={{fontSize:'12px',color:'var(--t2)',marginTop:'1px'}}>Bienvenido de vuelta</p>
          </div>
          <Link href="/upload" style={{display:'inline-flex',alignItems:'center',gap:'6px',background:'var(--c)',color:'#000',padding:'9px 16px',borderRadius:'8px',fontWeight:700,fontSize:'13px',textDecoration:'none'}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nuevo video
          </Link>
        </div>

        <div style={S.content}>
          <div style={S.statGrid}>
            {[
              {label:'Créditos',val:'14 min',badge:'Freemium',bc:'var(--warn)',icon:'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2'},
              {label:'Videos procesados',val:String(videos.length),badge:'Total',bc:'var(--ok)',icon:'M23 7l-7 5 7 5V7zM1 5h15a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H1z'},
              {label:'Completados',val:String(completados),badge:'✓ OK',bc:'var(--ok)',icon:'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3'},
              {label:'Módulos generados',val:String(modulos),badge:'Total',bc:'var(--ok)',icon:'M22 12h-4l-3 9L9 3l-3 9H2'},
            ].map((s,i)=>(
              <div key={i} style={S.statCard}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
                  <div style={{width:'32px',height:'32px',background:'rgba(0,168,232,0.1)',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--c)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={s.icon}/></svg>
                  </div>
                  <span style={{fontSize:'10px',fontWeight:700,padding:'2px 8px',borderRadius:'100px',color:s.bc,background:`${s.bc}20`,border:`1px solid ${s.bc}40`}}>{s.badge}</span>
                </div>
                <div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:'28px',fontWeight:900,lineHeight:1,marginBottom:'3px'}}>{loading?'...':s.val}</div>
                <div style={{fontSize:'11px',color:'var(--t2)'}}>{s.label}</div>
              </div>
            ))}
          </div>

          <Link href="/upload" style={S.uploadZone}>
            <div style={{width:'52px',height:'52px',background:'rgba(0,168,232,0.1)',borderRadius:'12px',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--c)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
            </div>
            <div style={{flex:1}}>
              <h3 style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:'16px',fontWeight:700,marginBottom:'3px',color:'var(--t1)'}}>Procesar nuevo video</h3>
              <p style={{fontSize:'12px',color:'var(--t2)'}}>Arrastra un archivo, pega link de Drive o Dropbox</p>
            </div>
            <span style={{background:'var(--c)',color:'#000',padding:'9px 20px',borderRadius:'8px',fontSize:'13px',fontWeight:700}}>Subir ahora →</span>
          </Link>

          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'14px'}}>
            <div>
              <div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:'16px',fontWeight:700}}>Procesos recientes</div>
              <div style={{fontSize:'12px',color:'var(--t3)'}}>{videos.length} videos</div>
            </div>
            <div style={{display:'flex',gap:'4px',background:'var(--s1)',border:'1px solid var(--b)',padding:'3px',borderRadius:'8px'}}>
              {['todos','completados','proceso'].map(f=>(
                <button key={f} onClick={()=>setFiltro(f)} style={{padding:'5px 12px',borderRadius:'6px',fontSize:'12px',fontWeight:600,cursor:'pointer',border:'none',background:filtro===f?'var(--c)':'transparent',color:filtro===f?'#000':'var(--t2)'}}>
                  {f==='todos'?'Todos':f==='completados'?'Completados':'En proceso'}
                </button>
              ))}
            </div>
          </div>

          {loading && <div style={{textAlign:'center',padding:'40px',color:'var(--t3)'}}>Cargando...</div>}

          {!loading && filtrados.length === 0 && (
            <div style={{textAlign:'center',padding:'48px',color:'var(--t3)'}}>
              <div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:'16px',fontWeight:700,color:'var(--t2)',marginBottom:'8px'}}>Sin videos aún</div>
              <Link href="/upload" style={{color:'var(--c)',textDecoration:'none',fontSize:'13px'}}>Sube tu primer video →</Link>
            </div>
          )}

          {filtrados.map((v:any)=>{
            const f = v.fields || {}
            const done = f.Estado === 'Completado'
            return (
              <div key={v.id} style={S.row}>
                <div style={{width:'52px',height:'38px',background:done?'rgba(0,229,160,0.06)':'var(--s2)',border:`1px solid ${done?'rgba(0,229,160,0.15)':'var(--b)'}`,borderRadius:'6px',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={done?'var(--ok)':'var(--t3)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:'14px',fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',marginBottom:'3px'}}>{f.VideoID || 'Sin nombre'}</div>
                  <div style={{fontSize:'11px',color:'var(--t2)',display:'flex',gap:'8px'}}>
                    {f['Duración'] && <span>{Math.round(f['Duración']/60)} min</span>}
                    {f.Modulos_detectados && <><span>·</span><span>{f.Modulos_detectados} módulos</span></>}
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:'8px',flexShrink:0}}>
                  <span style={S.pill(done)}>{done?'Completado':f.Estado||'Pendiente'}</span>
                  {done && f.Resultado && (
                    <a href={f.Resultado} target="_blank" style={S.dlBtn}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                      ZIP
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
