import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getUserIdFromRequest } from '@/lib/auth'

export async function POST(req: Request) {
  const userId = getUserIdFromRequest(req)
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  try {
    const { confidenceId, type } = await req.json()

    const validTypes = ['heart', 'hug', 'strength', 'candle']
    if (!validTypes.includes(type))
      return NextResponse.json({ error: 'Type de réaction invalide' }, { status: 400 })

    // Vérifier que la confidence existe et n'est pas expirée
    const { data: conf } = await supabaseAdmin
      .from('confidences')
      .select('id, user_id')
      .eq('id', confidenceId)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (!conf) return NextResponse.json({ error: 'Confidence introuvable' }, { status: 404 })
    if (conf.user_id === userId) return NextResponse.json({ error: 'Impossible de réagir à sa propre confidence' }, { status: 400 })

    // Toggle : si même type => supprime, sinon update
    const { data: existing } = await supabaseAdmin
      .from('reactions')
      .select('id, type')
      .eq('confidence_id', confidenceId)
      .eq('user_id', userId)
      .single()

    if (existing) {
      if (existing.type === type) {
        await supabaseAdmin.from('reactions').delete().eq('id', existing.id)
        return NextResponse.json({ success: true, action: 'removed' })
      } else {
        await supabaseAdmin.from('reactions').update({ type }).eq('id', existing.id)
        return NextResponse.json({ success: true, action: 'updated', type })
      }
    }

    await supabaseAdmin.from('reactions').insert({ confidence_id: confidenceId, user_id: userId, type })
    return NextResponse.json({ success: true, action: 'added', type })
  } catch (err) {
    console.error('[REACTIONS]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
