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
        creditos_minutos: 20,
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

    setLoading(true)
    try {
      if (mode === 'login') {
        const user = await buscarUsuario(email)
        if (!user) { setError('No existe una cuenta con ese email'); setLoading(false); return }
        if (user.fields.Password !== password) { setError('Contraseña incorrecta'); setLoading(false); return }
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
        localStorage.setItem('gisto_user', JSON.stringify({
          id: newUser.id,
          email,
          nombre,
          plan: 'Free',
          creditos: 20
        }))
        router.push('/dashboard')
      }
    } catch(e: any) {
      setError('Error de conexión. Intenta de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:'40px',position:'relative' as const,zIndex:1}}>
      <div style={{width:'100%',maxWidth:'420px'}}>
        {/* LOGO */}
        <div style={{textAlign:'center',marginBottom:'32px'}}>
          <Link href="https://www.thegisto.com" style={{display:'inline-flex',alignItems:'center',gap:'10px',textDecoration:'none',marginBottom:'8px'}}>
            <img src="/isotipo.png" alt="GISTO" style={{height:'52px',filter:'brightness(1.3) drop-shadow(0 0 8px rgba(0,168,232,0.5))'}}/>
            <span style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontWeight:900,fontSize:'22px',color:'var(--t1)'}}>
              THE <span style={{color:'var(--c)'}}>GISTO</span>
            </span>
          </Link>
          <p style={{fontSize:'14px',color:'var(--t2)',marginTop:'8px'}}>
            {mode==='login' ? 'Bienvenido de vuelta' : 'Crea tu cuenta gratuita'}
          </p>
        </div>

        {/* CARD */}
        <div style={{background:'var(--s1)',border:'1px solid var(--b)',borderRadius:'20px',overflow:'hidden',boxShadow:'0 24px 48px rgba(0,0,0,.3)'}}>
          <div style={{height:'2px',background:'linear-gradient(90deg,transparent,var(--c),var(--c2),transparent)'}}/>
          <div style={{padding:'28px'}}>
            {/* TABS */}
            <div style={{display:'flex',gap:'3px',background:'var(--s2)',padding:'3px',borderRadius:'11px',marginBottom:'24px'}}>
              {(['login','register'] as const).map(m=>(
                <button key={m} onClick={()=>{setMode(m);setError('')}} style={{flex:1,padding:'10px',borderRadius:'9px',border:'none',cursor:'pointer',fontSize:'14px',fontWeight:600,transition:'all .2s',background:mode===m?'var(--c)':'transparent',color:mode===m?'#000':'var(--t2)'}}>
                  {m==='login'?'Iniciar sesión':'Crear cuenta'}
                </button>
              ))}
            </div>

            {/* FIELDS */}
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

            {error&&(
              <div style={{padding:'12px 16px',borderRadius:'10px',fontSize:'13px',marginBottom:'16px',background:'rgba(255,70,100,.08)',border:'1px solid rgba(255,70,100,.2)',color:'var(--err)'}}>
                ⚠️ {error}
              </div>
            )}

            <button onClick={handleSubmit} disabled={loading}
              style={{width:'100%',padding:'15px',background:loading?'rgba(0,168,232,.5)':'var(--c)',color:'#000',border:'none',borderRadius:'11px',fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:'16px',fontWeight:900,cursor:loading?'not-allowed':'pointer',transition:'all .2s',boxShadow:loading?'none':'0 8px 24px rgba(0,168,232,.3)',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}>
              {loading?(
                <><div style={{width:'18px',height:'18px',border:'2px solid rgba(0,0,0,.3)',borderTop:'2px solid #000',borderRadius:'50%',animation:'spin 1s linear infinite'}}/>{mode==='login'?'Entrando...':'Creando cuenta...'}</>
              ):(
                mode==='login'?'Entrar al panel →':'Crear cuenta gratis →'
              )}
            </button>

            {mode==='register'&&(
              <p style={{textAlign:'center',fontSize:'12px',color:'var(--t3)',marginTop:'16px',lineHeight:1.6}}>
                Al registrarte recibes <strong style={{color:'var(--c)'}}>20 minutos gratis</strong> para probar GISTO.
              </p>
            )}
          </div>
        </div>

        <p style={{textAlign:'center',fontSize:'12px',color:'var(--t3)',marginTop:'20px'}}>
          <Link href="https://www.thegisto.com" style={{color:'var(--t2)',textDecoration:'none'}}>← Volver a thegisto.com</Link>
        </p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} input:focus{border-color:var(--c)!important;box-shadow:0 0 0 3px rgba(0,168,232,.12);}`}</style>
    </div>
  )
}
