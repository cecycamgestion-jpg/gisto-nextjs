'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const PAISES = [
  'Argentina','Bolivia','Chile','Colombia','Costa Rica','Ecuador',
  'El Salvador','España','Estados Unidos','Guatemala','Honduras',
  'México','Nicaragua','Panamá','Paraguay','Perú','República Dominicana',
  'Uruguay','Venezuela','Otro'
]
const TIPOS_DOCUMENTO = ['DNI','RUC','Pasaporte','Tax ID','Cédula','Otro']

export default function Login() {
  const [mode, setMode] = useState<'login'|'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [pais, setPais] = useState('')
  const [tipoDocumento, setTipoDocumento] = useState('')
  const [numeroDocumento, setNumeroDocumento] = useState('')
  const [razonSocial, setRazonSocial] = useState('')
  const [aceptaTerminos, setAceptaTerminos] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit() {
    setError('')
    if (!email.includes('@')) { setError('Invalid email'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (mode === 'register') {
      if (!nombre.trim()) { setError('Full name is required'); return }
      if (!pais) { setError('Country is required'); return }
      if (!tipoDocumento) { setError('ID type is required'); return }
      if (!numeroDocumento.trim()) { setError('ID number is required'); return }
      if (!aceptaTerminos) { setError('Please accept the Terms of Service and Privacy Policy'); return }
    }
    setLoading(true)
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const body = mode === 'login'
        ? { email, password }
        : { email, password, nombre, pais, tipo_documento: tipoDocumento, numero_documento: numeroDocumento, razon_social: razonSocial || nombre }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Unknown error'); setLoading(false); return }
      localStorage.setItem('gisto_user', JSON.stringify(data.user))
      router.push('/dashboard')
    } catch {
      setError('Connection error. Please try again.')
      setLoading(false)
    }
  }

  const botonDeshabilitado = loading || (mode === 'register' && !aceptaTerminos)

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:'40px',position:'relative' as const,zIndex:1}}>
      <div style={{width:'100%',maxWidth:'460px'}}>
        <div style={{textAlign:'center',marginBottom:'32px'}}>
          <a href="https://www.thegisto.com" style={{display:'inline-flex',alignItems:'center',gap:'10px',textDecoration:'none',marginBottom:'8px'}}>
            <img src="/isotipo.png" alt="GISTO" style={{height:'52px',filter:'brightness(1.3) drop-shadow(0 0 8px rgba(0,168,232,0.5))'}}/>
            <span style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontWeight:900,fontSize:'22px',color:'var(--t1)'}}>
              THE <span style={{color:'var(--c)'}}>GISTO</span>
            </span>
          </a>
          <p style={{fontSize:'14px',color:'var(--t2)',marginTop:'8px'}}>
            {mode==='login' ? 'Welcome back' : 'Create your free account'}
          </p>
        </div>

        <div style={{background:'var(--s1)',border:'1px solid var(--b)',borderRadius:'20px',overflow:'hidden',boxShadow:'0 24px 48px rgba(0,0,0,.3)'}}>
          <div style={{height:'2px',background:'linear-gradient(90deg,transparent,var(--c),var(--c2),transparent)'}}/>
          <div style={{padding:'28px'}}>
            <div style={{display:'flex',gap:'3px',background:'var(--s2)',padding:'3px',borderRadius:'11px',marginBottom:'24px'}}>
              {(['login','register'] as const).map(m=>(
                <button key={m} onClick={()=>{setMode(m);setError('');setAceptaTerminos(false)}}
                  style={{flex:1,padding:'10px',borderRadius:'9px',border:'none',cursor:'pointer',fontSize:'14px',fontWeight:600,transition:'all .2s',background:mode===m?'var(--c)':'transparent',color:mode===m?'#000':'var(--t2)'}}>
                  {m==='login'?'Sign in':'Create account'}
                </button>
              ))}
            </div>

            <div style={{display:'flex',flexDirection:'column' as const,gap:'12px',marginBottom:'20px'}}>
              {mode==='register'&&(
                <div>
                  <label style={{fontSize:'11px',fontWeight:700,color:'var(--t3)',letterSpacing:'1.5px',textTransform:'uppercase' as const,display:'block',marginBottom:'8px'}}>Full name *</label>
                  <input type="text" value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Your full name"
                    style={{width:'100%',background:'var(--s2)',border:'1px solid var(--b)',borderRadius:'10px',padding:'13px 16px',color:'var(--t1)',fontSize:'14px',outline:'none',fontFamily:'inherit'}}/>
                </div>
              )}
              <div>
                <label style={{fontSize:'11px',fontWeight:700,color:'var(--t3)',letterSpacing:'1.5px',textTransform:'uppercase' as const,display:'block',marginBottom:'8px'}}>Email *</label>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@email.com"
                  style={{width:'100%',background:'var(--s2)',border:'1px solid var(--b)',borderRadius:'10px',padding:'13px 16px',color:'var(--t1)',fontSize:'14px',outline:'none',fontFamily:'inherit'}}/>
              </div>
              <div>
                <label style={{fontSize:'11px',fontWeight:700,color:'var(--t3)',letterSpacing:'1.5px',textTransform:'uppercase' as const,display:'block',marginBottom:'8px'}}>Password *</label>
                <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimum 6 characters"
                  onKeyDown={e=>e.key==='Enter'&&!botonDeshabilitado&&handleSubmit()}
                  style={{width:'100%',background:'var(--s2)',border:'1px solid var(--b)',borderRadius:'10px',padding:'13px 16px',color:'var(--t1)',fontSize:'14px',outline:'none',fontFamily:'inherit'}}/>
              </div>

              {mode==='register'&&(<>
                <div style={{height:'1px',background:'var(--b)',margin:'4px 0'}}/>
                <div style={{fontSize:'11px',fontWeight:700,color:'var(--t3)',letterSpacing:'1.5px',textTransform:'uppercase' as const}}>Billing information</div>
                <div>
                  <label style={{fontSize:'11px',fontWeight:700,color:'var(--t3)',letterSpacing:'1.5px',textTransform:'uppercase' as const,display:'block',marginBottom:'8px'}}>Country *</label>
                  <select value={pais} onChange={e=>setPais(e.target.value)}
                    style={{width:'100%',background:'var(--s2)',border:'1px solid var(--b)',borderRadius:'10px',padding:'13px 16px',color:pais?'var(--t1)':'var(--t3)',fontSize:'14px',outline:'none',fontFamily:'inherit',cursor:'pointer'}}>
                    <option value="">Select your country</option>
                    {PAISES.map(p=><option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1.5fr',gap:'10px'}}>
                  <div>
                    <label style={{fontSize:'11px',fontWeight:700,color:'var(--t3)',letterSpacing:'1.5px',textTransform:'uppercase' as const,display:'block',marginBottom:'8px'}}>ID Type *</label>
                    <select value={tipoDocumento} onChange={e=>setTipoDocumento(e.target.value)}
                      style={{width:'100%',background:'var(--s2)',border:'1px solid var(--b)',borderRadius:'10px',padding:'13px 14px',color:tipoDocumento?'var(--t1)':'var(--t3)',fontSize:'13px',outline:'none',fontFamily:'inherit',cursor:'pointer'}}>
                      <option value="">Type</option>
                      {TIPOS_DOCUMENTO.map(t=><option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{fontSize:'11px',fontWeight:700,color:'var(--t3)',letterSpacing:'1.5px',textTransform:'uppercase' as const,display:'block',marginBottom:'8px'}}>ID Number *</label>
                    <input type="text" value={numeroDocumento} onChange={e=>setNumeroDocumento(e.target.value)} placeholder="Document number"
                      style={{width:'100%',background:'var(--s2)',border:'1px solid var(--b)',borderRadius:'10px',padding:'13px 14px',color:'var(--t1)',fontSize:'13px',outline:'none',fontFamily:'inherit'}}/>
                  </div>
                </div>
                <div>
                  <label style={{fontSize:'11px',fontWeight:700,color:'var(--t3)',letterSpacing:'1.5px',textTransform:'uppercase' as const,display:'block',marginBottom:'8px'}}>Company / Billing name <span style={{color:'var(--t3)',fontWeight:400,textTransform:'none'}}>optional</span></label>
                  <input type="text" value={razonSocial} onChange={e=>setRazonSocial(e.target.value)} placeholder="Leave blank to use your full name"
                    style={{width:'100%',background:'var(--s2)',border:'1px solid var(--b)',borderRadius:'10px',padding:'13px 16px',color:'var(--t1)',fontSize:'14px',outline:'none',fontFamily:'inherit'}}/>
                </div>
              </>)}
            </div>

            {mode==='register'&&(
              <div style={{marginBottom:'16px'}}>
                <label style={{display:'flex',alignItems:'flex-start',gap:'10px',cursor:'pointer'}}>
                  <div onClick={()=>setAceptaTerminos(v=>!v)} style={{width:'18px',height:'18px',borderRadius:'4px',flexShrink:0,marginTop:'1px',background:aceptaTerminos?'var(--c)':'var(--s2)',border:`1.5px solid ${aceptaTerminos?'var(--c)':'rgba(255,255,255,.2)'}`,display:'flex',alignItems:'center',justifyContent:'center',transition:'all .2s',cursor:'pointer'}}>
                    {aceptaTerminos&&<svg width="11" height="11" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <span style={{fontSize:'13px',color:'var(--t2)',lineHeight:1.5}}>
                    I agree to the{' '}
                    <a href="https://www.thegisto.com/legal/terminos/" target="_blank" rel="noopener noreferrer" style={{color:'var(--c)',textDecoration:'none',fontWeight:600}}>Terms of Service</a>
                    {' '}and{' '}
                    <a href="https://www.thegisto.com/legal/privacidad/" target="_blank" rel="noopener noreferrer" style={{color:'var(--c)',textDecoration:'none',fontWeight:600}}>Privacy Policy</a>
                  </span>
                </label>
              </div>
            )}

            {error&&(
              <div style={{padding:'12px 16px',borderRadius:'10px',fontSize:'13px',marginBottom:'16px',background:'rgba(255,70,100,.08)',border:'1px solid rgba(255,70,100,.2)',color:'var(--err)'}}>
                ⚠️ {error}
              </div>
            )}

            <button onClick={handleSubmit} disabled={botonDeshabilitado}
              style={{width:'100%',padding:'15px',background:botonDeshabilitado?'rgba(0,168,232,.3)':'var(--c)',color:botonDeshabilitado?'rgba(0,0,0,.5)':'#000',border:'none',borderRadius:'11px',fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:'16px',fontWeight:900,cursor:botonDeshabilitado?'not-allowed':'pointer',transition:'all .2s',boxShadow:botonDeshabilitado?'none':'0 8px 24px rgba(0,168,232,.3)',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}>
              {loading?(
                <><div style={{width:'18px',height:'18px',border:'2px solid rgba(0,0,0,.3)',borderTop:'2px solid #000',borderRadius:'50%',animation:'spin 1s linear infinite'}}/>{mode==='login'?'Signing in...':'Creating account...'}</>
              ):(
                mode==='login'?'Sign in →':'Create free account →'
              )}
            </button>

            {mode==='register'&&(
              <p style={{textAlign:'center',fontSize:'12px',color:'var(--t3)',marginTop:'16px',lineHeight:1.6}}>
                You get <strong style={{color:'var(--c)'}}>40 free minutes</strong> to try GISTO. No credit card required.
              </p>
            )}
          </div>
        </div>
        <p style={{textAlign:'center',fontSize:'12px',color:'var(--t3)',marginTop:'20px'}}>
          <a href="https://www.thegisto.com" style={{color:'var(--t2)',textDecoration:'none'}}>← Back to thegisto.com</a>
        </p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} input:focus,select:focus{border-color:var(--c)!important;box-shadow:0 0 0 3px rgba(0,168,232,.12);}`}</style>
    </div>
  )
}
