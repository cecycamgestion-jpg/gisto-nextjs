'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'

const PLANES = [
  {
    id:'starter', nombre:'Starter', precio_sol:175, precio_usd:47,
    creditos:120, horas:'2 horas',
    features:['Cápsulas de video pedagógicas','Documentos Word editables','Quizzes y glosario automático','ZIP descargable','Soporte por email'],
    lemon_url:'https://thegisto.lemonsqueezy.com/buy/393a7d12-24d7-4c3d-9d60-400143b384b3',
    popular:false, color:'var(--t2)'
  },
  {
    id:'profesional', nombre:'Profesional', precio_sol:649, precio_usd:175,
    creditos:480, horas:'8 horas',
    features:['Todo el plan Starter','Ideal para 1 curso completo','Prioridad en procesamiento','Soporte prioritario','Válido 12 meses'],
    lemon_url:'https://thegisto.lemonsqueezy.com/buy/3368ed41-079d-4a62-8818-e18c4f72d6c6?discount=0',
    popular:true, color:'var(--c)'
  },
  {
    id:'academia', nombre:'Academia', precio_sol:1180, precio_usd:315,
    creditos:1200, horas:'20 horas',
    features:['Para institutos y empresas','Múltiples cursos','Soporte dedicado','Válido 12 meses','Factura disponible'],
    lemon_url:'https://thegisto.lemonsqueezy.com/buy/0c0dfc86-589e-43d6-adae-b490947910de?discount=0',
    popular:false, color:'#FFB020'
  },
  {
    id:'evento', nombre:'Pack Evento', precio_sol:599, precio_usd:160,
    creditos:480, horas:'8 hrs continuas',
    features:['Para congresos y eventos','Procesamiento continuo','Entrega en 24 hrs','Coordinación directa','Factura disponible'],
    lemon_url:'https://thegisto.lemonsqueezy.com/buy/f2c215a6-4507-48f6-af6a-2a183d60279d?discount=0',
    popular:false, color:'var(--ok)'
  }
]

export default function Planes() {
  const [moneda, setMoneda] = useState<'sol'|'usd'>('sol')
  const [user, setUser] = useState<any>(null)

  useEffect(()=>{
    const u = localStorage.getItem('gisto_user')
    if(u) setUser(JSON.parse(u))
  },[])

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
          {href:'/perfil',label:'Mi perfil',icon:'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'},
        ].map(item=>(
          <Link key={item.href} href={item.href} style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 12px',color:'var(--t2)',textDecoration:'none',borderRadius:'9px',marginBottom:'2px',fontSize:'14px',fontWeight:500,border:'1px solid transparent'}}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon}/></svg>
            {item.label}
          </Link>
        ))}
        <Link href="/planes" style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 12px',color:'var(--t1)',textDecoration:'none',borderRadius:'9px',marginBottom:'2px',fontSize:'14px',fontWeight:500,background:'rgba(0,168,232,0.08)',border:'1px solid var(--b)'}}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--c)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4h22v16H1zM1 10h22"/></svg>
          Planes y pagos
        </Link>
        {user&&(
          <div style={{marginTop:'auto',background:'rgba(0,168,232,.06)',border:'1px solid var(--b)',borderRadius:'12px',padding:'14px'}}>
            <div style={{fontSize:'11px',color:'var(--t2)',marginBottom:'4px'}}>Créditos actuales</div>
            <div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:'22px',fontWeight:900,color:'var(--c)'}}>{user.creditos||0} <span style={{fontSize:'12px',fontWeight:400,color:'var(--t2)'}}>min</span></div>
          </div>
        )}
      </aside>

      {/* MAIN */}
      <main style={{flex:1,overflow:'auto',padding:'32px 40px'}}>
        <div style={{maxWidth:'900px',margin:'0 auto'}}>
          <div style={{textAlign:'center',marginBottom:'36px'}}>
            <h1 style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:'32px',fontWeight:900,letterSpacing:'-1.5px',marginBottom:'8px'}}>Planes y créditos</h1>
            <p style={{fontSize:'15px',color:'var(--t2)',marginBottom:'20px'}}>Créditos por horas de video. Sin suscripción mensual.</p>
            {/* MONEDA TOGGLE */}
            <div style={{display:'inline-flex',gap:'3px',background:'var(--s1)',border:'1px solid var(--b)',padding:'3px',borderRadius:'10px'}}>
              {(['sol','usd'] as const).map(m=>(
                <button key={m} onClick={()=>setMoneda(m)} style={{padding:'8px 20px',borderRadius:'8px',border:'none',cursor:'pointer',fontSize:'13px',fontWeight:600,background:moneda===m?'var(--c)':'transparent',color:moneda===m?'#000':'var(--t2)',transition:'all .2s'}}>
                  {m==='sol'?'S/. Soles':'$ USD'}
                </button>
              ))}
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'16px'}}>
            {PLANES.map(plan=>(
              <div key={plan.id} style={{
  background: plan.popular ? 'linear-gradient(160deg,rgba(0,168,232,.09),#0C1018)' : '#0C1018',
 border: `1px solid ${plan.popular?'var(--c)':'var(--b)'}`,
  borderRadius:'18px',
  padding:'24px',
  position:'relative' as const
}}>
                {plan.popular&&<div style={{position:'absolute' as const,top:'-11px',left:'50%',transform:'translateX(-50%)',background:'var(--c)',color:'#000',fontSize:'11px',fontWeight:800,padding:'3px 16px',borderRadius:'100px',whiteSpace:'nowrap',letterSpacing:'.5px'}}>MÁS VENDIDO</div>}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'16px'}}>
                  <div>
                    <div style={{fontSize:'12px',fontWeight:700,letterSpacing:'2px',textTransform:'uppercase' as const,color:'var(--t2)',marginBottom:'6px'}}>{plan.nombre}</div>
                    <div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:'36px',fontWeight:900,letterSpacing:'-1px',lineHeight:1,color:plan.color}}>
                      {moneda==='sol'?`S/${plan.precio_sol}`:`$${plan.precio_usd}`}
                    </div>
                    <div style={{fontSize:'12px',color:'var(--t2)',marginTop:'4px'}}>IGV incluido</div>
                  </div>
                  <div style={{textAlign:'right' as const}}>
                    <div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:'22px',fontWeight:800,color:plan.color}}>{plan.horas}</div>
                    <div style={{fontSize:'11px',color:'var(--t3)'}}>de video</div>
                  </div>
                </div>
                <div style={{borderTop:'1px solid var(--b)',paddingTop:'16px',marginBottom:'16px'}}>
                  {plan.features.map((f,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:'8px',fontSize:'13px',color:'var(--t2)',marginBottom:'7px'}}>
                      <span style={{color:'var(--ok)',fontWeight:700,fontSize:'11px',flexShrink:0}}>✓</span>{f}
                    </div>
                  ))}
                </div>
                <a href={plan.lemon_url} target="_blank" style={{display:'block',textAlign:'center',padding:'13px',borderRadius:'10px',fontWeight:700,fontSize:'14px',textDecoration:'none',transition:'all .2s',background:plan.popular?'var(--c)':'transparent',color:plan.popular?'#000':'var(--t1)',border:plan.popular?'none':'1px solid var(--b)'}}>
                  {plan.popular?'Comprar ahora →':'Empezar'}
                </a>
              </div>
            ))}
          </div>

          <div style={{background:'rgba(0,168,232,.05)',border:'1px solid var(--b)',borderRadius:'14px',padding:'20px 24px',marginTop:'24px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'16px',flexWrap:'wrap' as const}}>
            <div>
              <div style={{fontFamily:"'Cabinet Grotesk',sans-serif",fontSize:'17px',fontWeight:800,marginBottom:'3px'}}>¿Aún no probaste GISTO?</div>
              <div style={{fontSize:'13px',color:'var(--t2)'}}>20 minutos gratis al registrarte. Sin tarjeta de crédito.</div>
            </div>
            <Link href="/upload" style={{background:'var(--c)',color:'#000',padding:'12px 24px',borderRadius:'9px',fontWeight:700,fontSize:'14px',textDecoration:'none'}}>
              Probar gratis →
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
