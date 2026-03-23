import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { hashPassword, signToken } from '@/lib/auth'
import { AVATARS } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const { password } = await req.json()

    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Mot de passe trop court (min 6 caractères)' }, { status: 400 })
    }

    const passwordHash = await hashPassword(password)
    const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)]

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .insert({ password_hash: passwordHash, avatar })
      .select('id, avatar')
      .single()

    if (error) throw error

    const token = signToken(user.id)

    return NextResponse.json({
      success: true,
      userId: user.id,
      avatar: user.avatar,
      token
    })
  } catch (err) {
    console.error('[REGISTER]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
