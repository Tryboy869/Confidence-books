import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyPassword, signToken } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const { userId, password } = await req.json()

    if (!userId || !password) {
      return NextResponse.json({ error: 'UUID et mot de passe requis' }, { status: 400 })
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(userId)) {
      return NextResponse.json({ error: 'Format UUID invalide' }, { status: 400 })
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, password_hash, avatar, theme, language')
      .eq('id', userId)
      .single()

    if (error || !user) {
      return NextResponse.json({ error: 'Identifiant introuvable' }, { status: 404 })
    }

    const valid = await verifyPassword(password, user.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 401 })
    }

    // Update last_active
    await supabaseAdmin.from('users').update({ last_active_at: new Date().toISOString() }).eq('id', userId)

    const token = signToken(user.id)

    return NextResponse.json({
      success: true,
      userId: user.id,
      avatar: user.avatar,
      theme: user.theme,
      language: user.language,
      token
    })
  } catch (err) {
    console.error('[LOGIN]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
