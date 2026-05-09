'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function NotFound() {
  const [dots, setDots] = useState('')
  useEffect(()=>{
    const i = setInterval(()=>setDots(d=>d.length>=3?'':d+'.'),500)
    return ()=>clearInterval(i)
  },[])

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:'40px',position:'relative' as const,zIndex:1,textAlign:'center'}}>
      <div style={{maxWidth:'480px'}}>
        <div style={{
          fontFamily:"'Cabinet Grotesk',sans-serif",
          fontSize:'120px',fontWeight:900,lineHeight:1,
          background:'linear-gradient(135deg,var(--c),var(--c2))',
          WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',
          backgroundClip:'text',marginBottom:'8px',letterSpacing:'-4px'
        }}>404</div>
        <div style={{
          width:'80px',height:'3px',
          background:'linear-gradient(90deg,var(--c),var(--c2))',
          borderRadius:'2px',margin:'0 auto 28px'
        }}/>
        <h1 style={{
          fontFamily:"'Cabinet Grotesk',sans-serif",
          fontSize:'24px',fontWeight:800,letterSpacing:'-0.5px',
          marginBottom:'12px'
        }}>Página no encontrada</h1>
        <p style={{fontSize:'15px',color:'var(--t2)',lineHeight:1.7,marginBottom:'32px'}}>
          Esta página no existe o fue movida.<br/>
          Pero tu curso sí puede existir — en minutos.
        </p>
        <div style={{
          background:'var(--s1)',border:'1px solid var(--b)',
          borderRadius:'14px',padding:'20px',marginBottom:'28px'
        }}>
          <div style={{
            fontSize:'11px',fontWeight:700,color:'var(--t3)',
            letterSpacing:'1.5px',textTransform:'uppercase' as const,
            marginBottom:'12px',display:'flex',alignItems:'center',
            justifyContent:'center',gap:'6px'
          }}>
            <span style={{width:'6px',height:'6px',background:'var(--ok)',borderRadius:'50%',animation:'pulse 1.5s infinite',display:'inline-block'}}/>
            Motor GISTO activo{dots}
          </div>
          {['Transcripción automática','Limpieza de aula','Corte anatómico','Documentos + Quizzes'].map((s,i)=>(
            <div key={i} style={{
              fontSize:'12px',color:'var(--t2)',
              display:'flex',alignItems:'center',
              justifyContent:'center',gap:'6px',
              marginBottom:i<3?'6px':0
            }}>
              <span style={{color:'var(--ok)',fontSize:'10px',fontWeight:700}}>✓</span>{s}
            </div>
          ))}
        </div>
        <div style={{display:'flex',gap:'10px',justifyContent:'center'}}>
          <Link href="/dashboard" style={{
            display:'inline-flex',alignItems:'center',gap:'7px',
            background:'var(--c)',color:'#000',
            padding:'12px 24px',borderRadius:'9px',
            fontWeight:800,fontSize:'14px',textDecoration:'none'
          }}>
            Ir al dashboard
          </Link>
          <Link href="https://www.thegisto.com" style={{
            display:'inline-flex',alignItems:'center',gap:'7px',
            background:'var(--s1)',border:'1px solid var(--b)',
            color:'var(--t2)',padding:'12px 24px',borderRadius:'9px',
            fontWeight:600,fontSize:'14px',textDecoration:'none'
          }}>
            Ir al inicio
          </Link>
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.4)}}`}</style>
    </div>
  )
}
