'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'

// ⚠️ IMPORTANTE: reemplazar los product_id con los IDs reales de LemonSqueezy
// cuando crees los 4 productos en USD.
// Para obtener el ID: LemonSqueezy → Products → click producto → URL: app.lemonsqueezy.com/products/{ID}
const PLANES = [
  {
    id: 'basico',
    nombre: 'Básico',
    precio: 25,
    creditos: 120,        // 2h × 60min
    horas: '2 horas',
    pph: '$12.5/hora',
    features: [
      'Cápsulas pedagógicas por concepto',
      'Bibliografía APA detectada con DOI',
      'Word con glosario, quiz (5 preg.) e índice',
      'ZIP listo para LMS',
      'Comprobante de pago',
      'Créditos sin vencimiento'
    ],
    product_id: 'https://thegisto.lemonsqueezy.com/checkout/buy/393a7d12-24d7-4c3d-9d60-400143b384b3',
    popular: false,
    color: 'var(--t2)'
  },
  {
    id: 'estandar',
    nombre: 'Estándar',
    precio: 119,
    creditos: 720,        // 12h × 60min
    horas: '12 horas',
    pph: '$9.9/hora',
    features: [
      'Todo lo de Básico, más:',
      'Quiz ampliado (8 preguntas Bloom)',
      'Reporte de calidad del procesamiento',
      'Soporte por email',
      'Un diplomado completo de 10–12h'
    ],
    product_id: 'https://thegisto.lemonsqueezy.com/checkout/buy/3368ed41-079d-4a62-8818-e18c4f72d6c6',
    popular: false,
    color: 'var(--t2)'
  },
  {
    id: 'premium',
    nombre: 'Premium',
    precio: 209,
    creditos: 1500,       // 25h × 60min
    horas: '25 horas',
    pph: '$8.4/hora',
    features: [
      'Todo lo de Estándar, más:',
      'Quiz completo (15 preguntas Bloom)',
      'Subtítulos SRT por cápsula',
      'Ficha de aprendizaje por cápsula',
      'Intro 3s + thumbnails por cápsula',
      'Plantilla Word a elegir (6 estilos)',
      '2 cursos completos o programa de 20h'
    ],
    product_id: 'https://thegisto.lemonsqueezy.com/checkout/buy/0c0dfc86-589e-43d6-adae-b490947910de',
    popular: true,
    color: '#00A8E8'
  },
  {
    id: 'empresarial',
    nombre: 'Empresarial',
    precio: 399,
    creditos: 3600,       // 60h × 60min
    horas: '60 horas',
    pph: '$6.7/hora',
    features: [
      'Todo lo de Premium, más:',
      'Quiz Bloom integrador (25 preguntas)',
      'PPT ejecutiva del módulo',
      'Resumen de marketing del curso',
      'Soporte prioritario',
      'Año académico o programa institucional'
    ],
    product_id: 'https://thegisto.lemonsqueezy.com/checkout/buy/f2c215a6-4507-48f6-af6a-2a183d60279d',
    popular: false,
    color: '#FFB020'
  }
]

const NAV_ITEMS = [
  { href:'/dashboard', label:'Dashboard', icon:'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z' },
  { href:'/upload',    label:'Subir video', icon:'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12' },
  { href:'/perfil',    label:'Mi perfil', icon:'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' },
  { href:'/planes',    label:'Planes y pagos', icon:'M1 4h22v16H1zM1 10h22', active: true },
]

// Función helper para mostrar créditos en formato "Xh Ymin"
function formatHorasMin(minutos: number): string {
  if (minutos === 0) return '0 min'
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

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
            {formatHorasMin(user.creditos||0)}
          </div>
          <div style={{ fontSize:'10px', color:'var(--t3)', marginTop:'2px' }}>Plan: {user.plan||'Demo'}</div>
        </div>
      )}
    </aside>
  )

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', position:'relative' as const, zIndex:1 }}>
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position:'fixed' as const, inset:0, background:'rgba(0,0,0,.6)', zIndex:99 }}/>
      )}

      <Sidebar />

      <main style={{ flex:1, overflow:'auto', display:'flex', flexDirection:'column' as const }}>
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
                {formatHorasMin(user.creditos||0)}
              </span>
            )}
          </div>
        )}

        <div style={{ padding: isMobile ? '20px 16px' : '32px 40px', flex:1 }}>
          <div style={{ maxWidth:'1100px', margin:'0 auto' }}>

            <div style={{ textAlign:'center', marginBottom: isMobile ? '24px' : '36px' }}>
              <h1 style={{
                fontFamily:"'Cabinet Grotesk',sans-serif",
                fontSize: isMobile ? '24px' : '32px',
                fontWeight:900, letterSpacing:'-1.5px', marginBottom:'8px'
              }}>Planes y Créditos</h1>
              <p style={{ fontSize: isMobile ? '13px' : '15px', color:'var(--t2)', lineHeight:1.5 }}>
                Paga por horas de video. Sin suscripción. Los créditos no vencen.
              </p>
            </div>

            {/* 4 planes en grid */}
            <div style={{
              display:'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(4,1fr)',
              gap: isMobile ? '12px' : '14px',
              marginBottom: isMobile ? '16px' : '20px'
            }}>
              {PLANES.map(plan => (
                <div key={plan.id} style={{
                  background: plan.popular ? 'linear-gradient(160deg,rgba(0,168,232,.09),#0C1018)' : '#0C1018',
                  border: `1px solid ${plan.popular ? '#00A8E8' : 'var(--b)'}`,
                  borderRadius:'18px',
                  padding: isMobile ? '20px' : '22px',
                  position:'relative' as const,
                  display:'flex', flexDirection:'column' as const
                }}>
                  {plan.popular && (
                    <div style={{
                      position:'absolute' as const, top:'-11px', left:'50%',
                      transform:'translateX(-50%)',
                      background:'#00A8E8', color:'#000',
                      fontSize:'10px', fontWeight:800, padding:'3px 14px',
                      borderRadius:'100px', whiteSpace:'nowrap' as const, letterSpacing:'.5px'
                    }}>MÁS POPULAR</div>
                  )}

                  <div style={{ marginBottom:'14px' }}>
                    <div style={{ fontSize:'11px', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase' as const, color:'var(--t2)', marginBottom:'8px' }}>
                      {plan.nombre}
                    </div>
                    <div style={{ display:'flex', alignItems:'baseline', gap:'4px', marginBottom:'4px' }}>
                      <span style={{ fontFamily:"'Cabinet Grotesk',sans-serif", fontSize:'16px', fontWeight:700, color:'var(--t2)' }}>$</span>
                      <span style={{ fontFamily:"'Cabinet Grotesk',sans-serif", fontSize: isMobile ? '32px' : '38px', fontWeight:900, letterSpacing:'-1px', lineHeight:1, color:plan.color }}>
                        {plan.precio}
                      </span>
                    </div>
                    <div style={{ fontSize:'11px', color:'var(--t3)' }}>pago único · sin suscripción</div>
                  </div>

                  <div style={{
                    display:'inline-flex', alignItems:'center', gap:'6px',
                    background:'rgba(0,168,232,.06)', border:'1px solid var(--b)',
                    borderRadius:'7px', padding:'5px 10px', marginBottom:'6px',
                    width:'fit-content'
                  }}>
                    <span style={{ width:'5px', height:'5px', borderRadius:'50%', background:plan.color }}/>
                    <span style={{ fontSize:'12px', fontWeight:700, color:'var(--t1)' }}>{plan.horas}</span>
                  </div>
                  <div style={{ fontSize:'10px', color:'var(--t3)', fontFamily:'monospace', marginBottom:'16px' }}>
                    {plan.pph}
                  </div>

                  <div style={{ borderTop:'1px solid rgba(240,246,252,.06)', paddingTop:'14px', marginBottom:'16px', flexGrow:1 }}>
                    {plan.features.map((f, i) => (
                      <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:'8px', fontSize:'12px', color:'var(--t2)', marginBottom:'7px', lineHeight:1.45 }}>
                        <span style={{
                          width:'14px', height:'14px', borderRadius:'4px',
                          background:'rgba(0,229,160,.09)',
                          border:'1px solid rgba(0,229,160,.2)',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          flexShrink:0, marginTop:'1px'
                        }}>
                          <svg width="7" height="7" viewBox="0 0 10 8" fill="none" stroke="var(--ok)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="1,4 4,7 9,1"/>
                          </svg>
                        </span>
                        {f}
                      </div>
                    ))}
                  </div>

                  <a href={buildCheckoutUrl(plan.product_id)} target="_blank" rel="noopener noreferrer"
                    style={{
                      display:'block', textAlign:'center', padding:'12px',
                      borderRadius:'10px', fontWeight:700, fontSize:'13px',
                      textDecoration:'none', transition:'all .2s',
                      background: plan.popular ? '#00A8E8' : 'transparent',
                      color: plan.popular ? '#000' : 'var(--t1)',
                      border: plan.popular ? 'none' : '1px solid var(--b)'
                    }}>
                    Comenzar →
                  </a>
                </div>
              ))}
            </div>

            {/* Plan Demo */}
            <div style={{
              background:'var(--s1)', border:'1px solid var(--b)', borderRadius:'14px',
              padding: isMobile ? '16px' : '20px 24px',
              display:'flex', alignItems:'center', justifyContent:'space-between',
              flexWrap:'wrap' as const, gap:'12px'
            }}>
              <div>
                <div style={{ fontFamily:"'Cabinet Grotesk',sans-serif", fontSize:'17px', fontWeight:700, marginBottom:'4px' }}>
                  Plan Demo
                </div>
                <div style={{ fontSize:'13px', color:'var(--t2)' }}>
                  30 minutos gratis incluidos con tu cuenta. Sin tarjeta requerida.
                </div>
              </div>
              <div style={{ fontFamily:"'Cabinet Grotesk',sans-serif", fontSize:'28px', fontWeight:900, color:'var(--ok)' }}>
                Gratis
              </div>
            </div>

            <div style={{
              marginTop:'20px', background:'rgba(0,168,232,.04)',
              border:'1px solid rgba(0,168,232,.12)', borderRadius:'12px',
              padding:'14px 18px', fontSize:'13px', color:'var(--t2)', lineHeight:1.6
            }}>
              <strong style={{ color:'var(--t1)' }}>Facturación:</strong> Los pagos se procesan de forma segura. Recibirás factura o boleta electrónica según corresponda. Los créditos se acreditan de inmediato tras la confirmación del pago.
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}
