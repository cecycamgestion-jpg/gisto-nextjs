'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'

const PLANES = [
  {
    id: 'starter', nombre: 'Starter', precio: 49, creditos: 120, horas: '2 horas',
    features: ['Cápsulas de video pedagógicas','Documentos Word editables','Quiz automático y glosario','ZIP descargable','Soporte por email'],
    product_id: '393a7d12-24d7-4c3d-9d60-400143b384b3', popular: false, color: 'var(--t2)'
  },
  {
    id: 'professional', nombre: 'Professional', precio: 179, creditos: 480, horas: '8 horas',
    features: ['Todo lo de Starter','Ideal para 1 curso completo','Procesamiento prioritario','Soporte prioritario','Sin vencimiento'],
    product_id: '3368ed41-079d-4a62-8818-e18c4f72d6c6', popular: true, color: '#00A8E8'
  },
  {
    id: 'academia', nombre: 'Academia', precio: 329, creditos: 1200, horas: '20 horas',
    features: ['Para instituciones y empresas','Múltiples cursos','Soporte dedicado','Sin vencimiento','Factura disponible'],
    product_id: '0c0dfc86-589e-43d6-adae-b490947910de', popular: false, color: '#FFB020'
  }
]

const NAV_ITEMS = [
  { href:'/dashboard', label:'Dashboard', icon:'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z' },
  { href:'/upload',    label:'Subir video', icon:'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12' },
  { href:'/perfil',    label:'Mi perfil', icon:'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' },
  { href:'/planes',    label:'Planes y pagos', icon:'M1 4h22v16H1zM1 10h22', active: true },
]

export default function Planes() {
  const [user, setUser] = useState<any>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

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

  const Sidebar = () => (
    <aside style={{
      width: '260px', background: 'var(--s1)', borderRight: '1px solid var(--b)',
      padding: '20px 16px', display: 'flex', flexDirection: 'column' as const, flexShrink: 0,
      ...(isMobile ? {
        position: 'fixed' as const, top: 0, left: 0, bottom: 0, zIndex: 100,
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform .3s ease',
        boxShadow: sidebarOpen ? '4px 0 32px rgba(0,0,0,.6)' : 'none'
      } : { position: 'relative' as const })
    }}>
      <Link href="/" style={{ display:'flex', alignItems:'center', gap:'10px', textDecoration:'none', marginBottom:'32px' }}
        onClick={() => isMobile && setSidebarOpen(false)}>
        <img src="/isotipo.png" alt="GISTO" style={{ height:'48px', width:'auto', objectFit:'contain' }}/>
        <span style={{ fontFamily:"'Cabinet Grotesk',sans-serif", fontWeight:900, fontSize:'18px', color:'var(--t1)' }}>
          THE <span style={{ color:'#00A8E8' }}>GISTO</span>
        </span>
      </Link>

      {NAV_ITEMS.map(item => (
        <Link key={item.href} href={item.href}
          onClick={() => isMobile && setSidebarOpen(false)}
          style={{
            display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px',
            color: item.active ? 'var(--t1)' : 'var(--t2)',
            textDecoration:'none', borderRadius:'9px', marginBottom:'2px',
            fontSize:'14px', fontWeight:500,
            background: item.active ? 'rgba(0,168,232,0.08)' : 'transparent',
            border: item.active ? '1px solid var(--b)' : '1px solid transparent',
            transition:'all .2s'
          }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
            stroke={item.active ? '#00A8E8' : 'var(--t3)'}
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d={item.icon}/>
          </svg>
          {item.label}
        </Link>
      ))}

      {user && (
        <div style={{ marginTop:'auto', background:'rgba(0,168,232,.06)', border:'1px solid var(--b)', borderRadius:'12px', padding:'14px' }}>
          <div style={{ fontSize:'11px', color:'var(--t2)', marginBottom:'4px' }}>Créditos actuales</div>
          <div style={{ fontFamily:"'Cabinet Grotesk',sans-serif", fontSize:'22px', fontWeight:900, color:'#00A8E8' }}>
            {user.creditos||0} <span style={{ fontSize:'12px', fontWeight:400, color:'var(--t2)' }}>min</span>
          </div>
          <div style={{ fontSize:'10px', color:'var(--t3)', marginTop:'2px' }}>Plan: {user.plan||'Free'}</div>
        </div>
      )}
    </aside>
  )

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', position:'relative' as const, zIndex:1 }}>
      {/* Overlay móvil */}
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position:'fixed' as const, inset:0, background:'rgba(0,0,0,.6)', zIndex:99 }}/>
      )}

      <Sidebar />

      <main style={{ flex:1, overflow:'auto', display:'flex', flexDirection:'column' as const }}>
        {/* Topbar móvil */}
        {isMobile && (
          <div style={{
            position:'sticky' as const, top:0, zIndex:50,
            display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'12px 16px', background:'rgba(6,8,16,.95)',
            backdropFilter:'blur(12px)', borderBottom:'1px solid var(--b)', flexShrink:0
          }}>
            <button onClick={() => setSidebarOpen(v => !v)} style={{
              background:'rgba(255,255,255,.06)', border:'1px solid var(--b)',
              borderRadius:'8px', color:'var(--t1)', padding:'8px',
              cursor:'pointer', display:'flex', alignItems:'center'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <span style={{ fontFamily:"'Cabinet Grotesk',sans-serif", fontWeight:800, fontSize:'15px' }}>
              Planes y pagos
            </span>
            {user && (
              <span style={{ fontSize:'12px', fontWeight:800, color:'#00A8E8' }}>
                {user.creditos||0} min
              </span>
            )}
          </div>
        )}

        {/* Contenido */}
        <div style={{ padding: isMobile ? '20px 16px' : '32px 40px', flex:1 }}>
          <div style={{ maxWidth:'900px', margin:'0 auto' }}>

            {/* Header */}
            <div style={{ textAlign:'center', marginBottom: isMobile ? '24px' : '36px' }}>
              <h1 style={{
                fontFamily:"'Cabinet Grotesk',sans-serif",
                fontSize: isMobile ? '24px' : '32px',
                fontWeight:900, letterSpacing:'-1.5px', marginBottom:'8px'
              }}>Planes y Créditos</h1>
              <p style={{ fontSize: isMobile ? '13px' : '15px', color:'var(--t2)', lineHeight:1.5 }}>
                Paga por horas de video. Sin suscripción mensual. Los créditos no vencen.
              </p>
            </div>

            {/* Cards de planes */}
            <div style={{
              display:'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)',
              gap: isMobile ? '12px' : '16px',
              marginBottom: isMobile ? '16px' : '20px'
            }}>
              {PLANES.map(plan => (
                <div key={plan.id} style={{
                  background: plan.popular ? 'linear-gradient(160deg,rgba(0,168,232,.09),#0C1018)' : '#0C1018',
                  border: `1px solid ${plan.popular ? '#00A8E8' : 'var(--b)'}`,
                  borderRadius:'18px', padding: isMobile ? '20px' : '24px',
                  position:'relative' as const
                }}>
                  {plan.popular && (
                    <div style={{
                      position:'absolute' as const, top:'-11px', left:'50%',
                      transform:'translateX(-50%)',
                      background:'#00A8E8', color:'#000',
                      fontSize:'11px', fontWeight:800, padding:'3px 16px',
                      borderRadius:'100px', whiteSpace:'nowrap' as const, letterSpacing:'.5px'
                    }}>MÁS POPULAR</div>
                  )}

                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'16px' }}>
                    <div>
                      <div style={{ fontSize:'11px', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase' as const, color:'var(--t2)', marginBottom:'6px' }}>
                        {plan.nombre}
                      </div>
                      <div style={{ fontFamily:"'Cabinet Grotesk',sans-serif", fontSize: isMobile ? '32px' : '36px', fontWeight:900, letterSpacing:'-1px', lineHeight:1, color:plan.color }}>
                        ${plan.precio}
                      </div>
                      <div style={{ fontSize:'12px', color:'var(--t3)', marginTop:'4px' }}>USD · único pago</div>
                    </div>
                    <div style={{ textAlign:'right' as const }}>
                      <div style={{ fontFamily:"'Cabinet Grotesk',sans-serif", fontSize:'20px', fontWeight:800, color:plan.color }}>
                        {plan.horas}
                      </div>
                      <div style={{ fontSize:'11px', color:'var(--t3)' }}>de video</div>
                    </div>
                  </div>

                  <div style={{ borderTop:'1px solid var(--b)', paddingTop:'14px', marginBottom:'16px' }}>
                    {plan.features.map((f, i) => (
                      <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:'8px', fontSize:'13px', color:'var(--t2)', marginBottom:'7px' }}>
                        <span style={{ color:'var(--ok)', fontWeight:700, fontSize:'11px', flexShrink:0, marginTop:'1px' }}>✓</span>
                        {f}
                      </div>
                    ))}
                  </div>

                  <a href={buildCheckoutUrl(plan.product_id)} target="_blank" rel="noopener noreferrer"
                    style={{
                      display:'block', textAlign:'center', padding:'13px',
                      borderRadius:'10px', fontWeight:700, fontSize:'14px',
                      textDecoration:'none', transition:'all .2s',
                      background: plan.popular ? '#00A8E8' : 'transparent',
                      color: plan.popular ? '#000' : 'var(--t1)',
                      border: plan.popular ? 'none' : '1px solid var(--b)'
                    }}>
                    {plan.popular ? 'Obtener Professional →' : 'Comenzar →'}
                  </a>
                </div>
              ))}
            </div>

            {/* Plan Free */}
            <div style={{
              background:'var(--s1)', border:'1px solid var(--b)', borderRadius:'14px',
              padding: isMobile ? '16px' : '20px 24px',
              display:'flex', alignItems:'center', justifyContent:'space-between',
              flexWrap:'wrap' as const, gap:'12px'
            }}>
              <div>
                <div style={{ fontFamily:"'Cabinet Grotesk',sans-serif", fontSize:'17px', fontWeight:700, marginBottom:'4px' }}>
                  Plan Free
                </div>
                <div style={{ fontSize:'13px', color:'var(--t2)' }}>
                  40 minutos gratis incluidos con tu cuenta. Sin tarjeta requerida.
                </div>
              </div>
              <div style={{ fontFamily:"'Cabinet Grotesk',sans-serif", fontSize:'28px', fontWeight:900, color:'var(--ok)' }}>
                $0
              </div>
            </div>

            {/* Nota facturación */}
            <div style={{
              marginTop:'20px', background:'rgba(0,168,232,.04)',
              border:'1px solid rgba(0,168,232,.12)', borderRadius:'12px',
              padding:'14px 18px', fontSize:'13px', color:'var(--t2)', lineHeight:1.6
            }}>
              <strong style={{ color:'var(--t1)' }}>Facturación:</strong> Los pagos se procesan de forma segura. Se emite comprobante oficial con los datos de facturación registrados. Los créditos se acreditan de inmediato tras la confirmación del pago.
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}
