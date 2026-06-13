// gisto-nextjs/lib/plans.ts
//
// FUENTE ÚNICA DE VERDAD para los 5 planes de THE GISTO.
//
// Usar SIEMPRE estos valores en: planes/page.tsx, dashboard/page.tsx,
// upload/page.tsx, /api/checkout/create, /api/airtable/usuario, webhook Lemon
// y cualquier landing dinámica. Si la landing es HTML estático, copiar manualmente.
//
// Reglas críticas (NO debatir, ya decidido):
// - IDs internos en minúscula. Nunca cambiar: demo, basico, estandar, premium, empresarial.
// - Precios en USD. Lemon Squeezy cobra impuestos aparte. GISTO NO absorbe impuestos.
// - Créditos sin expirar.
// - Plan estrella: premium.
// - Estandar 10h calibrado para curso típico Cecycam.

export type PlanId = 'demo' | 'basico' | 'estandar' | 'premium' | 'empresarial'
export type ClaudeModel = 'haiku' | 'sonnet'

export interface Plan {
  id: PlanId
  nombre: string          // visible en UI
  precioUSD: number       // base sin impuestos
  minutos: number         // créditos en minutos
  horasLabel: string      // "2 horas", "10 horas"
  pphLabel: string        // "$9.50/hora"
  modelo: ClaudeModel
  quizPreguntas: number
  features: string[]
  recommended: boolean
  color: string           // var(--*) o hex
  productEnvVar: string | null  // env var con product_id Lemon (null = no comprable)
}

export const PLANS: Record<PlanId, Plan> = {
  demo: {
    id: 'demo',
    nombre: 'Demo',
    precioUSD: 0,
    minutos: 30,
    horasLabel: '30 min',
    pphLabel: 'gratis',
    modelo: 'haiku',
    quizPreguntas: 5,
    features: [
      '30 minutos gratis para probar',
      'Cápsulas pedagógicas con cortes naturales',
      'Word académico con quiz, glosario y bibliografía',
      'ZIP descargable',
      'Sin tarjeta requerida'
    ],
    recommended: false,
    color: 'var(--ok)',
    productEnvVar: null
  },
  basico: {
    id: 'basico',
    nombre: 'Básico',
    precioUSD: 19,
    minutos: 120,
    horasLabel: '2 horas',
    pphLabel: '$9.50/hora',
    modelo: 'haiku',
    quizPreguntas: 5,
    features: [
      'Cápsulas pedagógicas con cortes naturales',
      'Word académico con quiz (5 preguntas Bloom)',
      'Glosario técnico',
      'Bibliografía APA cuando sea identificable',
      'ZIP descargable',
      'Créditos sin vencimiento'
    ],
    recommended: false,
    color: 'var(--t2)',
    productEnvVar: 'NEXT_PUBLIC_LEMON_PRODUCT_BASICO'
  },
  estandar: {
    id: 'estandar',
    nombre: 'Estándar',
    precioUSD: 45,
    minutos: 600,
    horasLabel: '10 horas',
    pphLabel: '$4.50/hora',
    modelo: 'haiku',
    quizPreguntas: 8,
    features: [
      'Todo lo de Básico',
      'Quiz ampliado (8 preguntas Bloom)',
      'Reporte de calidad del procesamiento',
      'Soporte por email',
      'Calibrado para un curso típico de 10h'
    ],
    recommended: false,
    color: 'var(--t2)',
    productEnvVar: 'NEXT_PUBLIC_LEMON_PRODUCT_ESTANDAR'
  },
  premium: {
    id: 'premium',
    nombre: 'Premium',
    precioUSD: 89,
    minutos: 1500,
    horasLabel: '25 horas',
    pphLabel: '$3.56/hora',
    modelo: 'sonnet',
    quizPreguntas: 15,
    features: [
      'Todo lo de Estándar',
      'Quiz Bloom completo (15 preguntas)',
      'Procesado con Sonnet (mayor profundidad)',
      'Subtítulos SRT por cápsula (opcional)',
      'Ficha de aprendizaje por cápsula',
      'Recomendado para procesar programas completos'
    ],
    recommended: true,
    color: '#00A8E8',
    productEnvVar: 'NEXT_PUBLIC_LEMON_PRODUCT_PREMIUM'
  },
  empresarial: {
    id: 'empresarial',
    nombre: 'Empresarial',
    precioUSD: 169,
    minutos: 3600,
    horasLabel: '60 horas',
    pphLabel: '$2.82/hora',
    modelo: 'sonnet',
    quizPreguntas: 27,
    features: [
      'Todo lo de Premium',
      'Quiz Bloom integrador (27 preguntas)',
      'Subtítulos SRT por cápsula (opcional)',
      'Soporte prioritario',
      'Volumen institucional'
    ],
    recommended: false,
    color: '#FFB020',
    productEnvVar: 'NEXT_PUBLIC_LEMON_PRODUCT_EMPRESARIAL'
  }
}

// Orden canónico para mostrar en UI (sin demo, que va aparte)
export const PLANS_ORDER: PlanId[] = ['basico', 'estandar', 'premium', 'empresarial']

// Lookup directo del demo (para empty states, bienvenida, etc.)
export const DEMO_PLAN = PLANS.demo

// ─────────────────────────────────────────────────────────────
// Helpers públicos
// ─────────────────────────────────────────────────────────────

/** Normaliza un valor de plan venido de Airtable, localStorage o webhook.
 *  Tolerante a mayúsculas, espacios, tildes y a nombres viejos
 *  (Free/Starter/Professional/Academia) por compatibilidad histórica. */
export function resolverPlan(raw: unknown): PlanId {
  if (typeof raw !== 'string') return 'demo'
  const norm = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quitar tildes
    .trim()

  if (norm in PLANS) return norm as PlanId

  // Compatibilidad histórica (nombres viejos del dashboard v17_4)
  if (norm === 'free') return 'demo'
  if (norm === 'starter') return 'basico'
  if (norm === 'professional' || norm === 'profesional') return 'estandar'
  if (norm === 'academia') return 'premium'

  return 'demo'
}

/** Devuelve el plan completo a partir de cualquier string. */
export function getPlan(raw: unknown): Plan {
  return PLANS[resolverPlan(raw)]
}

/** Formato amigable de minutos: "1h 30min", "45 min", "2h". */
export function formatHorasMin(minutos: number | undefined | null): string {
  const m = Number(minutos)
  if (!Number.isFinite(m) || m <= 0) return '0 min'
  const h = Math.floor(m / 60)
  const rem = m % 60
  if (h === 0) return `${rem} min`
  if (rem === 0) return `${h}h`
  return `${h}h ${rem}min`
}

/** Lee el product_id de Lemon desde env. Devuelve null si no está configurado. */
export function getProductId(planId: PlanId): string | null {
  const plan = PLANS[planId]
  if (!plan.productEnvVar) return null
  // process.env funciona en cliente solo si la var empieza con NEXT_PUBLIC_
  const id = process.env[plan.productEnvVar]
  if (!id || id.startsWith('REEMPLAZAR_') || id.trim() === '') return null
  return id
}

/** ¿Está habilitada la compra de este plan? (tiene product_id real) */
export function isPlanComprable(planId: PlanId): boolean {
  return getProductId(planId) !== null
}

// Maps derivados para componentes que necesitan acceso rápido por id
export const PLAN_COLORS: Record<PlanId, string> = {
  demo: 'var(--t3)',
  basico: 'var(--t2)',
  estandar: 'var(--t2)',
  premium: '#00A8E8',
  empresarial: '#FFB020'
}

export const PLAN_BG: Record<PlanId, string> = {
  demo: 'rgba(136,153,170,.06)',
  basico: 'rgba(0,168,232,.06)',
  estandar: 'rgba(0,168,232,.08)',
  premium: 'rgba(0,168,232,.10)',
  empresarial: 'rgba(255,176,32,.08)'
}

/** Mapa de plan → minutos máximos. Útil para barras de progreso de créditos. */
export const PLAN_MAX_MINUTOS: Record<PlanId, number> = Object.fromEntries(
  (Object.keys(PLANS) as PlanId[]).map(id => [id, PLANS[id].minutos])
) as Record<PlanId, number>
