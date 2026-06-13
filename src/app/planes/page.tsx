'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import {
  PLANS,
  PLANS_ORDER,
  DEMO_PLAN,
  formatHorasMin,
  getProductId,
  isPlanComprable,
  type PlanId
} from '@/lib/plans'

// ─────────────────────────────────────────────────────────────
// /planes — página de precios
//
// Fuente única: lib/plans.ts. NO duplicar precios aquí.
//
// TODO Bloque B: mover buildCheckoutUrl() a backend (POST /api/checkout/create)
//   - Validar usuario autenticado server-side
//   - Validar product_id contra PLANS (no confiar en frontend)
//   - Firmar metadata custom para que webhook Lemon confíe en user_id
// ─────────────────────────────────────────────────────────────

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
    // Guard contra localStorage corrupto (no debe romper la página)
    try {
      const u = localStorage.getItem('gisto_user')
      if (u) setUser(JSON.parse(u))
    } catch {
      try { localStorage.removeItem('gisto_user') } catch {}
      setUser(null)
    }
  }, [])

  // TEMPORAL — mover a backend en Bloque B
  function buildCheckoutUrl(productId: string) {
    const base = `https://thegisto.lemonsqueezy.com/buy/${productId}`
    if (!user) return base
    const params = new URLSearchParams({
      'checkout[custom][user_id]': user.id || '',
      'checkout[email]': user.email || '',
    })
    return `${base}?${params.toString()}`
  }

  /** Devuelve qué estado tiene el botón de un plan dado. */
  function estadoBoton(planId: PlanId): {
    label: string
    href: string | null
    deshabilitado: boolean
    motivo: string | null
  } {
    if (planId === 'demo') {
      return { label: 'Activo con tu cuenta', href: null, deshabilitado: true, motivo: null }
    }
    if (!isPlanComprable(planId)) {
      return {
        label: 'Pagos próximamente',
        href: null,
        deshabilitado: true,
        motivo: 'Estamos finalizando la activación de pagos.'
      }
    }
    if (!user) {
      return {
        label: 'Iniciar sesión para comprar',
        href: `/login?next=/planes&plan=${planId}`,
        deshabilitado: false,
        motivo: null
      }
    }
    const productId = getProductId(planId)!
    return {
      label: 'Comenzar →',
      href: buildCheckoutUrl(productId),
      deshabilitado: false,
      motivo: null
    }
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
          <div style={{ fontSize:'10px', color:'var(--t3)', marginTop:'2px' }}>Plan: {user.plan||'demo'}</div>
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
                Paga por horas de procesamiento. Sin suscripción. Los créditos no vencen.
              </p>
            </div>

            {/* 4 planes en grid */}
            <div style={{
              display:'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(4,1fr)',
              gap: isMobile ? '12px' : '14px',
              marginBottom: isMobile ? '16px' : '20px'
            }}>
              {PLANS_ORDER.map(id => {
                const plan = PLANS[id]
                const btn = estadoBoton(id)
                return (
                  <div key={plan.id} style={{
                    background: plan.recommended ? 'linear-gradient(160deg,rgba(0,168,232,.09),#0C1018)' : '#0C1018',
                    border: `1px solid ${plan.recommended ? '#00A8E8' : 'var(--b)'}`,
                    borderRadius:'18px',
                    padding: isMobile ? '20px' : '22px',
                    position:'relative' as const,
                    display:'flex', flexDirection:'column' as const
                  }}>
                    {plan.recommended && (
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
                          {plan.precioUSD}
                        </span>
                      </div>
                      <div style={{ fontSize:'11px', color:'var(--t3)' }}>pago único · sin suscripción</div>
                      <div style={{ fontSize:'10px', color:'var(--t3)', marginTop:'2px' }}>+ impuestos aplicables en checkout</div>
                    </div>

                    <div style={{
                      display:'inline-flex', alignItems:'center', gap:'6px',
                      background:'rgba(0,168,232,.06)', border:'1px solid var(--b)',
                      borderRadius:'7px', padding:'5px 10px', marginBottom:'6px',
                      width:'fit-content'
                    }}>
                      <span style={{ width:'5px', height:'5px', borderRadius:'50%', background:plan.color }}/>
                      <span style={{ fontSize:'12px', fontWeight:700, color:'var(--t1)' }}>{plan.horasLabel}</span>
                    </div>
                    <div style={{ fontSize:'10px', color:'var(--t3)', fontFamily:'monospace', marginBottom:'16px' }}>
                      {plan.pphLabel}
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

                    {/* Botón: con href solo si hay product_id real y usuario logueado */}
                    {btn.deshabilitado ? (
                      <div style={{
                        display:'block', textAlign:'center', padding:'12px',
                        borderRadius:'10px', fontWeight:700, fontSize:'13px',
                        background: 'rgba(255,255,255,.04)',
                        color: 'var(--t3)',
                        border: '1px solid var(--b)',
                        cursor: 'not-allowed'
                      }}>
                        {btn.label}
                      </div>
                    ) : (
                      <a
                        href={btn.href!}
                        {...(btn.href!.startsWith('http') ? { target:'_blank', rel:'noopener noreferrer' } : {})}
                        style={{
                          display:'block', textAlign:'center', padding:'12px',
                          borderRadius:'10px', fontWeight:700, fontSize:'13px',
                          textDecoration:'none', transition:'all .2s',
                          background: plan.recommended ? '#00A8E8' : 'transparent',
                          color: plan.recommended ? '#000' : 'var(--t1)',
                          border: plan.recommended ? 'none' : '1px solid var(--b)'
                        }}>
                        {btn.label}
                      </a>
                    )}

                    {btn.motivo && (
                      <div style={{ fontSize:'10px', color:'var(--t3)', textAlign:'center', marginTop:'8px', lineHeight:1.4 }}>
                        {btn.motivo}
                      </div>
                    )}
                  </div>
                )
              })}
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
                  {DEMO_PLAN.minutos} minutos gratis incluidos con tu cuenta. Sin tarjeta requerida.
                </div>
              </div>
              <div style={{ fontFamily:"'Cabinet Grotesk',sans-serif", fontSize:'28px', fontWeight:900, color:'var(--ok)' }}>
                Gratis
              </div>
            </div>

            {/* Microcopy de facturación corregido — USD + Lemon + Nubefact */}
            <div style={{
              marginTop:'20px', background:'rgba(0,168,232,.04)',
              border:'1px solid rgba(0,168,232,.12)', borderRadius:'12px',
              padding:'14px 18px', fontSize:'13px', color:'var(--t2)', lineHeight:1.6
            }}>
              <strong style={{ color:'var(--t1)' }}>Facturación:</strong> Los precios están en USD y no incluyen impuestos. Lemon Squeezy calcula y cobra los impuestos aplicables según el país del comprador. THE GISTO emite comprobante electrónico en USD por el total pagado, con desglose tributario cuando corresponda. Los créditos se acreditan automáticamente tras la confirmación del pago.
            </div>

            {/* Microcopy post-pago */}
            <div style={{
              marginTop:'10px', fontSize:'11px', color:'var(--t3)', textAlign:'center', lineHeight:1.5
            }}>
              Si no ves los créditos reflejados en unos minutos tras pagar, contacta soporte.
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}
