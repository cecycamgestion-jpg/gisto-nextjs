'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'

const PLANES = [
  {
    id: 'starter',
    nombre: 'Starter',
    precio: 49,
    creditos: 120,
    horas: '2 hours',
    features: [
      'Pedagogical video capsules',
      'Editable Word documents',
      'Automatic quizzes & glossary',
      'Downloadable ZIP',
      'Email support'
    ],
    product_id: '393a7d12-24d7-4c3d-9d60-400143b384b3',
    popular: false,
    color: 'var(--t2)'
  },
  {
    id: 'professional',
    nombre: 'Professional',
    precio: 179,
    creditos: 480,
    horas: '8 hours',
    features: [
      'Everything in Starter',
      'Ideal for 1 complete course',
      'Priority processing',
      'Priority support',
      'No expiration'
    ],
    product_id: '3368ed41-079d-4a62-8818-e18c4f72d6c6',
    popular: true,
    color: 'var(--c)'
  },
  {
    id: 'academia',
    nombre: 'Academia',
    precio: 329,
    creditos: 1200,
    horas: '20 hours',
    features: [
      'For institutions & companies',
      'Multiple courses',
      'Dedicated support',
      'No expiration',
      'Invoice available'
    ],
    product_id: '0c0dfc86-589e-43d6-adae-b490947910de',
    popular: false,
    color: '#FFB020'
  }
]

export default function Planes() {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const u = localStorage.getItem('gisto_user')
    if (u) setUser(JSON.parse(u))
  }, [])

  function buildCheckoutUrl(productId: string) {
    const base = `https://thegisto.lemonsqueezy.com/buy/${productId}`
    if (!user) return base
    const params = new URLSearchParams({
      'checkout[custom][user_id]': user.id || '',
      'checkout[email]': user.email || '',
    })
    return `${base}?${params.toString()}`
  }

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
          {href:'/perfil',label:'My profile',icon:'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'},
        ].map(item=>(
          <Link key={item.href} href={item.href} style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 12px',color:'var(--t2)',textDecoration:'none',borderRadius:'9px',marginBottom:'2px',fontSize:'14px',fontWeight:500,border:'1px solid transparent'}}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon}/></svg>
            {item.label}
          </Link>
        ))}
        <Link href="/planes" style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 12px',color:'var(--t1)',textDecoration:'none',borderRadius:'9px',marginBottom:'2px',fontSize:'14px',fontWeight:500,background:'rgba(0,168,232,0.08)',border:'1px solid var(--b)'}}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--c)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4h22v16H1zM1 10h22"/></svg>
          Plans & billing
        </Link>
        {user&&(
          <div style={{marginTop:'auto',background:'rgba(0,168,232,.06)',border:'1px solid var(--b)',borderRadius:'12px',padding:'14px'}}>
            <div style={{fontSize:'11px',color:'var(--t2)',marginBottom:'4px'}}>Current credits</div>
            <div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:'22px',fontWeight:900,color:'var(--c)'}}>{user.creditos||0} <span style={{fontSize:'12px',fontWeight:400,color:'var(--t2)'}}>min</span></div>
          </div>
        )}
      </aside>

      {/* MAIN */}
      <main style={{flex:1,overflow:'auto',padding:'32px 40px'}}>
        <div style={{maxWidth:'900px',margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:'36px'}}>
            <h1 style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:'32px',fontWeight:900,letterSpacing:'-1.5px',marginBottom:'8px'}}>Plans & Credits</h1>
            <p style={{fontSize:'15px',color:'var(--t2)'}}>Pay per hours of video. No monthly subscription. Credits never expire.</p>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'16px'}}>
            {PLANES.map(plan=>(
              <div key={plan.id} style={{
                background: plan.popular ? 'linear-gradient(160deg,rgba(0,168,232,.09),#0C1018)' : '#0C1018',
                border: `1px solid ${plan.popular?'var(--c)':'var(--b)'}`,
                borderRadius:'18px',
                padding:'24px',
                position:'relative' as const
              }}>
                {plan.popular&&<div style={{position:'absolute' as const,top:'-11px',left:'50%',transform:'translateX(-50%)',background:'var(--c)',color:'#000',fontSize:'11px',fontWeight:800,padding:'3px 16px',borderRadius:'100px',whiteSpace:'nowrap' as const,letterSpacing:'.5px'}}>MOST POPULAR</div>}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'16px'}}>
                  <div>
                    <div style={{fontSize:'12px',fontWeight:700,letterSpacing:'2px',textTransform:'uppercase' as const,color:'var(--t2)',marginBottom:'6px'}}>{plan.nombre}</div>
                    <div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:'36px',fontWeight:900,letterSpacing:'-1px',lineHeight:1,color:plan.color}}>
                      ${plan.precio}
                    </div>
                    <div style={{fontSize:'12px',color:'var(--t3)',marginTop:'4px'}}>USD · one-time</div>
                  </div>
                  <div style={{textAlign:'right' as const}}>
                    <div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:'22px',fontWeight:800,color:plan.color}}>{plan.horas}</div>
                    <div style={{fontSize:'11px',color:'var(--t3)'}}>of video</div>
                  </div>
                </div>
                <div style={{borderTop:'1px solid var(--b)',paddingTop:'16px',marginBottom:'16px'}}>
                  {plan.features.map((f,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:'8px',fontSize:'13px',color:'var(--t2)',marginBottom:'7px'}}>
                      <span style={{color:'var(--ok)',fontWeight:700,fontSize:'11px',flexShrink:0}}>✓</span>{f}
                    </div>
                  ))}
                </div>
                <a
                  href={buildCheckoutUrl(plan.product_id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{display:'block',textAlign:'center',padding:'13px',borderRadius:'10px',fontWeight:700,fontSize:'14px',textDecoration:'none',transition:'all .2s',background:plan.popular?'var(--c)':'transparent',color:plan.popular?'#000':'var(--t1)',border:plan.popular?'none':'1px solid var(--b)'}}>
                  {plan.popular?'Get Professional →':'Get started →'}
                </a>
              </div>
            ))}
          </div>

          {/* FREE PLAN */}
          <div style={{marginTop:'20px',background:'var(--s1)',border:'1px solid var(--b)',borderRadius:'14px',padding:'20px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap' as const,gap:'16px'}}>
            <div>
              <div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:'18px',fontWeight:700,marginBottom:'4px'}}>Free Plan</div>
              <div style={{fontSize:'13px',color:'var(--t2)'}}>40 free minutes included with your account. No credit card required.</div>
            </div>
            <div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:'28px',fontWeight:900,color:'var(--ok)'}}>$0</div>
          </div>

          {/* NOTA FACTURACIÓN */}
          <div style={{marginTop:'24px',background:'rgba(0,168,232,.04)',border:'1px solid rgba(0,168,232,.12)',borderRadius:'12px',padding:'16px 20px',fontSize:'13px',color:'var(--t2)',lineHeight:1.6}}>
            <strong style={{color:'var(--t1)'}}>Billing:</strong> Payments are processed securely. An official receipt will be issued to the billing information provided at registration. Credits are added instantly after payment confirmation.
          </div>
        </div>
      </main>
    </div>
  )
}
