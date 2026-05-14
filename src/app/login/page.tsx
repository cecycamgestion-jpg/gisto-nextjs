'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const AIRTABLE_KEY = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY
const AIRTABLE_BASE = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID

export default function Login() {
  const [mode, setMode] = useState<'login'|'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [aceptaTerminos, setAceptaTerminos] = useState(false)
  const router = useRouter()

  async function buscarUsuario(email: string) {
    const r = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE}/Usuarios?filterByFormula=${encodeURIComponent(`{Email}="${email}"`)}`,
      { headers: { 'Authorization': `Bearer ${AIRTABLE_KEY}` } }
    )
    const data = await r.json()
    return data.records?.[0] || null
  }

  async function crearUsuario(email: string, nombre: string, password: string) {
    const r = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/Usuarios`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${AIRTABLE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: {
        Email: email,
        Nombre: nombre,
        Password: password,
        creditos_minutos: 40,
        plan: 'Free'
      }})
    })
    return await r.json()
  }

  async function handleSubmit() {
    setError('')
    if (!email.includes('@')) { setError('Email inválido'); return }
    if (password.length < 6) { setError('Contraseña mínimo 6 caracteres'); return }
    if (mode === 'register' && !nombre.trim()) { setError('Ingresa tu nombre'); return }
    if (mode === 'register' && !aceptaTerminos) { setError('Debes aceptar los Términos y la Política de Privacidad'); return }

    setLoading(true)
    try {
      if (mode === 'login') {
        const user = await buscarUsuario(email)
        if (!user) { setError('No existe una cuenta con ese email'); setLoading(false); return }
        if (user.fields.Password !== password) { setError('Contraseña incorrecta'); setLoading(false); return }
        document.cookie = `gisto_session=active; path=/; max-age=${60*60*24*7}`
        localStorage.setItem('gisto_user', JSON.stringify({
          id: user.id,
          email: user.fields.Email,
          nombre: user.fields.Nombre || email.split('@')[0],
          plan: user.fields.plan || 'Free',
          creditos: user.fields.creditos_minutos || 0
        }))
        router.push('/dashboard')
      } else {
        const existing = await buscarUsuario(email)
        if (existing) { setError('Ya existe una cuenta con ese email'); setLoading(false); return }
        const newUser = await crearUsuario(email, nombre, password)
        if (!newUser.id) { setError('Error creando cuenta'); setLoading(false); return }
        document.cookie = `gisto_session=active; path=/; max-age=${60*60*24*7}`

        await fetch('/api/email/bienvenida', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({email, nombre})
        })

        localStorage.setItem('gisto_user', JSON.stringify({
          id: newUser.id,
          email,
          nombre,
          plan: 'Free',
          creditos: 40
        }))
        router.push('/dashboard')
      }
    } catch(e: any) {
      setError('Error de conexión. Intenta de nuevo.')
      setLoading(false)
    }
  }

  const botonDeshabilitado = loading || (mode === 'register' && !aceptaTerminos)

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:'40px',position:'relative' as const,zIndex:1}}>
      <div style={{width:'100%',maxWidth:'420px'}}>

        {/* LOGO — fix: redirige a landing */}
        <div style={{textAlign:'center',marginBottom:'32px'}}>
          <a href="https://www.thegisto.com" style={{display:'inline-flex',alignItems:'center',gap:'10px',textDecoration:'none',marginBottom:'8px'}}>
            <img src="/isotipo.png" alt="GISTO" style={{height:'52px',filter:'brightness(1.3) drop-shadow(0 0 8px rgba(0,168,232,0.5))'}}/>
            <span style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontWeight:900,fontSize:'22px',color:'var(--t1)'}}>
              THE <span style={{color:'var(--c)'}}>GISTO</span>
            </span>
          </a>
          <p style={{fontSize:'14px',color:'var(--t2)',marginTop:'8px'}}>
            {mode==='login' ? 'Bienvenido de vuelta' : 'Crea tu cuenta gratuita'}
          </p>
        </div>

        <div style={{background:'var(--s1)',border:'1px solid var(--b)',borderRadius:'20px',overflow:'hidden',boxShadow:'0 24px 48px rgba(0,0,0,.3)'}}>
          <div style={{height:'2px',background:'linear-gradient(90deg,transparent,var(--c),var(--c2),transparent)'}}/>
          <div style={{padding:'28px'}}>

            {/* TABS */}
            <div style={{display:'flex',gap:'3px',background:'var(--s2)',padding:'3px',borderRadius:'11px',marginBottom:'24px'}}>
              {(['login','register'] as const).map(m=>(
                <button key={m} onClick={()=>{setMode(m);setError('');setAceptaTerminos(false)}} style={{flex:1,padding:'10px',borderRadius:'9px',border:'none',cursor:'pointer',fontSize:'14px',fontWeight:600,transition:'all .2s',background:mode===m?'var(--c)':'transparent',color:mode===m?'#000':'var(--t2)'}}>
                  {m==='login'?'Iniciar sesión':'Crear cuenta'}
                </button>
              ))}
            </div>

            {/* CAMPOS */}
            <div style={{display:'flex',flexDirection:'column' as const,gap:'12px',marginBottom:'20px'}}>
              {mode==='register'&&(
                <div>
                  <label style={{fontSize:'11px',fontWeight:700,color:'var(--t3)',letterSpacing:'1.5px',textTransform:'uppercase' as const,display:'block',marginBottom:'8px'}}>Nombre</label>
                  <input type="text" value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Tu nombre completo"
                    style={{width:'100%',background:'var(--s2)',border:'1px solid var(--b)',borderRadius:'10px',padding:'13px 16px',color:'var(--t1)',fontSize:'14px',outline:'none',fontFamily:'inherit'}}/>
                </div>
              )}
              <div>
                <label style={{fontSize:'11px',fontWeight:700,color:'var(--t3)',letterSpacing:'1.5px',textTransform:'uppercase' as const,display:'block',marginBottom:'8px'}}>Email</label>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="tu@email.com"
                  style={{width:'100%',background:'var(--s2)',border:'1px solid var(--b)',borderRadius:'10px',padding:'13px 16px',color:'var(--t1)',fontSize:'14px',outline:'none',fontFamily:'inherit'}}/>
              </div>
              <div>
                <label style={{fontSize:'11px',fontWeight:700,color:'var(--t3)',letterSpacing:'1.5px',textTransform:'uppercase' as const,display:'block',marginBottom:'8px'}}>Contraseña</label>
                <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo 6 caracteres"
                  onKeyDown={e=>e.key==='Enter'&&handleSubmit()}
                  style={{width:'100%',background:'var(--s2)',border:'1px solid var(--b)',borderRadius:'10px',padding:'13px 16px',color:'var(--t1)',fontSize:'14px',outline:'none',fontFamily:'inherit'}}/>
              </div>
            </div>

            {/* CHECKBOX TÉRMINOS — solo en registro */}
            {mode==='register'&&(
              <div style={{marginBottom:'16px'}}>
                <label style={{display:'flex',alignItems:'flex-start',gap:'10px',cursor:'pointer'}}>
                  <div
                    onClick={()=>setAceptaTerminos(v=>!v)}
                    style={{
                      width:'18px',height:'18px',borderRadius:'4px',flexShrink:0,marginTop:'1px',
                      background: aceptaTerminos ? 'var(--c)' : 'var(--s2)',
                      border: `1.5px solid ${aceptaTerminos ? 'var(--c)' : 'rgba(255,255,255,.2)'}`,
                      display:'flex',alignItems:'center',justifyContent:'center',
                      transition:'all .2s',cursor:'pointer'
                    }}
                  >
                    {aceptaTerminos && (
                      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                        <polyline points="2,6 5,9 10,3" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <span style={{fontSize:'13px',color:'var(--t2)',lineHeight:1.5}}>
                    Acepto los{' '}
                    <a href="https://www.thegisto.com/legal/terminos/" target="_blank" rel="noopener noreferrer"
                      style={{color:'var(--c)',textDecoration:'none',fontWeight:600}}>
                      Términos y Condiciones
                    </a>
                    {' '}y la{' '}
                    <a href="https://www.thegisto.com/legal/privacidad/" target="_blank" rel="noopener noreferrer"
                      style={{color:'var(--c)',textDecoration:'none',fontWeight:600}}>
                      Política de Privacidad
                    </a>
                  </span>
                </label>
              </div>
            )}

            {/* ERROR */}
            {error&&(
              <div style={{padding:'12px 16px',borderRadius:'10px',fontSize:'13px',marginBottom:'16px',background:'rgba(255,70,100,.08)',border:'1px solid rgba(255,70,100,.2)',color:'var(--err)'}}>
                ⚠️ {error}
              </div>
            )}

            {/* BOTÓN */}
            <button
              onClick={handleSubmit}
              disabled={botonDeshabilitado}
              style={{
                width:'100%',padding:'15px',
                background: botonDeshabilitado ? 'rgba(0,168,232,.3)' : 'var(--c)',
                color: botonDeshabilitado ? 'rgba(0,0,0,.5)' : '#000',
                border:'none',borderRadius:'11px',
                fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:'16px',fontWeight:900,
                cursor: botonDeshabilitado ? 'not-allowed' : 'pointer',
                transition:'all .2s',
                boxShadow: botonDeshabilitado ? 'none' : '0 8px 24px rgba(0,168,232,.3)',
                display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'
              }}
            >
              {loading?(
                <><div style={{width:'18px',height:'18px',border:'2px solid rgba(0,0,0,.3)',borderTop:'2px solid #000',borderRadius:'50%',animation:'spin 1s linear infinite'}}/>{mode==='login'?'Entrando...':'Creando cuenta...'}</>
              ):(
                mode==='login'?'Entrar al panel →':'Crear cuenta gratis →'
              )}
            </button>

            {mode==='register'&&(
              <p style={{textAlign:'center',fontSize:'12px',color:'var(--t3)',marginTop:'16px',lineHeight:1.6}}>
                Al registrarte recibes <strong style={{color:'var(--c)'}}>40 minutos gratis</strong> para probar GISTO.
              </p>
            )}
          </div>
        </div>

        <p style={{textAlign:'center',fontSize:'12px',color:'var(--t3)',marginTop:'20px'}}>
          <a href="https://www.thegisto.com" style={{color:'var(--t2)',textDecoration:'none'}}>← Volver a thegisto.com</a>
        </p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} input:focus{border-color:var(--c)!important;box-shadow:0 0 0 3px rgba(0,168,232,.12);}`}</style>
    </div>
  )
}
