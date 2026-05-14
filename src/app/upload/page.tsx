'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

const RAILWAY_URL = process.env.NEXT_PUBLIC_RAILWAY_URL || ''
const AIRTABLE_API_KEY = process.env.NEXT_PUBLIC_AIRTABLE_API_KEY || ''
const AIRTABLE_BASE_ID = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID || ''

// ─── Detectar MIME type correcto del archivo ───────────────────────────────
function getMimeType(file: File): string {
  if (file.type) return file.type
  const ext = file.name.split('.').pop()?.toLowerCase()
  const map: Record<string, string> = {
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    mkv: 'video/x-matroska',
    webm: 'video/webm',
    wmv: 'video/x-ms-wmv',
    flv: 'video/x-flv',
    m4v: 'video/x-m4v',
  }
  return map[ext || ''] || 'video/mp4'
}

// ─── Guardar registro en Airtable ──────────────────────────────────────────
async function crearRegistroAirtable(videoUrl: string, userEmail: string): Promise<string> {
  const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Videos`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        URL: videoUrl,
        Usuario: userEmail,
        Estado: 'Pendiente',
      },
    }),
  })
  if (!res.ok) throw new Error('Error al guardar en Airtable')
  const data = await res.json()
  return data.id
}

export default function UploadPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [tab, setTab] = useState<'link' | 'file'>('link')
  const [linkUrl, setLinkUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'saving' | 'done' | 'error'>('idle')
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')

  // ── helpers de UI ────────────────────────────────────────────────────────
  const userEmail =
    typeof window !== 'undefined' ? localStorage.getItem('gisto_email') || '' : ''

  const reset = () => {
    setStatus('idle')
    setProgress(0)
    setErrorMsg('')
    setFile(null)
    setLinkUrl('')
  }

  // ── Subir archivo desde PC ───────────────────────────────────────────────
  async function subirArchivo() {
    if (!file) return
    setStatus('uploading')
    setProgress(0)
    setErrorMsg('')

    try {
      const contentType = getMimeType(file)

      // 1. Pedir presigned URL a Railway — incluye content_type para que la firma coincida
      const res = await fetch(`${RAILWAY_URL}/get-upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          content_type: contentType,   // ← clave: Railway incluye esto en la firma
        }),
      })
      if (!res.ok) throw new Error('No se pudo obtener la URL de subida')
      const { upload_url, public_url } = await res.json()

      // 2. PUT directo a S3 con XMLHttpRequest para tener progreso
      //    CRÍTICO: Content-Type debe ser EXACTAMENTE igual al que se firmó
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', upload_url)
        // Solo este header — no agregar Authorization ni ningún otro
        xhr.setRequestHeader('Content-Type', contentType)

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 90))
        }
        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve()
          } else {
            reject(new Error(`S3 respondió ${xhr.status}: ${xhr.responseText}`))
          }
        }
        xhr.onerror = () => reject(new Error('Error de red al subir a S3'))
        xhr.send(file)
      })

      setProgress(95)
      setStatus('saving')

      // 3. Guardar public_url en Airtable → Make/N8N lo detecta y procesa
      await crearRegistroAirtable(public_url, userEmail)

      setProgress(100)
      setStatus('done')
    } catch (err: unknown) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Error desconocido')
    }
  }

  // ── Enviar link externo (Drive/Dropbox) ──────────────────────────────────
  async function enviarLink() {
    if (!linkUrl.trim()) return
    setStatus('saving')
    setErrorMsg('')
    try {
      await crearRegistroAirtable(linkUrl.trim(), userEmail)
      setStatus('done')
    } catch (err: unknown) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Error al guardar link')
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 32px', borderBottom: '1px solid #1a1a2e' }}>
        <img src="https://www.thegisto.com/isotipo.png" alt="GISTO" style={{ height: 48 }} />
        <button
          onClick={() => router.push('/dashboard')}
          style={{ background: 'none', border: '1px solid #333', color: '#aaa', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
        >
          ← Dashboard
        </button>
      </nav>

      {/* Main */}
      <div style={{ maxWidth: 600, margin: '60px auto', padding: '0 24px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: '#fff' }}>Subir video</h1>
        <p style={{ color: '#888', marginBottom: 32, fontSize: 15 }}>
          Pega un link de Drive / Dropbox o sube directamente desde tu PC.
        </p>

        {/* Tabs */}
        {status === 'idle' && (
          <>
            <div style={{ display: 'flex', gap: 0, marginBottom: 24, background: '#111', borderRadius: 10, padding: 4, border: '1px solid #222' }}>
              {(['link', 'file'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    flex: 1, padding: '10px 0', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600,
                    background: tab === t ? 'linear-gradient(135deg, #2563eb, #7c3aed)' : 'transparent',
                    color: tab === t ? '#fff' : '#666',
                    transition: 'all .2s',
                  }}
                >
                  {t === 'link' ? '🔗 Link externo' : '📁 Archivo desde PC'}
                </button>
              ))}
            </div>

            {/* Tab: Link */}
            {tab === 'link' && (
              <div>
                <label style={{ display: 'block', fontSize: 13, color: '#888', marginBottom: 8 }}>
                  Link de Google Drive o Dropbox
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/..."
                  style={{
                    width: '100%', padding: '14px 16px', background: '#111', border: '1px solid #2a2a3e',
                    borderRadius: 10, color: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box',
                  }}
                />
                <p style={{ fontSize: 12, color: '#555', marginTop: 8 }}>
                  El link debe ser público o con permiso "cualquiera con el enlace puede ver".
                </p>
                <button
                  onClick={enviarLink}
                  disabled={!linkUrl.trim()}
                  style={{
                    width: '100%', marginTop: 20, padding: '14px', borderRadius: 10, border: 'none',
                    background: linkUrl.trim() ? 'linear-gradient(135deg, #2563eb, #7c3aed)' : '#222',
                    color: linkUrl.trim() ? '#fff' : '#555', fontSize: 16, fontWeight: 700, cursor: linkUrl.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  Procesar video →
                </button>
              </div>
            )}

            {/* Tab: File */}
            {tab === 'file' && (
              <div>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(f) }}
                  style={{
                    border: `2px dashed ${file ? '#2563eb' : '#2a2a3e'}`,
                    borderRadius: 12, padding: '40px 20px', textAlign: 'center', cursor: 'pointer',
                    background: file ? '#0d1a2e' : '#0d0d0d', transition: 'all .2s',
                  }}
                >
                  <div style={{ fontSize: 36, marginBottom: 12 }}>{file ? '✅' : '☁️'}</div>
                  {file ? (
                    <>
                      <div style={{ fontSize: 15, fontWeight: 600, color: '#60a5fa' }}>{file.name}</div>
                      <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>
                        {(file.size / 1024 / 1024).toFixed(1)} MB · {getMimeType(file)}
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 15, color: '#888' }}>Arrastra tu video aquí o</div>
                      <div style={{ fontSize: 14, color: '#2563eb', marginTop: 4, fontWeight: 600 }}>haz clic para seleccionar</div>
                      <div style={{ fontSize: 12, color: '#444', marginTop: 8 }}>MP4, MOV, AVI, MKV, WEBM — hasta 4 GB</div>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  style={{ display: 'none' }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f) }}
                />
                {file && (
                  <button
                    onClick={subirArchivo}
                    style={{
                      width: '100%', marginTop: 20, padding: '14px', borderRadius: 10, border: 'none',
                      background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                      color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    Subir y procesar →
                  </button>
                )}
                {file && (
                  <button onClick={() => setFile(null)} style={{ width: '100%', marginTop: 10, padding: '10px', borderRadius: 10, border: '1px solid #333', background: 'none', color: '#666', fontSize: 14, cursor: 'pointer' }}>
                    Cancelar
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* Estado: Subiendo */}
        {(status === 'uploading' || status === 'saving') && (
          <div style={{ background: '#0d0d1a', border: '1px solid #1a1a3e', borderRadius: 12, padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>
              {status === 'uploading' ? '⬆️' : '💾'}
            </div>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>
              {status === 'uploading' ? 'Subiendo a S3...' : 'Guardando en Airtable...'}
            </div>
            {status === 'uploading' && (
              <>
                <div style={{ background: '#1a1a2e', borderRadius: 999, height: 6, marginTop: 16, overflow: 'hidden' }}>
                  <div style={{ background: 'linear-gradient(90deg, #2563eb, #7c3aed)', height: '100%', width: `${progress}%`, transition: 'width .3s', borderRadius: 999 }} />
                </div>
                <div style={{ fontSize: 13, color: '#555', marginTop: 8 }}>{progress}%</div>
              </>
            )}
          </div>
        )}

        {/* Estado: Listo */}
        {status === 'done' && (
          <div style={{ background: '#0a1f0a', border: '1px solid #1a3a1a', borderRadius: 12, padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <div style={{ fontWeight: 700, fontSize: 20, color: '#4ade80', marginBottom: 8 }}>¡Video enviado!</div>
            <p style={{ color: '#888', fontSize: 14, marginBottom: 24 }}>
              GISTO está procesando tu video. En unos minutos verás el resultado en el dashboard.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => router.push('/dashboard')}
                style={{ flex: 1, padding: '12px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
              >
                Ver dashboard
              </button>
              <button
                onClick={reset}
                style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid #333', background: 'none', color: '#aaa', fontSize: 15, cursor: 'pointer' }}
              >
                Subir otro
              </button>
            </div>
          </div>
        )}

        {/* Estado: Error */}
        {status === 'error' && (
          <div style={{ background: '#1a0a0a', border: '1px solid #3a1a1a', borderRadius: 12, padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>❌</div>
            <div style={{ fontWeight: 700, fontSize: 18, color: '#f87171', marginBottom: 8 }}>Error al subir</div>
            <p style={{ color: '#888', fontSize: 13, marginBottom: 20, fontFamily: 'monospace', background: '#111', padding: '8px 12px', borderRadius: 6 }}>
              {errorMsg}
            </p>
            <button
              onClick={reset}
              style={{ padding: '12px 32px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
            >
              Intentar de nuevo
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
