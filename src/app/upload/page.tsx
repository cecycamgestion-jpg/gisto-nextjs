'use client'
import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'

const RAILWAY_URL = process.env.NEXT_PUBLIC_RAILWAY_URL
const AIRTABLE_KEY = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY
const AIRTABLE_BASE = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID

type Stage = 'idle'|'uploading'|'saving'|'queued'|'error'

export default function Upload() {
  const [tab, setTab] = useState<'link'|'file'>('link')
  const [url, setUrl] = useState('')
  const [email, setEmail] = useState('')
  const [nombre, setNombre] = useState('')
  const [archivo, setArchivo] = useState<File|null>(null)
  const [progreso, setProgreso] = useState(0)
  const [stage, setStage] = useState<Stage>('idle')
  const [error, setError] = useState('')
  const [drag, setDrag] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const onDrop = useCallback((e:React.DragEvent)=>{
    e.preventDefault(); setDrag(false)
    const f = e.dataTransfer.files[0]
    if(f?.type.startsWith('video/')) setArchivo(f)
  },[])

  async function subirS3(file:File):Promise<string>{
    const r = await fetch(`${RAILWAY_URL}/get-upload-url`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({filename:file.name})})
    if(!r.ok) throw new Error('Error obteniendo URL de subida')
    const {upload_url,public_url} = await r.json()
    await new Promise<void>((res,rej)=>{
      const xhr = new XMLHttpRequest()
      xhr.upload.addEventListener('progress',e=>{if(e.lengthComputable) setProgreso(Math.round(e.loaded/e.total*95))})
      xhr.addEventListener('load',()=>xhr.status===200?res():rej(new Error(`Error S3: ${xhr.status}`)))
      xhr.addEventListener('error',()=>rej(new Error('Error de conexión')))
      xhr.timeout=600000; xhr.open('PUT',upload_url); xhr.send(file)
    })
    return public_url
  }

  async function guardar(videoUrl:string){
    const r = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/Videos`,{method:'POST',headers:{'Authorization':`Bearer ${AIRTABLE_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({fields:{URL:videoUrl,VideoID:nombre||`Video-${Date.now()}`,Estado:'Pendiente'}})})
    if(!r.ok) throw new Error('Error registrando video')
  }

  async function submit(){
    setError('')
    if(!email.includes('@')){setError('Email inválido');return}
    if(tab==='link'&&!url.startsWith('http')){setError('Link inválido');return}
    if(tab==='file'&&!archivo){setError('Selecciona un video');return}
    try{
      let videoUrl=url
      if(tab==='file'&&archivo){setStage('uploading');videoUrl=await subirS3(archivo);setProgreso(100)}
      setStage('saving'); await guardar(videoUrl); setStage('queued')
    }catch(e:any){setError(e.message);setStage('error')}
  }

  function reset(){setStage('idle');setUrl('');setNombre('');setArchivo(null);setProgreso(0);setError('')}

  if(stage==='queued') return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:'40px',position:'relative',zIndex:1}}>
      <div style={{textAlign:'center',maxWidth:'480px',animation:'fadeUp .5s both'}}>
        <div style={{position:'relative',width:'96px',height:'96px',margin:'0 auto 28px'}}>
          <div style={{position:'absolute',inset:0,borderRadius:'50%',background:'rgba(0,229,160,0.12)',border:'1px solid rgba(0,229,160,0.25)',animation:'pulse 2s infinite'}}/>
          <div style={{position:'absolute',inset:'8px',borderRadius:'50%',background:'rgba(0,229,160,0.15)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        </div>
        <h2 style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:'32px',fontWeight:900,letterSpacing:'-1.5px',marginBottom:'12px'}}>Video en procesamiento</h2>
        <p style={{fontSize:'15px',color:'var(--t2)',lineHeight:1.75,marginBottom:'32px'}}>El Motor GISTO está trabajando. Cuando termine verás el resultado en tu dashboard con el ZIP completo.</p>
        <div style={{background:'var(--s1)',border:'1px solid var(--b)',borderRadius:'14px',padding:'20px',marginBottom:'28px',textAlign:'left'}}>
          {['Cápsulas de video pedagógicas','Documentos Word editables','Quizzes y glosario técnico','Índice completo del curso','ZIP listo para tu aula virtual'].map((item,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:'10px',fontSize:'13px',color:'var(--t2)',marginBottom:i<4?'8px':0}}>
              <div style={{width:'18px',height:'18px',borderRadius:'50%',background:'rgba(0,229,160,0.1)',border:'1px solid rgba(0,229,160,0.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <span style={{fontSize:'9px',color:'var(--ok)',fontWeight:700}}>✓</span>
              </div>
              {item}
            </div>
          ))}
        </div>
        <div style={{display:'flex',gap:'10px',justifyContent:'center'}}>
          <Link href="/dashboard" style={{display:'inline-flex',alignItems:'center',gap:'8px',background:'var(--c)',color:'#000',padding:'13px 26px',borderRadius:'10px',fontWeight:800,fontSize:'14px',textDecoration:'none'}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Ver dashboard
          </Link>
          <button onClick={reset} style={{background:'var(--s1)',border:'1px solid var(--b)',color:'var(--t2)',padding:'13px 26px',borderRadius:'10px',fontWeight:600,fontSize:'14px',cursor:'pointer'}}>Subir otro</button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{display:'flex',height:'100vh',overflow:'hidden',position:'relative' as const,zIndex:1}}>
      {/* SIDEBAR */}
      <aside style={{width:'260px',background:'var(--s1)',borderRight:'1px solid var(--b)',padding:'20px 16px',display:'flex',flexDirection:'column' as const,flexShrink:0}}>
        <Link href="/" style={{display:'flex',alignItems:'center',gap:'10px',textDecoration:'none',padding:'4px 8px',marginBottom:'36px'}}>
          <img src="/isotipo.png" alt="GISTO" style={{height:'34px'}}/>
          <span style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontWeight:900,fontSize:'18px',color:'var(--t1)'}}>THE <span style={{color:'var(--c)'}}>GISTO</span></span>
        </Link>
        {[{href:'/dashboard',label:'Dashboard',icon:'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',active:false},{href:'/upload',label:'Subir video',icon:'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',active:true}].map(item=>(
          <Link key={item.href} href={item.href} style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 12px',color:item.active?'var(--t1)':'var(--t2)',textDecoration:'none',borderRadius:'9px',marginBottom:'2px',fontSize:'14px',fontWeight:500,background:item.active?'rgba(0,168,232,0.08)':'transparent',border:item.active?'1px solid var(--b)':'1px solid transparent'}}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={item.active?'var(--c)':'var(--t3)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon}/></svg>
            {item.label}
          </Link>
        ))}
        {/* MOTOR INFO */}
        <div style={{marginTop:'auto'}}>
          <div style={{fontSize:'10px',fontWeight:700,letterSpacing:'2px',textTransform:'uppercase' as const,color:'var(--t3)',padding:'0 4px',marginBottom:'10px'}}>Motor GISTO</div>
          {[
            {n:'01',t:'Transcripción',d:'Audio → texto preciso',c:'var(--c)'},
            {n:'02',t:'Análisis IA',d:'Identifica temas pedagógicos',c:'var(--c)'},
            {n:'03',t:'Limpieza de aula',d:'Elimina interacciones',c:'var(--ok)'},
            {n:'04',t:'Corte anatómico',d:'Silencios naturales',c:'var(--ok)'},
            {n:'05',t:'Empaquetado',d:'ZIP profesional',c:'var(--c)'},
          ].map((s,i)=>(
            <div key={i} style={{display:'flex',alignItems:'flex-start',gap:'10px',marginBottom:'10px',padding:'8px 10px',borderRadius:'8px',background:'rgba(0,168,232,0.03)',border:'1px solid rgba(0,168,232,0.07)'}}>
              <span style={{fontFamily:'monospace',fontSize:'10px',fontWeight:700,color:s.c,flexShrink:0,marginTop:'2px'}}>{s.n}</span>
              <div>
                <div style={{fontSize:'12px',fontWeight:600,color:'var(--t1)'}}>{s.t}</div>
                <div style={{fontSize:'10px',color:'var(--t3)'}}>{s.d}</div>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* MAIN */}
      <main style={{flex:1,overflow:'auto',display:'flex',alignItems:'center',justifyContent:'center',padding:'40px',background:'radial-gradient(ellipse 70% 60% at 65% 40%, rgba(0,168,232,0.05) 0%, transparent 60%)'}}>
        <div style={{width:'100%',maxWidth:'560px',position:'relative' as const,zIndex:1}}>

          {/* HEADER */}
          <div style={{textAlign:'center',marginBottom:'28px'}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:'8px',background:'rgba(0,168,232,0.08)',border:'1px solid var(--b)',padding:'5px 14px',borderRadius:'100px',fontSize:'11px',fontWeight:600,color:'var(--c)',letterSpacing:'1.5px',textTransform:'uppercase' as const,marginBottom:'16px'}}>
              <span style={{width:'6px',height:'6px',background:'var(--ok)',borderRadius:'50%',boxShadow:'0 0 8px var(--ok)',animation:'pulse 2s infinite'}}/>
              Motor GISTO activo
            </div>
            <h1 style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:'clamp(28px,4vw,38px)',fontWeight:900,letterSpacing:'-1.5px',lineHeight:1.05,marginBottom:'8px'}}>
              Sube tu clase grabada.<br/>
              <span style={{background:'linear-gradient(90deg,var(--c),var(--c2))',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>
                GISTO hace el resto.
              </span>
            </h1>
            <p style={{fontSize:'14px',color:'var(--t2)',lineHeight:1.65}}>
              Zoom, Meet o cualquier grabación. GISTO elimina las interacciones del aula<br/>y entrega cápsulas limpias y profesionales.
            </p>
          </div>

          {/* CARD */}
          <div style={{background:'var(--s1)',border:'1px solid var(--b)',borderRadius:'20px',overflow:'hidden',boxShadow:'0 24px 48px rgba(0,0,0,0.3),0 0 0 1px rgba(0,168,232,0.06),inset 0 1px 0 rgba(255,255,255,0.04)'}}>
            {/* TOP GRADIENT LINE */}
            <div style={{height:'2px',background:'linear-gradient(90deg,transparent,var(--c),var(--c2),transparent)'}}/>

            <div style={{padding:'28px'}}>
              {/* TABS */}
              <div style={{display:'flex',gap:'3px',background:'var(--s2)',padding:'3px',borderRadius:'11px',marginBottom:'24px'}}>
                {[
                  {id:'link',label:'Link de Drive / Dropbox',icon:'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'},
                  {id:'file',label:'Subir desde tu PC',icon:'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12'},
                ].map(t=>(
                  <button key={t.id} onClick={()=>setTab(t.id as 'link'|'file')} style={{flex:1,padding:'10px 12px',borderRadius:'9px',border:'none',cursor:'pointer',fontSize:'13px',fontWeight:600,transition:'all .2s',display:'flex',alignItems:'center',justifyContent:'center',gap:'7px',background:tab===t.id?'var(--c)':'transparent',color:tab===t.id?'#000':'var(--t2)',boxShadow:tab===t.id?'0 4px 12px rgba(0,168,232,0.3)':'none'}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={t.icon}/></svg>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* LINK */}
              {tab==='link'&&(
                <div style={{marginBottom:'18px'}}>
                  <label style={{fontSize:'11px',fontWeight:700,color:'var(--t3)',letterSpacing:'1.5px',textTransform:'uppercase' as const,display:'block',marginBottom:'8px'}}>URL del video</label>
                  <div style={{position:'relative' as const}}>
                    <div style={{position:'absolute' as const,left:'14px',top:'50%',transform:'translateY(-50%)'}}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                    </div>
                    <input type="url" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://drive.google.com/... o https://dropbox.com/..."
                      style={{width:'100%',background:'var(--s2)',border:'1px solid var(--b)',borderRadius:'11px',padding:'13px 16px 13px 42px',color:'var(--t1)',fontSize:'14px',outline:'none',fontFamily:'inherit',transition:'border-color .2s'}}/>
                  </div>
                </div>
              )}

              {/* FILE DROP */}
              {tab==='file'&&(
                <div style={{marginBottom:'18px'}}>
                  <div onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={onDrop} onClick={()=>fileRef.current?.click()}
                    style={{border:`2px dashed ${drag||archivo?'var(--c)':'rgba(0,168,232,0.18)'}`,borderRadius:'14px',padding:'28px 24px',textAlign:'center',cursor:'pointer',background:drag?'rgba(0,168,232,0.07)':archivo?'rgba(0,229,160,0.04)':'rgba(0,168,232,0.02)',transition:'all .3s',position:'relative' as const}}>
                    {archivo?(
                      <div>
                        <div style={{width:'48px',height:'48px',background:'rgba(0,229,160,0.1)',border:'1px solid rgba(0,229,160,0.2)',borderRadius:'12px',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px'}}>
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                        </div>
                        <p style={{fontSize:'14px',fontWeight:600,color:'var(--t1)',marginBottom:'2px'}}>{archivo.name}</p>
                        <p style={{fontSize:'12px',color:'var(--t2)',marginBottom:'10px'}}>{(archivo.size/(1024*1024)).toFixed(1)} MB</p>
                        <button onClick={e=>{e.stopPropagation();setArchivo(null)}} style={{background:'rgba(255,255,255,0.05)',border:'1px solid var(--b)',color:'var(--t3)',padding:'4px 12px',borderRadius:'6px',fontSize:'11px',cursor:'pointer'}}>Cambiar</button>
                      </div>
                    ):(
                      <div>
                        <div style={{width:'52px',height:'52px',background:'rgba(0,168,232,0.08)',border:'1px solid rgba(0,168,232,0.15)',borderRadius:'14px',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px'}}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={drag?'var(--c2)':'var(--c)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                        </div>
                        <p style={{fontSize:'14px',fontWeight:600,color:drag?'var(--c)':'var(--t1)',marginBottom:'4px'}}>{drag?'Suelta aquí':'Arrastra o click para seleccionar'}</p>
                        <p style={{fontSize:'12px',color:'var(--t3)'}}>MP4 · MOV · AVI · Máximo 2GB</p>
                      </div>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept="video/*" style={{display:'none'}} onChange={e=>setArchivo(e.target.files?.[0]||null)}/>
                  {stage==='uploading'&&(
                    <div style={{marginTop:'14px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:'12px',marginBottom:'6px'}}>
                        <span style={{color:'var(--t2)'}}>Subiendo de forma segura...</span>
                        <span style={{color:'var(--c)',fontWeight:700,fontFamily:'monospace'}}>{progreso}%</span>
                      </div>
                      <div style={{height:'5px',background:'rgba(0,168,232,0.1)',borderRadius:'3px',overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${progreso}%`,background:'linear-gradient(90deg,var(--c),var(--c2))',borderRadius:'3px',transition:'width .3s',boxShadow:'0 0 8px var(--c)'}}/>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* FIELDS */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'20px'}}>
                {[
                  {label:'Email *',val:email,set:setEmail,ph:'tu@email.com',type:'email',icon:'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zM22 6l-10 7L2 6'},
                  {label:'Nombre del curso',val:nombre,set:setNombre,ph:'Ej: Excel Avanzado',type:'text',icon:'M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z'},
                ].map(f=>(
                  <div key={f.label}>
                    <label style={{fontSize:'11px',fontWeight:700,color:'var(--t3)',letterSpacing:'1.5px',textTransform:'uppercase' as const,display:'block',marginBottom:'8px'}}>{f.label}</label>
                    <div style={{position:'relative' as const}}>
                      <div style={{position:'absolute' as const,left:'12px',top:'50%',transform:'translateY(-50%)'}}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={f.icon}/></svg>
                      </div>
                      <input type={f.type} value={f.val} onChange={e=>f.set(e.target.value)} placeholder={f.ph}
                        style={{width:'100%',background:'var(--s2)',border:'1px solid var(--b)',borderRadius:'10px',padding:'11px 14px 11px 36px',color:'var(--t1)',fontSize:'13px',outline:'none',fontFamily:'inherit'}}/>
                    </div>
                  </div>
                ))}
              </div>

              {/* ERROR */}
              {(error||stage==='error')&&(
                <div style={{padding:'12px 16px',borderRadius:'10px',fontSize:'13px',marginBottom:'16px',background:'rgba(255,70,100,0.08)',border:'1px solid rgba(255,70,100,0.2)',color:'var(--err)',display:'flex',alignItems:'center',gap:'8px'}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {error}
                </div>
              )}

              {stage==='saving'&&(
                <div style={{padding:'12px 16px',borderRadius:'10px',fontSize:'13px',marginBottom:'16px',background:'rgba(0,168,232,0.08)',border:'1px solid var(--b)',color:'var(--c)',display:'flex',alignItems:'center',gap:'8px'}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{animation:'spin 1s linear infinite'}}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                  Registrando en el sistema...
                </div>
              )}

              {/* CTA BUTTON */}
              <button onClick={submit} disabled={stage==='uploading'||stage==='saving'}
                style={{width:'100%',padding:'16px',background:stage==='uploading'||stage==='saving'?'rgba(0,168,232,0.4)':'var(--c)',color:'#000',border:'none',borderRadius:'12px',fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:'16px',fontWeight:900,cursor:stage==='uploading'||stage==='saving'?'not-allowed':'pointer',transition:'all .2s',letterSpacing:'-0.3px',display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',boxShadow:stage==='uploading'||stage==='saving'?'none':'0 8px 24px rgba(0,168,232,0.35)'}}>
                {stage==='uploading'?(
                  <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{animation:'spin 1s linear infinite'}}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Subiendo {progreso}%...</>
                ):stage==='saving'?(
                  <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{animation:'spin 1s linear infinite'}}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Procesando...</>
                ):(
                  <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>Procesar con Motor GISTO</>
                )}
              </button>

              <div style={{display:'flex',justifyContent:'center',gap:'20px',marginTop:'14px'}}>
                {['Sin tarjeta de crédito','Listo en minutos','Video limpio profesional'].map(t=>(
                  <span key={t} style={{fontSize:'11px',color:'var(--t3)',display:'flex',alignItems:'center',gap:'4px'}}>
                    <span style={{color:'var(--ok)',fontWeight:700,fontSize:'10px'}}>✓</span>{t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        input:focus { border-color: var(--c) !important; box-shadow: 0 0 0 3px rgba(0,168,232,0.12); }
      `}</style>
    </div>
  )
}
