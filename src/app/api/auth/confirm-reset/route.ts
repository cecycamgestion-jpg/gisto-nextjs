import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { token, new_password } = await req.json()

    if (!token) {
      return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 400 })
    }
    if (!new_password || new_password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener mínimo 6 caracteres' }, { status: 400 })
    }

    // 1. Buscar usuario con ese token
    const { data: user } = await supabase
      .from('usuarios')
      .select('id, Reset_Expira')
      .eq('Reset_Token', token)
      .maybeSingle()

    if (!user) {
      return NextResponse.json({ error: 'El link es inválido o ya fue utilizado' }, { status: 400 })
    }

    // 2. Verificar que el token no expiró
    if (!user.Reset_Expira || new Date(user.Reset_Expira) < new Date()) {
      // Limpiar token expirado — no bloquear la respuesta si esto falla
      await supabase
        .from('usuarios')
        .update({ Reset_Token: null, Reset_Expira: null })
        .eq('id', user.id)

      return NextResponse.json({ error: 'El link expiró. Solicita uno nuevo.' }, { status: 400 })
    }

    // 3. Hashear nueva contraseña
    const hashed = await bcrypt.hash(new_password, 12)

    // 4. Actualizar contraseña y limpiar tokens
    const { error } = await supabase
      .from('usuarios')
      .update({ Password: hashed, Reset_Token: null, Reset_Expira: null })
      .eq('id', user.id)

    if (error) {
      console.error('Confirm reset — error Supabase:', error)
      return NextResponse.json({ error: 'Error de servidor. Intenta de nuevo.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Confirm reset error:', error)
    return NextResponse.json({ error: 'Error de servidor. Intenta de nuevo.' }, { status: 500 })
  }
}
