'use client'

import { useState } from 'react'
import Link from 'next/link'

const videos = [
  {
    id: 1,
    nombre: 'Deterioro de Activos — Sector Público',
    duracion: '18m 35s',
    modulos: 2,
    estado: 'completado',
    fecha: 'Hoy',
    zip_url: '#'
  },
  {
    id: 2,
    nombre: 'Taller Ofimática CECYCAM — Excel Avanzado',
    duracion: '54m 12s',
    modulos: 4,
    estado: 'procesando',
    fecha: 'Hace 5 min',
    zip_url: null
  },
  {
    id: 3,
    nombre: 'Legislación Laboral 2026 — Parte 1',
    duracion: '42m 08s',
    modulos: 3,
    estado: 'completado',
    fecha: 'Ayer',
    zip_url: '#'
  }
]

export default function Dashboard() {
  const [filtro, setFiltro] = useState('todos')

  const videosFiltrados = videos.filter(v => {
    if (filtro === 'completados') return v.estado === 'completado'
    if (filtro === 'proceso') return v.estado === 'procesando'
    return true
  })

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', position: 'relative', zIndex: 1 }}>

      {/* SIDEBAR */}
      <aside style={{
        width: '260px',
        background: 'var(--s1)',
        borderRight: '1px solid var(--b)',
        padding: '20px 16px',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        zIndex: 10
      }}>
        {/* LOGO */}
        <Link href="/" style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          textDecoration: 'none', padding: '4px 8px', marginBottom: '36px'
        }}>
          <img src="/isotipo.png" alt="GISTO" style={{ height: '34px', width: 'auto' }} />
          <span style={{
            fontFamily: "'Cabinet Grotesk', sans-serif",
            fontWeight: 900, fontSize: '18px', color: 'var(--t1)'
          }}>
            THE <span style={{ color: 'var(--c)' }}>GISTO</span>
          </span>
        </Link>

        {/* NAV */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            fontSize: '10px', fontWeight: 700, letterSpacing: '2px',
            textTransform: 'uppercase', color: 'var(--t3)',
            padding: '0 12px', marginBottom: '6px'
          }}>Principal</div>

          {[
            { href: '/dashboard', label: 'Dashboard', active: true, icon: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z' },
            { href: '/mis-cursos', label: 'Mis videos', active: false, icon: 'M23 7l-7 5 7 5V7zM1 5h15a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H1z' },
            { href: '/upload', label: 'Subir video', active: false, icon: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12' },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 12px', color: item.active ? 'var(--t1)' : 'var(--t2)',
              textDecoration: 'none', borderRadius: '9px', marginBottom: '2px',
              fontSize: '14px', fontWeight: 500,
              background: item.active ? 'rgba(0,168,232,0.08)' : 'transparent',
              border: item.active ? '1px solid var(--b)' : '1px solid transparent',
              transition: '0.2s'
            }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                stroke={item.active ? 'var(--c)' : 'var(--t3)'}
                strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon}/>
              </svg>
              {item.label}
            </Link>
          ))}
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div style={{
            fontSize: '10px', fontWeight: 700, letterSpacing: '2px',
            textTransform: 'uppercase', color: 'var(--t3)',
            padding: '0 12px', marginBottom: '6px'
          }}>Cuenta</div>

          {[
            { href: '/perfil', label: 'Mi perfil', icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' },
            { href: '/planes', label: 'Planes y pagos', icon: 'M1 4h22v16H1zM1 10h22' },
            { href: '/soporte', label: 'Soporte', icon: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01' },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 12px', color: 'var(--t2)',
              textDecoration: 'none', borderRadius: '9px', marginBottom: '2px',
              fontSize: '14px', fontWeight: 500, border: '1px solid transparent',
              transition: '0.2s'
            }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                stroke="var(--t3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon}/>
              </svg>
              {item.label}
            </Link>
          ))}
        </div>

        {/* CREDITS */}
        <div style={{
          marginTop: 'auto',
          background: 'rgba(0,168,232,0.06)',
          border: '1px solid var(--b)',
          borderRadius: '12px', padding: '14px'
        }}>
          <div style={{ fontSize: '11px', color: 'var(--t2)', marginBottom: '6px' }}>
            Créditos disponibles
          </div>
          <div style={{
            height: '5px', background: 'rgba(0,168,232,0.12)',
            borderRadius: '3px', overflow: 'hidden', marginBottom: '6px'
          }}>
            <div style={{
              height: '100%', width: '70%',
              background: 'linear-gradient(90deg, var(--c), var(--c2))',
              borderRadius: '3px'
            }}/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--t2)' }}>
            <strong style={{ color: 'var(--c)' }}>14 min</strong>
            <span>/ 20 min</span>
          </div>
        </div>

        {/* USER */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '14px 12px 0', borderTop: '1px solid var(--b)', marginTop: '12px'
        }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--c), var(--c2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Cabinet Grotesk', sans-serif", fontWeight: 800,
            fontSize: '13px', color: '#000', flexShrink: 0
          }}>A</div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700 }}>Alejandro</div>
            <div style={{ fontSize: '11px', color: 'var(--t2)' }}>Plan Gratuito</div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* TOPBAR */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 28px', borderBottom: '1px solid var(--b)',
          background: 'rgba(6,8,16,0.7)', backdropFilter: 'blur(12px)',
          position: 'sticky', top: 0, zIndex: 50, flexShrink: 0
        }}>
          <div>
            <h1 style={{
              fontFamily: "'Cabinet Grotesk', sans-serif",
              fontSize: '20px', fontWeight: 800, letterSpacing: '-0.5px'
            }}>Dashboard</h1>
            <p style={{ fontSize: '12px', color: 'var(--t2)', marginTop: '1px' }}>
              Bienvenido de vuelta, Alejandro
            </p>
          </div>
          <Link href="/upload" style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'var(--c)', color: '#000', padding: '9px 16px',
            borderRadius: '8px', fontWeight: 700, fontSize: '13px',
            textDecoration: 'none', transition: '0.2s'
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nuevo video
          </Link>
        </div>

        {/* CONTENT */}
        <div style={{ padding: '24px 28px', flex: 1 }}>

          {/* STATS */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '14px', marginBottom: '24px'
          }}>
            {[
              { label: 'Créditos disponibles', val: '14 min', badge: 'Freemium', badgeColor: 'var(--warn)', icon: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2' },
              { label: 'Videos procesados', val: '3', badge: 'Total', badgeColor: 'var(--ok)', icon: 'M23 7l-7 5 7 5V7zM1 5h15a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H1z' },
              { label: 'Módulos generados', val: '9', badge: '+2 hoy', badgeColor: 'var(--ok)', icon: 'M22 12h-4l-3 9L9 3l-3 9H2' },
              { label: 'ZIPs descargados', val: '2', badge: 'Activo', badgeColor: 'var(--ok)', icon: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3' },
            ].map((stat, i) => (
              <div key={i} style={{
                background: 'var(--s1)', border: '1px solid var(--b)',
                borderRadius: '14px', padding: '18px', transition: '0.2s'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{
                    width: '32px', height: '32px', background: 'rgba(0,168,232,0.1)',
                    borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="var(--c)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d={stat.icon}/>
                    </svg>
                  </div>
                  <span style={{
                    fontSize: '10px', fontWeight: 700, padding: '2px 8px',
                    borderRadius: '100px', color: stat.badgeColor,
                    background: `${stat.badgeColor}15`, border: `1px solid ${stat.badgeColor}30`
                  }}>{stat.badge}</span>
                </div>
                <div style={{
                  fontFamily: "'Cabinet Grotesk', sans-serif",
                  fontSize: '28px', fontWeight: 900, lineHeight: 1, marginBottom: '3px'
                }}>{stat.val}</div>
                <div style={{ fontSize: '11px', color: 'var(--t2)' }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* UPLOAD ZONE */}
          <Link href="/upload" style={{
            display: 'block', textDecoration: 'none',
            background: 'rgba(0,168,232,0.03)', border: '1.5px dashed rgba(0,168,232,0.2)',
            borderRadius: '14px', padding: '24px', marginBottom: '24px', transition: '0.3s'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{
                width: '52px', height: '52px', background: 'rgba(0,168,232,0.1)',
                borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--c)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{
                  fontFamily: "'Cabinet Grotesk', sans-serif",
                  fontSize: '16px', fontWeight: 700, marginBottom: '3px'
                }}>Procesar nuevo video</h3>
                <p style={{ fontSize: '12px', color: 'var(--t2)' }}>
                  Arrastra un archivo, pega link de Drive o Dropbox
                </p>
              </div>
              <span style={{
                background: 'var(--c)', color: '#000', padding: '9px 20px',
                borderRadius: '8px', fontSize: '13px', fontWeight: 700
              }}>Subir ahora →</span>
            </div>
          </Link>

          {/* LIST */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div>
              <div style={{
                fontFamily: "'Cabinet Grotesk', sans-serif",
                fontSize: '16px', fontWeight: 700
              }}>Procesos recientes</div>
              <div style={{ fontSize: '12px', color: 'var(--t3)' }}>
                {videos.length} videos procesados
              </div>
            </div>
            <div style={{
              display: 'flex', gap: '4px', background: 'var(--s1)',
              border: '1px solid var(--b)', padding: '3px', borderRadius: '8px'
            }}>
              {['todos', 'completados', 'proceso'].map(f => (
                <button key={f} onClick={() => setFiltro(f)} style={{
                  padding: '5px 12px', borderRadius: '6px', fontSize: '12px',
                  fontWeight: 600, cursor: 'pointer', border: 'none', transition: '0.2s',
                  background: filtro === f ? 'var(--c)' : 'transparent',
                  color: filtro === f ? '#000' : 'var(--t2)'
                }}>
                  {f === 'todos' ? 'Todos' : f === 'completados' ? 'Completados' : 'En proceso'}
                </button>
              ))}
            </div>
          </div>

          {videosFiltrados.map(video => (
            <div key={video.id} style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '14px 16px', background: 'var(--s1)',
              border: '1px solid var(--b)', borderRadius: '12px',
              marginBottom: '8px', transition: '0.2s'
            }}>
              <div style={{
                width: '52px', height: '38px',
                background: video.estado === 'completado' ? 'rgba(0,229,160,0.06)' : 'var(--s2)',
                border: `1px solid ${video.estado === 'completado' ? 'rgba(0,229,160,0.15)' : 'var(--b)'}`,
                borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke={video.estado === 'completado' ? 'var(--ok)' : 'var(--t3)'}
                  strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                </svg>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '14px', fontWeight: 600,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '3px'
                }}>{video.nombre}</div>
                <div style={{ fontSize: '11px', color: 'var(--t2)', display: 'flex', gap: '8px' }}>
                  <span>{video.duracion}</span>
                  <span>·</span>
                  <span>{video.modulos} módulos</span>
                  <span>·</span>
                  <span>{video.fecha}</span>
                </div>
              </div>

              {video.estado === 'procesando' && (
                <div style={{ width: '160px', flexShrink: 0 }}>
                  <div style={{ fontSize: '10px', color: 'var(--warn)', fontWeight: 700, marginBottom: '4px', textAlign: 'right' }}>
                    Procesando...
                  </div>
                  <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: '60%',
                      background: 'linear-gradient(90deg, var(--c), var(--c2), var(--ok))',
                      backgroundSize: '200%', borderRadius: '2px',
                      animation: 'shimmer 2s linear infinite'
                    }}/>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <span style={{
                  padding: '4px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 700,
                  background: video.estado === 'completado' ? 'rgba(0,229,160,0.08)' : 'rgba(255,176,32,0.08)',
                  color: video.estado === 'completado' ? 'var(--ok)' : 'var(--warn)',
                  border: `1px solid ${video.estado === 'completado' ? 'rgba(0,229,160,0.2)' : 'rgba(255,176,32,0.2)'}`
                }}>
                  {video.estado === 'completado' ? 'Completado' : 'Procesando'}
                </span>

                {video.estado === 'completado' && video.zip_url && (
                  <a href={video.zip_url} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '5px',
                    background: 'transparent', border: '1px solid var(--b)',
                    color: 'var(--t2)', padding: '6px 12px', borderRadius: '7px',
                    fontSize: '12px', fontWeight: 600, textDecoration: 'none', transition: '0.2s'
                  }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                    </svg>
                    ZIP
                  </a>
                )}
              </div>
            </div>
          ))}

        </div>
      </main>
    </div>
  )
}
