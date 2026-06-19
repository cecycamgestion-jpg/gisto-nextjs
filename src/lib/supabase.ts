// src/lib/supabase.ts
// Cliente compartido de Supabase para usar en TODOS los endpoints del backend
// (Next.js API routes). Usa la SERVICE ROLE KEY — acceso total, bypasea RLS.
// NUNCA importar este archivo desde código que corra en el navegador.
// Esta key vive solo en variables de entorno del servidor (Vercel backend).
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }  // no necesitamos sesiones de Supabase Auth,
                                     // GISTO usa su propio JWT
})
