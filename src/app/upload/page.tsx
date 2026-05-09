'use client'
import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'

const RAILWAY_URL = process.env.NEXT_PUBLIC_RAILWAY_URL
const AIRTABLE_KEY = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY
const AIRTABLE_BASE = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID

type Step = 'form' | 'analyzing' | 'confirm' | 'uploading' | 'queued' | 'error'

interface Analisis {
  duracion_texto: string
  duracion_minutos: number
  modulos_sugeridos: number
  modulos_minimo: number
  modulos_maximo: number
  minutos_por_modulo: number
  mensaje: string
}

export default function Upload() {
  const [tab, setTab] = useState<'link'|'file'>('link')
  const [url, setUrl] = useState('')
  const [nombre, setNombre] = useState('')
  const [archivo, setArchivo] = useState<File|null>(null)
  const [step, setStep] = useState<Step>('form')
  const [analisis, setAnalisis] = useState<Analisis|null>(null)
  const [modulosElegidos, setModulosElegidos] = useState(0)
  const [progreso, setProgreso] = useState(0)
  const [error, setError] = useState('')
  const [drag, setDrag] = useState(false)
  const [videoUrl, setVideoUrl] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const onDrop = useCallback((e:React.DragEvent)=>{
    e.preventDefault(); setDrag(false)
    const f = e.dataTransfer.files[0]
    if(f?.type.startsWith('video/')) setArchivo(f)
  },[])

  async function analizarVideo(vUrl: string) {
    setStep('analyzing')
    try {
      const r = await fetch(`${RAILWAY_URL}/analizar-video`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({video_url: vUrl})
      })
      if(!r.ok) throw new Error('No se pudo analizar el video')
      const data = await r.json()
      setAnalisis(data)
      setModulosElegidos(data.modulos_sugeridos)
      setStep('confirm')
    } catch(e:any) {
      setError(e.message)
      setStep('error')
    }
  }

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

  async function handleAnalizar() {
    setError('')
    if(tab==='link'){
      if(!url.startsWith('http')){setError('Ingresa un link válido de Drive o Dropbox');return}
      setVideoUrl(url)
      setStep('uploading')
      await guardarYProcesar(url)
    } else {
      if(!archivo){setError('Selecciona un archivo de video');return}
      setStep('uploading')
      try {
        const pubUrl = await subirS3(archivo)
        setVideoUrl(pubUrl)
        await guardarYProcesar(pubUrl)
      } catch(e:any){
        setError(e.message); setStep('error')
      }
    }
  }

  async function guardarYProcesar(vUrl: string) {
    try {
      // Verificar creditos del usuario
      const userStr = localStorage.getItem('gisto_user')
      if (!userStr) { setError('Debes iniciar sesión'); setStep('error'); return }
      const userData = JSON.parse(userStr)
      const creditos = userData.creditos || 0

      // Obtener duracion del video para validar creditos
      let duracionMin = 0
      try {
        const analisisR = await fetch(`${RAILWAY_URL}/analizar-video`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({video_url: vUrl})
        })
        if (analisisR.ok) {
          const analisis = await analisisR.json()
          duracionMin = analisis.duracion_minutos || 0
        }
      } catch { /* si falla el analisis, continuar sin validar duracion */ }

      // Validar si tiene creditos suficientes
      if (duracionMin > 0 && creditos < duracionMin) {
        setError(`Tu video dura ${Math.round(duracionMin)} min pero solo tienes ${creditos} min de crédito. Adquiere más créditos.`)
        setStep('error')
        return
      }

      const r = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/Videos`,{
        method:'POST',
        headers:{'Authorization':`Bearer ${AIRTABLE_KEY}`,'Content-Type':'application/json'},
        body:JSON.stringify({fields:{
          URL: vUrl,
          VideoID: nombre || `Video-${Date.now()}`,
          Estado:'Pendiente',
          Usuario_Email: JSON.parse(localStorage.getItem('gisto_user')||'{}').email || ''
        }})
      })
      if(!r.ok) throw new Error('Error registrando video')
      setStep('queued')
    } catch(e:any){
      setError(e.message); setStep('error')
    }
  }



  const C = {
    wrap:{display:'flex',height:'100vh',overflow:'hidden',position:'relative' as const,zIndex:1},
    sidebar:{width:'260px',background:'var(--s1)',borderRight:'1px solid var(--b)',padding:'20px 16px',display:'flex',flexDirection:'column' as const,flexShrink:0},
    main:{flex:1,overflow:'auto',display:'flex',alignItems:'center',justifyContent:'center',padding:'40px'},
    card:{width:'100%',maxWidth:'560px',background:'var(--s1)',border:'1px solid var(--b)',borderRadius:'20px',overflow:'hidden',boxShadow:'0 24px 48px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.04)'},
    topline:{height:'2px',background:'linear-gradient(90deg,transparent,var(--c),var(--c2),transparent)'},
    inner:{padding:'28px'},
    label:{fontSize:'11px',fontWeight:700,color:'var(--t3)',letterSpacing:'1.5px',textTransform:'uppercase' as const,display:'block',marginBottom:'8px'},
    input:{width:'100%',background:'var(--s2)',border:'1px solid var(--b)',borderRadius:'10px',padding:'13px 16px',color:'var(--t1)',fontSize:'14px',outline:'none',fontFamily:'inherit'},
    btn:{width:'100%',padding:'15px',background:'var(--c)',color:'#000',border:'none',borderRadius:'11px',fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:'16px',fontWeight:900,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',boxShadow:'0 8px 24px rgba(0,168,232,.3)'},
    btnDisabled:{opacity:0.5,cursor:'not-allowed'},
    proofRow:{display:'flex',justifyContent:'center',gap:'20px',marginTop:'12px'},
    proofItem:{fontSize:'11px',color:'var(--t3)',display:'flex',alignItems:'center',gap:'4px'},
  }

  if(step==='queued') return (
    <div style={{...C.wrap,alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center',maxWidth:'480px',padding:'40px'}}>
        <div style={{width:'80px',height:'80px',borderRadius:'50%',background:'rgba(0,229,160,.1)',border:'2px solid rgba(0,229,160,.25)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 24px'}}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2 style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:'30px',fontWeight:900,letterSpacing:'-1px',marginBottom:'12px'}}>¡Video en cola!</h2>
        <p style={{fontSize:'15px',color:'var(--t2)',lineHeight:1.7,marginBottom:'12px'}}>
          El Motor GISTO está procesando tu video.<br/>
          En minutos tendrás tus cápsulas listas en el dashboard.
        </p>
        <div style={{background:'var(--s1)',border:'1px solid var(--b)',borderRadius:'12px',padding:'16px',marginBottom:'24px',textAlign:'left'}}>
          <div style={{fontSize:'11px',fontWeight:700,color:'var(--t3)',letterSpacing:'1.5px',textTransform:'uppercase' as const,marginBottom:'12px'}}>Recibirás</div>
          {[
            'Cápsulas de video pedagógicas',
            'Documentos Word (transcripción + quiz + glosario)',
            'Interacciones de aula eliminadas automáticamente',
            'Índice completo del curso',
            'Todo en un ZIP descargable'
          ].map((item,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:'8px',fontSize:'13px',color:'var(--t2)',marginBottom:i<4?'8px':0}}>
              <span style={{color:'var(--ok)',fontSize:'11px',fontWeight:700}}>✓</span>{item}
            </div>
          ))}
        </div>
        <div style={{display:'flex',gap:'10px',justifyContent:'center'}}>
          <Link href="/dashboard" style={{display:'inline-flex',alignItems:'center',gap:'7px',background:'var(--c)',color:'#000',padding:'12px 24px',borderRadius:'9px',fontWeight:800,fontSize:'14px',textDecoration:'none'}}>
            Ver en dashboard →
          </Link>
        </div>
      </div>
    </div>
  )

  if(step==='confirm' && analisis) return (
    <div style={C.wrap}>
      <aside style={C.sidebar}>
        <Link href="/" style={{display:'flex',alignItems:'center',gap:'10px',textDecoration:'none',marginBottom:'36px'}}>
          <img src="/isotipo.png" alt="GISTO" style={{height:'34px'}}/>
          <span style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontWeight:900,fontSize:'18px',color:'var(--t1)'}}>THE <span style={{color:'var(--c)'}}>GISTO</span></span>
        </Link>
        <div style={{background:'rgba(0,229,160,.06)',border:'1px solid rgba(0,229,160,.15)',borderRadius:'12px',padding:'16px',marginBottom:'16px'}}>
          <div style={{fontSize:'11px',fontWeight:700,color:'var(--ok)',letterSpacing:'1.5px',textTransform:'uppercase' as const,marginBottom:'8px'}}>✓ Video analizado</div>
          <div style={{fontSize:'24px',fontWeight:900,fontFamily:"'Cabinet Grotesk',sans-serif",color:'var(--t1)',marginBottom:'2px'}}>{analisis.duracion_texto}</div>
          <div style={{fontSize:'12px',color:'var(--t2)'}}>duración del video</div>
        </div>
        <div style={{background:'var(--s2)',border:'1px solid var(--b)',borderRadius:'12px',padding:'16px'}}>
          <div style={{fontSize:'11px',fontWeight:700,color:'var(--t3)',letterSpacing:'1.5px',textTransform:'uppercase' as const,marginBottom:'12px'}}>Motor GISTO hará</div>
          {['Transcripción precisa','Análisis pedagógico','Limpieza de aula','Corte anatómico','Documentos + Quizzes'].map((s,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:'8px',fontSize:'12px',color:'var(--t2)',marginBottom:i<4?'8px':0}}>
              <span style={{fontFamily:'monospace',fontSize:'10px',color:'var(--c)',fontWeight:700}}>0{i+1}</span>{s}
            </div>
          ))}
        </div>
      </aside>
      <main style={{...C.main,flexDirection:'column' as const}}>
        <div style={{width:'100%',maxWidth:'520px'}}>
          <div style={{textAlign:'center',marginBottom:'28px'}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:'8px',background:'rgba(0,229,160,.08)',border:'1px solid rgba(0,229,160,.2)',padding:'5px 14px',borderRadius:'100px',fontSize:'11px',fontWeight:600,color:'var(--ok)',letterSpacing:'1.5px',textTransform:'uppercase' as const,marginBottom:'16px'}}>
              <span style={{width:'6px',height:'6px',background:'var(--ok)',borderRadius:'50%'}}/>
              Análisis completado
            </div>
            <h1 style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:'32px',fontWeight:900,letterSpacing:'-1px',marginBottom:'8px'}}>
              Listo para procesar
            </h1>
            <p style={{fontSize:'15px',color:'var(--t2)',lineHeight:1.6}}>{analisis.mensaje}</p>
          </div>

          <div style={{background:'var(--s1)',border:'1px solid var(--b)',borderRadius:'18px',overflow:'hidden',marginBottom:'16px'}}>
            <div style={{height:'2px',background:'linear-gradient(90deg,transparent,var(--c),var(--c2),transparent)'}}/>
            <div style={{padding:'24px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'24px'}}>
                <div style={{background:'var(--s2)',borderRadius:'12px',padding:'16px',textAlign:'center'}}>
                  <div style={{fontSize:'32px',fontWeight:900,fontFamily:"'Cabinet Grotesk',sans-serif",background:'linear-gradient(135deg,var(--c),var(--c2))',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',lineHeight:1}}>{analisis.duracion_texto}</div>
                  <div style={{fontSize:'11px',color:'var(--t3)',marginTop:'4px'}}>Duración del video</div>
                </div>
                <div style={{background:'var(--s2)',borderRadius:'12px',padding:'16px',textAlign:'center'}}>
                  <div style={{fontSize:'32px',fontWeight:900,fontFamily:"'Cabinet Grotesk',sans-serif",background:'linear-gradient(135deg,var(--c),var(--c2))',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',lineHeight:1}}>{analisis.minutos_por_modulo} min</div>
                  <div style={{fontSize:'11px',color:'var(--t3)',marginTop:'4px'}}>Promedio por módulo</div>
                </div>
              </div>

              <div style={{marginBottom:'24px'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px'}}>
                  <label style={{fontSize:'13px',fontWeight:700,color:'var(--t1)'}}>¿Cuántos módulos deseas?</label>
                  <div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:'24px',fontWeight:900,color:'var(--c)'}}>{modulosElegidos}</div>
                </div>
                <input type="range" min={analisis.modulos_minimo} max={analisis.modulos_maximo} value={modulosElegidos} onChange={e=>setModulosElegidos(parseInt(e.target.value))}
                  style={{width:'100%',accentColor:'var(--c)',height:'4px',cursor:'pointer'}}/>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px',color:'var(--t3)',marginTop:'6px'}}>
                  <span>Mín {analisis.modulos_minimo}</span>
                  <span style={{color:'var(--c)',fontWeight:600}}>Recomendado: {analisis.modulos_sugeridos}</span>
                  <span>Máx {analisis.modulos_maximo}</span>
                </div>
              </div>

              <div style={{marginBottom:'20px'}}>
                <label style={{fontSize:'11px',fontWeight:700,color:'var(--t3)',letterSpacing:'1.5px',textTransform:'uppercase' as const,display:'block',marginBottom:'8px'}}>Nombre del curso</label>
                <input type="text" value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Ej: Excel Avanzado 2026"
                  style={{...C.input}}/>
              </div>

              <div style={{display:'flex',gap:'10px'}}>
                <button onClick={()=>setStep('form')} style={{flex:1,padding:'14px',background:'var(--s2)',border:'1px solid var(--b)',color:'var(--t2)',borderRadius:'10px',fontWeight:600,fontSize:'14px',cursor:'pointer'}}>
                  Cambiar video
                </button>
                <button onClick={handleProcesar} style={{...C.btn,flex:2}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  Procesar con Motor GISTO
                </button>
              </div>
            </div>
          </div>

          <div style={{background:'rgba(0,168,232,.05)',border:'1px solid var(--b)',borderRadius:'12px',padding:'14px 16px',fontSize:'12px',color:'var(--t2)',display:'flex',alignItems:'flex-start',gap:'10px'}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--c)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:'1px'}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            El Motor GISTO eliminará automáticamente interacciones del aula, toma de lista y recesos. Tu video quedará limpio y profesional.
          </div>
        </div>
      </main>
    </div>
  )

  return (
    <div style={C.wrap}>
      <aside style={C.sidebar}>
        <Link href="/" style={{display:'flex',alignItems:'center',gap:'10px',textDecoration:'none',marginBottom:'36px'}}>
          <img src="/isotipo.png" alt="GISTO" style={{height:'34px'}}/>
          <span style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontWeight:900,fontSize:'18px',color:'var(--t1)'}}>THE <span style={{color:'var(--c)'}}>GISTO</span></span>
        </Link>
        {[{href:'/dashboard',label:'Dashboard',icon:'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',active:false},{href:'/upload',label:'Subir video',icon:'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',active:true}].map(item=>(
          <Link key={item.href} href={item.href} style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 12px',color:item.active?'var(--t1)':'var(--t2)',textDecoration:'none',borderRadius:'9px',marginBottom:'2px',fontSize:'14px',fontWeight:500,background:item.active?'rgba(0,168,232,0.08)':'transparent',border:item.active?'1px solid var(--b)':'1px solid transparent'}}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={item.active?'var(--c)':'var(--t3)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon}/></svg>
            {item.label}
          </Link>
        ))}
        <div style={{marginTop:'auto',background:'var(--s2)',overflow:'hidden',border:'1px solid var(--b)',borderRadius:'12px',padding:'16px'}}>
          <div style={{fontSize:'10px',fontWeight:700,letterSpacing:'2px',textTransform:'uppercase' as const,color:'var(--t3)',marginBottom:'12px'}}>Motor GISTO</div>
          {[{n:'01',t:'Transcripción',d:'Audio → texto preciso'},{n:'02',t:'Análisis IA',d:'Identifica módulos'},{n:'03',t:'Limpieza de aula',d:'Elimina interacciones'},{n:'04',t:'Corte anatómico',d:'Silencios naturales'},{n:'05',t:'Empaquetado',d:'ZIP profesional'}].map((s,i)=>(
            <div key={i} style={{display:'flex',gap:'10px',marginBottom:i<4?'10px':0,padding:'8px 10px',borderRadius:'8px',background:'rgba(0,168,232,.03)',border:'1px solid rgba(0,168,232,.07)'}}>
              <span style={{fontFamily:'monospace',fontSize:'10px',fontWeight:700,color:'var(--c)',flexShrink:0,marginTop:'2px'}}>{s.n}</span>
              <div><div style={{fontSize:'12px',fontWeight:600,color:'var(--t1)'}}>{s.t}</div><div style={{fontSize:'10px',color:'var(--t3)'}}>{s.d}</div></div>
            </div>
          ))}
        </div>
      </aside>

      <main style={{...C.main,background:'radial-gradient(ellipse 70% 60% at 65% 40%,rgba(0,168,232,.05) 0%,transparent 60%)'}}>
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

          <div style={C.card}>
            <div style={C.topline}/>
            <div style={C.inner}>
              {step==='analyzing'&&(
                <div style={{textAlign:'center',padding:'32px 0'}}>
                  <div style={{width:'56px',height:'56px',borderRadius:'50%',border:'2px solid var(--b)',borderTop:'2px solid var(--c)',margin:'0 auto 20px',animation:'spin 1s linear infinite'}}/>
                  <h3 style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:'18px',fontWeight:700,marginBottom:'8px'}}>Analizando tu video...</h3>
                  <p style={{fontSize:'13px',color:'var(--t2)'}}>Detectando duración y módulos pedagógicos</p>
                  <p style={{fontSize:'12px',color:'var(--t3)',marginTop:'4px'}}>Máximo 60 segundos</p>
                </div>
              )}
              {step==='uploading'&&(
                <div style={{textAlign:'center',padding:'32px 0'}}>
                  <div style={{width:'56px',height:'56px',borderRadius:'50%',border:'2px solid var(--b)',borderTop:'2px solid var(--c)',margin:'0 auto 20px',animation:'spin 1s linear infinite'}}/>
                  <h3 style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:'18px',fontWeight:700,marginBottom:'8px'}}>Enviando al Motor GISTO...</h3>
                  <div style={{height:'5px',background:'rgba(0,168,232,.1)',borderRadius:'3px',overflow:'hidden',margin:'12px 0'}}>
                    <div style={{height:'100%',width:`${progreso}%`,background:'linear-gradient(90deg,var(--c),var(--c2))',transition:'width .3s',boxShadow:'0 0 8px var(--c)'}}/>
                  </div>
                  <p style={{fontSize:'12px',color:'var(--c)',fontWeight:700,fontFamily:'monospace'}}>{progreso}%</p>
                </div>
              )}
              {(step==='form'||step==='error')&&(<>
                <div style={{display:'flex',gap:'3px',background:'var(--s2)',padding:'3px',borderRadius:'11px',marginBottom:'24px'}}>
                  {[{id:'link',label:'Link de Drive / Dropbox',icon:'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'},{id:'file',label:'Subir desde tu PC',icon:'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12'}].map(t=>(
                    <button key={t.id} onClick={()=>setTab(t.id as 'link'|'file')} style={{flex:1,padding:'10px 12px',borderRadius:'9px',border:'none',cursor:'pointer',fontSize:'13px',fontWeight:600,transition:'all .2s',display:'flex',alignItems:'center',justifyContent:'center',gap:'7px',background:tab===t.id?'var(--c)':'transparent',color:tab===t.id?'#000':'var(--t2)',boxShadow:tab===t.id?'0 4px 12px rgba(0,168,232,.3)':'none'}}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={t.icon}/></svg>
                      {t.label}
                    </button>
                  ))}
                </div>

                {tab==='link'&&(
                  <div style={{marginBottom:'18px'}}>
                    <label style={C.label}>URL del video</label>
                    <div style={{position:'relative' as const}}>
                      <div style={{position:'absolute' as const,left:'14px',top:'50%',transform:'translateY(-50%)'}}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                      </div>
                      <input type="url" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://drive.google.com/... o https://dropbox.com/..."
                        style={{...C.input,paddingLeft:'42px'}}/>
                    </div>
                    <p style={{fontSize:'11px',color:'var(--t3)',marginTop:'6px'}}>⚠️ El link debe estar configurado como público para que GISTO pueda acceder</p>
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
                          <p style={{fontSize:'12px',color:'var(--t3)'}}>MP4 · MOV · AVI · Máximo 2GB</p>
                        </div>
                      )}
                    </div>
                    <input ref={fileRef} type="file" accept="video/*" style={{display:'none'}} onChange={e=>setArchivo(e.target.files?.[0]||null)}/>
                  </div>
                )}

                {/* NOMBRE DEL CURSO */}
                <div style={{marginBottom:'16px'}}>
                  <label style={{fontSize:'11px',fontWeight:700,color:'var(--t3)',letterSpacing:'1.5px',textTransform:'uppercase' as const,display:'block',marginBottom:'8px'}}>Nombre del curso</label>
                  <div style={{position:'relative' as const}}>
                    <div style={{position:'absolute' as const,left:'12px',top:'50%',transform:'translateY(-50%)'}}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                    </div>
                    <input type="text" value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Ej: Excel Avanzado 2026"
                      style={{width:'100%',background:'var(--s2)',border:'1px solid var(--b)',borderRadius:'10px',padding:'11px 14px 11px 36px',color:'var(--t1)',fontSize:'13px',outline:'none',fontFamily:'inherit'}}/>
                  </div>
                </div>

              {error&&(
                  <div style={{padding:'12px 16px',borderRadius:'10px',fontSize:'13px',marginBottom:'16px',background:'rgba(255,70,100,.08)',border:'1px solid rgba(255,70,100,.2)',color:'var(--err)',display:'flex',alignItems:'flex-start',gap:'8px',flexWrap:'wrap' as const}}>
                    <span>⚠️ {error}</span>
                    {error.includes('crédito')&&<a href="/planes" style={{color:'var(--c)',textDecoration:'none',fontWeight:700,marginLeft:'4px'}}>Ver planes →</a>}
                  </div>
                )}

                <button onClick={handleAnalizar} style={C.btn}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  Procesar con Motor GISTO
                </button>
                <div style={C.proofRow}>
                  {['Sin tarjeta','Análisis en ~30 seg','Video limpio profesional'].map(t=>(
                    <span key={t} style={C.proofItem}><span style={{color:'var(--ok)',fontWeight:700,fontSize:'10px'}}>✓</span>{t}</span>
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
