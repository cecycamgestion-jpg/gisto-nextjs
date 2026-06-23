// src/lib/supabase.ts
// Cliente de Supabase para uso EXCLUSIVO en el servidor (Route Handlers de
// Next.js bajo app/api/...). Usa la service_role key — nunca debe llegar
// al navegador del cliente. Si este archivo ya existe en tu repo (de la
// Fase 3 / INSTRUCCIONES_FASE3_PARTE1.md), no hace falta crear otro —
// usa el que ya tienes, debería verse igual a esto.
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('[supabase.ts] Falta SUPABASE_URL o SUPABASE_SERVICE_KEY en las variables de entorno')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
})
