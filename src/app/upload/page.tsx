'use client'
import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'

const RAILWAY_URL = process.env.NEXT_PUBLIC_RAILWAY_URL
const AIRTABLE_KEY = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY
const AIRTABLE_BASE = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID

type Step = 'form' | 'analyzing' | 'uploading' | 'queued' | 'error'

interface Analisis {
  duracion_texto: string
  duracion_minutos: number
  modulos_sugeridos: number
  modulos_minimo: number
  modulos_maximo: number
  minutos_por_modulo: number
  mensaje: string
}

function getMimeType(file: File): string {
  if (file.type) return file.type
  const ext = file.name.split('.').pop()?.toLowerCase()
  const map: Record<string, string> = {
    mp4: 'video/mp4', mov: 'video/quicktime', avi: 'video/x-msvideo',
    mkv: 'video/x-matroska', webm: 'video/webm', wmv: 'video/x-ms-wmv',
  }
  return map[ext || ''] || 'video/mp4'
}

const ENTREGABLES = [
  {icon:'M23 7l-7 5 7 5V7zM1 5h15a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H1z',label:'Cápsulas de video',desc:'Por concepto completo',color:'#E25C5C',bg:'rgba(226,92,92,.08)',border:'rgba(226,92,92,.18)'},
  {icon:'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6',label:'Guía de estudio',desc:'Word editable con resumen',color:'#4A90D9',bg:'rgba(74,144,217,.08)',border:'rgba(74,144,217,.18)'},
  {icon:'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',label:'Quiz multinivel',desc:'Básico, intermedio, avanzado',color:'#00E5A0',bg:'rgba(0,229,160,.08)',border:'rgba(0,229,160,.18)'},
  {icon:'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z',label:'Glosario técnico',desc:'Términos del contenido',color:'#00A8E8',bg:'rgba(0,168,232,.08)',border:'rgba(0,168,232,.18)'},
  {icon:'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',label:'Bibliografía APA',desc:'Con links oficiales',color:'#FFB020',bg:'rgba(255,176,32,.08)',border:'rgba(255,176,32,.18)'},
  {icon:'M21 8l-8-5-8 5v10l8 5 8-5V8z',label:'ZIP para tu LMS',desc:'Moodle, Canvas, Hotmart',color:'#A078FF',bg:'rgba(160,120,255,.08)',border:'rgba(160,120,255,.18)'},
]

const BTN_GRAD = 'linear-gradient(135deg,#00A8E8,#00D4FF)'
const BTN_GRAD_H = 'linear-gradient(135deg,#00B8F8,#00E4FF)'
const BTN_SHADOW = '0 4px 20px rgba(0,168,232,0.35)'
const BTN_SHADOW_H = '0 8px 32px rgba(0,168,232,0.55)'

export default function Upload() {
  const [tab, setTab] = useState<'link'|'file'>('link')
  const [url, setUrl] = useState('')
  const [nombre, setNombre] = useState('')
  const [archivo, setArchivo] = useState<File|null>(null)
  const [step, setStep] = useState<Step>('form')
  const [progreso, setProgreso] = useState(0)
  const [error, setError] = useState('')
  const [drag, setDrag] = useState(false)
  const [btnHover, setBtnHover] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const onDrop = useCallback((e:React.DragEvent)=>{
    e.preventDefault(); setDrag(false)
    const f = e.dataTransfer.files[0]
    if(f?.type.startsWith('video/')) setArchivo(f)
  },[])

  async function subirS3(file: File): Promise<string> {
    const contentType = getMimeType(file)
    const r = await fetch(`${RAILWAY_URL}/get-upload-url`, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({filename: file.name, content_type: contentType})
    })
    if (!r.ok) throw new Error('Error obteniendo URL de subida')
    const {upload_url, public_url} = await r.json()
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
    if(tab==='link'){
      if(!url.startsWith('http')){setError('Ingresa un link válido de Drive o Dropbox');return}
      setStep('uploading')
      await guardarYProcesar(url)
    } else {
      if(!archivo){setError('Selecciona un archivo de video');return}
      setStep('uploading')
      try {
        const pubUrl = await subirS3(archivo)
        await guardarYProcesar(pubUrl)
      } catch(e:any){ setError(e.message); setStep('error') }
    }
  }

  async function guardarYProcesar(vUrl: string) {
    try {
      const userStr = localStorage.getItem('gisto_user')
      if (!userStr) { setError('Debes iniciar sesión'); setStep('error'); return }
      const userData = JSON.parse(userStr)
      const creditos = userData.creditos || 0

      let duracionMin = 0
      try {
        const ar = await fetch(`${RAILWAY_URL}/analizar-video`, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({video_url: vUrl})
        })
        if (ar.ok) { const a = await ar.json(); duracionMin = a.duracion_minutos || 0 }
      } catch {}

      if (duracionMin > 0 && creditos < duracionMin) {
        setError(`Tu video dura ${Math.round(duracionMin)} min pero solo tienes ${creditos} min de crédito.`)
        setStep('error'); return
      }

      const r = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/Videos`, {
        method: 'POST',
        headers: {'Authorization': `Bearer ${AIRTABLE_KEY}`, 'Content-Type': 'application/json'},
        body: JSON.stringify({fields: {
          URL: vUrl,
          VideoID: nombre || `Video-${Date.now()}`,
          Estado: 'Pendiente',
          Usuario_Email: JSON.parse(localStorage.getItem('gisto_user')||'{}').email || ''
        }})
      })
      if (!r.ok) throw new Error('Error registrando video')
      setStep('queued')
    } catch(e:any){ setError(e.message); setStep('error') }
  }

  const sidebar = (
    <aside style={{width:'260px',background:'var(--s1)',borderRight:'1px solid var(--b)',padding:'20px 16px',display:'flex',flexDirection:'column' as const,flexShrink:0}}>
      <Link href="/" style={{display:'flex',alignItems:'center',gap:'10px',textDecoration:'none',marginBottom:'32px'}}>
        <img src="/isotipo.png" alt="GISTO" style={{height:'52px',width:'auto',objectFit:'contain'}}/>
        <span style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontWeight:900,fontSize:'18px',color:'var(--t1)'}}>THE <span style={{color:'var(--c)'}}>GISTO</span></span>
      </Link>
      {[
        {href:'/dashboard',label:'Dashboard',icon:'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',active:false},
        {href:'/upload',label:'Subir video',icon:'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',active:true},
        {href:'/perfil',label:'Mi perfil',icon:'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',active:false},
        {href:'/planes',label:'Planes y pagos',icon:'M1 4h22v16H1zM1 10h22',active:false},
      ].map(item=>(
        <Link key={item.href} href={item.href} style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 12px',color:item.active?'var(--t1)':'var(--t2)',textDecoration:'none',borderRadius:'9px',marginBottom:'2px',fontSize:'14px',fontWeight:500,background:item.active?'rgba(0,168,232,0.08)':'transparent',border:item.active?'1px solid var(--b)':'1px solid transparent'}}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={item.active?'var(--c)':'var(--t3)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon}/></svg>
          {item.label}
        </Link>
      ))}
      <div style={{marginTop:'auto'}}>
        <div style={{fontSize:'10px',fontWeight:700,letterSpacing:'2px',textTransform:'uppercase' as const,color:'var(--t3)',marginBottom:'10px',paddingLeft:'2px'}}>Lo que recibirás</div>
        <div style={{display:'flex',flexDirection:'column' as const,gap:'5px'}}>
          {ENTREGABLES.map((e,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:'9px',padding:'7px 9px',borderRadius:'8px',background:e.bg,border:`1px solid ${e.border}`}}>
              <div style={{width:'26px',height:'26px',borderRadius:'6px',background:e.bg,border:`1px solid ${e.border}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={e.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={e.icon}/></svg>
              </div>
              <div>
                <div style={{fontSize:'11px',fontWeight:700,color:'var(--t1)',lineHeight:1.2}}>{e.label}</div>
                <div style={{fontSize:'10px',color:'var(--t3)',marginTop:'1px'}}>{e.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  )

  if(step==='queued') return (
    <div style={{display:'flex',height:'100vh',overflow:'hidden',position:'relative' as const,zIndex:1,alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center',maxWidth:'480px',padding:'40px'}}>
        <div style={{width:'80px',height:'80px',borderRadius:'50%',background:'rgba(0,229,160,.1)',border:'2px solid rgba(0,229,160,.25)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 24px'}}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2 style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:'30px',fontWeight:900,letterSpacing:'-1px',marginBottom:'12px'}}>¡Video en cola!</h2>
        <p style={{fontSize:'15px',color:'var(--t2)',lineHeight:1.7,marginBottom:'20px'}}>El Motor GISTO está procesando tu video.<br/>En minutos tendrás tus cápsulas listas.</p>
        <div style={{background:'var(--s1)',border:'1px solid var(--b)',borderRadius:'14px',padding:'18px',marginBottom:'24px',textAlign:'left'}}>
          <div style={{fontSize:'10px',fontWeight:700,color:'var(--t3)',letterSpacing:'2px',textTransform:'uppercase' as const,marginBottom:'12px'}}>Recibirás</div>
          {ENTREGABLES.map((e,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:'9px',fontSize:'13px',color:'var(--t2)',marginBottom:i<ENTREGABLES.length-1?'9px':0}}>
              <div style={{width:'22px',height:'22px',borderRadius:'5px',background:e.bg,border:`1px solid ${e.border}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={e.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={e.icon}/></svg>
              </div>
              {e.label}
            </div>
          ))}
        </div>
        <Link href="/dashboard" style={{display:'inline-flex',alignItems:'center',gap:'7px',background:BTN_GRAD,color:'#000',padding:'13px 28px',borderRadius:'10px',fontWeight:800,fontSize:'14px',textDecoration:'none',boxShadow:BTN_SHADOW}}>
          Ver en dashboard →
        </Link>
      </div>
    </div>
  )

  const inputStyle = {width:'100%',background:'var(--s2)',border:'1px solid var(--b)',borderRadius:'10px',padding:'13px 16px',color:'var(--t1)',fontSize:'14px',outline:'none',fontFamily:'inherit'}

  return (
    <div style={{display:'flex',height:'100vh',overflow:'hidden',position:'relative' as const,zIndex:1}}>
      {sidebar}
      <main style={{flex:1,overflow:'auto',display:'flex',alignItems:'center',justifyContent:'center',padding:'40px',background:'radial-gradient(ellipse 70% 60% at 65% 40%,rgba(0,168,232,.05) 0%,transparent 60%)'}}>
        <div style={{width:'100%',maxWidth:'520px'}}>
          <div style={{textAlign:'center',marginBottom:'28px'}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:'8px',background:'rgba(0,168,232,.08)',border:'1px solid var(--b)',padding:'5px 14px',borderRadius:'100px',fontSize:'11px',fontWeight:600,color:'var(--c)',letterSpacing:'1.5px',textTransform:'uppercase' as const,marginBottom:'16px'}}>
              <span style={{width:'6px',height:'6px',background:'var(--ok)',borderRadius:'50%',boxShadow:'0 0 8px var(--ok)'}}/>
              Motor GISTO activo
            </div>
            <h1 style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:'34px',fontWeight:900,letterSpacing:'-1.5px',lineHeight:1.05,marginBottom:'8px'}}>
              Transforma tu clase<br/>
              <span style={{background:'linear-gradient(90deg,var(--c),var(--c2))',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>en un curso profesional</span>
            </h1>
            <p style={{fontSize:'14px',color:'var(--t2)',lineHeight:1.65}}>Sube tu grabación de Zoom o Meet.<br/>GISTO analiza y elimina lo que no corresponde.</p>
          </div>

          <div style={{background:'var(--s1)',border:'1px solid var(--b)',borderRadius:'20px',overflow:'hidden',boxShadow:'0 24px 48px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.04)'}}>
            <div style={{height:'2px',background:'linear-gradient(90deg,transparent,var(--c),var(--c2),transparent)'}}/>
            <div style={{padding:'28px'}}>
              {step==='uploading'&&(
                <div style={{textAlign:'center',padding:'32px 0'}}>
                  <div style={{width:'56px',height:'56px',borderRadius:'50%',border:'2px solid var(--b)',borderTop:'2px solid var(--c)',margin:'0 auto 20px',animation:'spin 1s linear infinite'}}/>
                  <h3 style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:'18px',fontWeight:700,marginBottom:'12px'}}>Enviando al Motor GISTO...</h3>
                  <div style={{height:'5px',background:'rgba(0,168,232,.1)',borderRadius:'3px',overflow:'hidden',margin:'12px 0'}}>
                    <div style={{height:'100%',width:`${progreso}%`,background:BTN_GRAD,transition:'width .3s',boxShadow:'0 0 8px var(--c)'}}/>
                  </div>
                  <p style={{fontSize:'12px',color:'var(--c)',fontWeight:700,fontFamily:'monospace'}}>{progreso}%</p>
                </div>
              )}

              {(step==='form'||step==='error')&&(<>
                {/* TABS */}
                <div style={{display:'flex',gap:'3px',background:'var(--s2)',padding:'3px',borderRadius:'11px',marginBottom:'24px'}}>
                  {[
                    {id:'link',label:'Link de Drive / Dropbox',icon:'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'},
                    {id:'file',label:'Subir desde tu PC',icon:'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12'}
                  ].map(t=>(
                    <button key={t.id} onClick={()=>setTab(t.id as any)}
                      style={{flex:1,padding:'10px 12px',borderRadius:'9px',border:'none',cursor:'pointer',fontSize:'13px',fontWeight:600,transition:'all .2s',display:'flex',alignItems:'center',justifyContent:'center',gap:'7px',
                        background:tab===t.id?BTN_GRAD:'transparent',
                        color:tab===t.id?'#000':'var(--t2)',
                        boxShadow:tab===t.id?BTN_SHADOW:'none'}}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={t.icon}/></svg>
                      {t.label}
                    </button>
                  ))}
                </div>

                {tab==='link'&&(
                  <div style={{marginBottom:'18px'}}>
                    <label style={{fontSize:'11px',fontWeight:700,color:'var(--t3)',letterSpacing:'1.5px',textTransform:'uppercase' as const,display:'block',marginBottom:'8px'}}>URL del video</label>
                    <div style={{position:'relative' as const}}>
                      <div style={{position:'absolute' as const,left:'14px',top:'50%',transform:'translateY(-50%)'}}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                      </div>
                      <input type="url" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://drive.google.com/... o https://dropbox.com/..."
                        style={{...inputStyle,paddingLeft:'42px'}}/>
                    </div>
                    <p style={{fontSize:'11px',color:'var(--t3)',marginTop:'6px'}}>⚠️ El link debe estar configurado como público</p>
                  </div>
                )}

                {tab==='file'&&(
                  <div style={{marginBottom:'18px'}}>
                    <div onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={onDrop} onClick={()=>fileRef.current?.click()}
                      style={{border:`2px dashed ${drag||archivo?'var(--c)':'rgba(0,168,232,.18)'}`,borderRadius:'14px',padding:'28px 24px',textAlign:'center',cursor:'pointer',background:drag?'rgba(0,168,232,.07)':archivo?'rgba(0,229,160,.04)':'rgba(0,168,232,.02)',transition:'all .3s'}}>
                      {archivo?(
                        <div>
                          <div style={{width:'44px',height:'44px',background:'rgba(0,229,160,.1)',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 10px'}}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          </div>
                          <p style={{fontSize:'14px',fontWeight:600,marginBottom:'2px'}}>{archivo.name}</p>
                          <p style={{fontSize:'12px',color:'var(--t2)'}}>{(archivo.size/(1024*1024)).toFixed(1)} MB</p>
                          <button onClick={e=>{e.stopPropagation();setArchivo(null)}} style={{marginTop:'8px',background:'none',border:'none',color:'var(--t3)',fontSize:'11px',cursor:'pointer'}}>Cambiar</button>
                        </div>
                      ):(
                        <div>
                          <div style={{width:'48px',height:'48px',background:'rgba(0,168,232,.08)',border:'1px solid rgba(0,168,232,.15)',borderRadius:'12px',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px'}}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--c)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                          </div>
                          <p style={{fontSize:'14px',fontWeight:500,marginBottom:'4px'}}>{drag?'Suelta aquí':'Arrastra o click para seleccionar'}</p>
                          <p style={{fontSize:'12px',color:'var(--t3)'}}>MP4 · MOV · AVI · MKV · WEBM · Máximo 4GB</p>
                        </div>
                      )}
                    </div>
                    <input ref={fileRef} type="file" accept="video/*" style={{display:'none'}} onChange={e=>setArchivo(e.target.files?.[0]||null)}/>
                  </div>
                )}

                <div style={{marginBottom:'16px'}}>
                  <label style={{fontSize:'11px',fontWeight:700,color:'var(--t3)',letterSpacing:'1.5px',textTransform:'uppercase' as const,display:'block',marginBottom:'8px'}}>Nombre del curso</label>
                  <div style={{position:'relative' as const}}>
                    <div style={{position:'absolute' as const,left:'12px',top:'50%',transform:'translateY(-50%)'}}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                    </div>
                    <input type="text" value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Ej: Excel Avanzado 2026"
                      style={{...inputStyle,padding:'11px 14px 11px 36px'}}/>
                  </div>
                </div>

                {error&&(
                  <div style={{padding:'12px 16px',borderRadius:'10px',fontSize:'13px',marginBottom:'16px',background:'rgba(255,70,100,.08)',border:'1px solid rgba(255,70,100,.2)',color:'var(--err)',display:'flex',alignItems:'flex-start',gap:'8px',flexWrap:'wrap' as const}}>
                    ⚠️ {error}
                    {error.includes('crédito')&&<a href="/planes" style={{color:'var(--c)',textDecoration:'none',fontWeight:700}}>Ver planes →</a>}
                  </div>
                )}

                <button onClick={handleProcesar}
                  onMouseEnter={()=>setBtnHover(true)}
                  onMouseLeave={()=>setBtnHover(false)}
                  style={{width:'100%',padding:'15px',background:btnHover?BTN_GRAD_H:BTN_GRAD,color:'#000',border:'none',borderRadius:'11px',fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:'16px',fontWeight:900,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',boxShadow:btnHover?BTN_SHADOW_H:BTN_SHADOW,transition:'all .25s cubic-bezier(.23,1,.32,1)',transform:btnHover?'translateY(-2px)':'translateY(0)'}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  Procesar con Motor GISTO
                </button>

                <div style={{display:'flex',justifyContent:'center',gap:'20px',marginTop:'12px',flexWrap:'wrap' as const}}>
                  {['Sin tarjeta','Análisis automático','Video limpio profesional'].map(t=>(
                    <span key={t} style={{fontSize:'11px',color:'var(--t3)',display:'flex',alignItems:'center',gap:'4px'}}>
                      <span style={{color:'var(--ok)',fontWeight:700,fontSize:'10px'}}>✓</span>{t}
                    </span>
                  ))}
                </div>
              </>)}
            </div>
          </div>
        </div>
      </main>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} input:focus{border-color:var(--c)!important;box-shadow:0 0 0 3px rgba(0,168,232,.12);}`}</style>
    </div>
  )
}
