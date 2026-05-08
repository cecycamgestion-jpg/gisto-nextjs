'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'

export default function Upload() {
  const [tab, setTab] = useState<'link' | 'file'>('link')
  const [url, setUrl] = useState('')
  const [email, setEmail] = useState('')
  const [nombre, setNombre] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [progreso, setProgreso] = useState(0)
  const [estado, setEstado] = useState<'idle' | 'uploading' | 'saving' | 'done' | 'error'>('idle')
  const [mensaje, setMensaje] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const RAILWAY_URL = process.env.NEXT_PUBLIC_RAILWAY_URL
  const AIRTABLE_KEY = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY
  const AIRTABLE_BASE = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID

  async function subirArchivoS3(file: File): Promise<string> {
    const res = await fetch(`${RAILWAY_URL}/get-upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: file.name })
    })
    if (!res.ok) throw new Error('No se pudo obtener URL de subida')
    const { upload_url, public_url } = await res.json()

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) setProgreso(Math.round((e.loaded / e.total) * 100))
      })
      xhr.addEventListener('load', () => xhr.status === 200 ? resolve() : reject(new Error(`Error S3: ${xhr.status}`)))
      xhr.addEventListener('error', () => reject(new Error('Error de red')))
      xhr.timeout = 300000
      xhr.open('PUT', upload_url)
      xhr.send(file)
    })

    return public_url
  }

  async function guardarEnAirtable(videoUrl: string) {
    const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/Videos`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          URL: videoUrl,
          VideoID: nombre || `Video-${Date.now()}`,
          Estado: 'Pendiente'
        }
      })
    })
    if (!res.ok) throw new Error('Error guardando en Airtable')
  }

  async function handleSubmit() {
    if (!email || !email.includes('@')) {
      setMensaje('Por favor ingresa tu email')
      setEstado('error')
      return
    }

    setEstado('uploading')
    setMensaje('')

    try {
      let videoUrl = ''

      if (tab === 'link') {
        if (!url.startsWith('http')) {
          setMensaje('Ingresa un link válido')
          setEstado('error')
          return
        }
        videoUrl = url
      } else {
        if (!archivo) {
          setMensaje('Selecciona un archivo')
          setEstado('error')
          return
        }
        setMensaje('Subiendo archivo...')
        videoUrl = await subirArchivoS3(archivo)
      }

      setEstado('saving')
      setMensaje('Registrando en el sistema...')
      await guardarEnAirtable(videoUrl)

      setEstado('done')
      setMensaje('¡Listo! Tu video está en cola. Te avisaremos cuando el curso esté listo.')
      setUrl('')
      setNombre('')
      setArchivo(null)
      setProgreso(0)

    } catch (err: any) {
      setEstado('error')
      setMensaje(err.message || 'Error inesperado')
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', position: 'relative', zIndex: 1 }}>

      {/* SIDEBAR */}
      <aside style={{
        width: '260px', background: 'var(--s1)', borderRight: '1px solid var(--b)',
        padding: '20px 16px', display: 'flex', flexDirection: 'column', flexShrink: 0
      }}>
        <Link href="/" style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          textDecoration: 'none', padding: '4px 8px', marginBottom: '36px'
        }}>
          <img src="/isotipo.png" alt="GISTO" style={{ height: '34px' }} />
          <span style={{ fontFamily: "'Cabinet Grotesk',sans-serif", fontWeight: 900, fontSize: '18px', color: 'var(--t1)' }}>
            THE <span style={{ color: 'var(--c)' }}>GISTO</span>
          </span>
        </Link>

        {[
          { href: '/dashboard', label: 'Dashboard', icon: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z', active: false },
          { href: '/upload', label: 'Subir video', icon: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12', active: true },
        ].map(item => (
          <Link key={item.href} href={item.href} style={{
            display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
            color: item.active ? 'var(--t1)' : 'var(--t2)', textDecoration: 'none',
            borderRadius: '9px', marginBottom: '2px', fontSize: '14px', fontWeight: 500,
            background: item.active ? 'rgba(0,168,232,0.08)' : 'transparent',
            border: item.active ? '1px solid var(--b)' : '1px solid transparent'
          }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
              stroke={item.active ? 'var(--c)' : 'var(--t3)'}
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d={item.icon}/>
            </svg>
            {item.label}
          </Link>
        ))}

        <Link href="/dashboard" style={{
          display: 'flex', alignItems: 'center', gap: '8px', marginTop: 'auto',
          color: 'var(--t2)', textDecoration: 'none', fontSize: '13px', padding: '10px 12px'
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Volver al dashboard
        </Link>
      </aside>

      {/* MAIN */}
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <div style={{ width: '100%', maxWidth: '540px', position: 'relative', zIndex: 1 }}>

          {/* HEADER */}
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'rgba(0,168,232,0.08)', border: '1px solid var(--b)',
              padding: '5px 14px', borderRadius: '100px', fontSize: '11px',
              fontWeight: 600, color: 'var(--c)', letterSpacing: '1.5px',
              textTransform: 'uppercase', marginBottom: '20px'
            }}>
              <span style={{ width: '5px', height: '5px', background: 'var(--ok)', borderRadius: '50%' }}/>
              Nuevo procesamiento
            </div>
            <h1 style={{
              fontFamily: "'Cabinet Grotesk', sans-serif",
              fontSize: '32px', fontWeight: 900, letterSpacing: '-1px', marginBottom: '8px'
            }}>Sube tu video</h1>
            <p style={{ fontSize: '15px', color: 'var(--t2)' }}>
              GISTO lo convierte en un curso completo automáticamente
            </p>
          </div>

          {/* CARD */}
          <div style={{
            background: 'var(--s1)', border: '1px solid var(--b)',
            borderRadius: '16px', padding: '28px', position: 'relative', overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
              background: 'linear-gradient(90deg, var(--c), var(--c2))'
            }}/>

            {/* TABS */}
            <div style={{
              display: 'flex', gap: '4px', background: 'var(--s2)',
              padding: '3px', borderRadius: '10px', marginBottom: '24px'
            }}>
              {(['link', 'file'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                  cursor: 'pointer', fontSize: '14px', fontWeight: 500, transition: '0.2s',
                  background: tab === t ? 'var(--c)' : 'transparent',
                  color: tab === t ? '#000' : 'var(--t2)'
                }}>
                  {t === 'link' ? '🔗 Pegar link' : '📁 Subir archivo'}
                </button>
              ))}
            </div>

            {/* LINK TAB */}
            {tab === 'link' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t2)', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                  Link del video
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://drive.google.com/... o https://dropbox.com/..."
                  style={{
                    width: '100%', background: 'var(--s2)', border: '1px solid var(--b)',
                    borderRadius: '10px', padding: '13px 16px', color: 'var(--t1)',
                    fontSize: '14px', outline: 'none', fontFamily: 'inherit'
                  }}
                />
              </div>
            )}

            {/* FILE TAB */}
            {tab === 'file' && (
              <div style={{ marginBottom: '16px' }}>
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{
                    border: '1.5px dashed rgba(0,168,232,0.25)', borderRadius: '12px',
                    padding: '32px', textAlign: 'center', cursor: 'pointer',
                    background: 'rgba(0,168,232,0.02)', transition: '0.3s'
                  }}
                >
                  <div style={{
                    width: '44px', height: '44px', background: 'rgba(0,168,232,0.1)',
                    borderRadius: '10px', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', margin: '0 auto 12px'
                  }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--c)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                    </svg>
                  </div>
                  <p style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
                    {archivo ? archivo.name : 'Click para seleccionar video'}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--t2)' }}>MP4, MOV, AVI · Máx 2GB</p>
                </div>
                <input ref={fileRef} type="file" accept="video/*" style={{ display: 'none' }}
                  onChange={e => setArchivo(e.target.files?.[0] || null)} />

                {estado === 'uploading' && archivo && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--t2)', marginBottom: '6px' }}>
                      <span>Subiendo...</span>
                      <span style={{ color: 'var(--c)', fontWeight: 700 }}>{progreso}%</span>
                    </div>
                    <div style={{ height: '4px', background: 'rgba(0,168,232,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${progreso}%`,
                        background: 'linear-gradient(90deg, var(--c), var(--c2))',
                        borderRadius: '2px', transition: 'width 0.3s'
                      }}/>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* FIELDS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t2)', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                  Tu email *
                </label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  style={{
                    width: '100%', background: 'var(--s2)', border: '1px solid var(--b)',
                    borderRadius: '10px', padding: '12px 14px', color: 'var(--t1)',
                    fontSize: '13px', outline: 'none', fontFamily: 'inherit'
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--t2)', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                  Nombre del curso
                </label>
                <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                  placeholder="Ej: Excel Avanzado"
                  style={{
                    width: '100%', background: 'var(--s2)', border: '1px solid var(--b)',
                    borderRadius: '10px', padding: '12px 14px', color: 'var(--t1)',
                    fontSize: '13px', outline: 'none', fontFamily: 'inherit'
                  }}
                />
              </div>
            </div>

            {/* ALERT */}
            {mensaje && (
              <div style={{
                padding: '12px 16px', borderRadius: '10px', fontSize: '13px',
                marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px',
                background: estado === 'done' ? 'rgba(0,229,160,0.08)' : estado === 'error' ? 'rgba(255,70,100,0.08)' : 'rgba(0,168,232,0.08)',
                border: `1px solid ${estado === 'done' ? 'rgba(0,229,160,0.2)' : estado === 'error' ? 'rgba(255,70,100,0.2)' : 'var(--b)'}`,
                color: estado === 'done' ? 'var(--ok)' : estado === 'error' ? 'var(--err)' : 'var(--c)'
              }}>
                {estado === 'done' ? '✅' : estado === 'error' ? '⚠️' : '⏳'} {mensaje}
              </div>
            )}

            {/* BUTTON */}
            <button
              onClick={handleSubmit}
              disabled={estado === 'uploading' || estado === 'saving'}
              style={{
                width: '100%', padding: '15px', background: 'var(--c)', color: '#000',
                border: 'none', borderRadius: '10px', fontFamily: "'Cabinet Grotesk', sans-serif",
                fontSize: '15px', fontWeight: 800, cursor: 'pointer', transition: '0.2s',
                opacity: (estado === 'uploading' || estado === 'saving') ? 0.6 : 1
              }}
            >
              {estado === 'uploading' ? 'Subiendo...' :
               estado === 'saving' ? 'Guardando...' :
               estado === 'done' ? '✓ Enviado — Subir otro' :
               '⚡ Procesar video ahora'}
            </button>

            <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--t3)', marginTop: '12px' }}>
              Aceptamos links de Google Drive, Dropbox y archivos hasta 2GB
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
