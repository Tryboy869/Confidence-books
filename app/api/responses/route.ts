import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getUserIdFromRequest } from '@/lib/auth'
import { moderateContent } from '@/lib/moderation'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const confidenceId = searchParams.get('confidenceId')
  if (!confidenceId) return NextResponse.json({ error: 'confidenceId requis' }, { status: 400 })

  try {
    const { data, error } = await supabaseAdmin
      .from('responses').select('id, content, created_at')
      .eq('confidence_id', confidenceId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true })
    if (error) throw error
    return NextResponse.json({ success: true, responses: data })
  } catch (err) {
    console.error('[GET RESPONSES]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const userId = getUserIdFromRequest(req)
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  try {
    const { confidenceId, content } = await req.json()

    if (!content || content.trim().length < 5)
      return NextResponse.json({ error: 'Trop court (min 5 caractères)' }, { status: 400 })
    if (content.length > 1000)
      return NextResponse.json({ error: 'Trop long (max 1000 caractères)' }, { status: 400 })

    const { data: conf } = await supabaseAdmin
      .from('confidences').select('id').eq('id', confidenceId)
      .gt('expires_at', new Date().toISOString()).single()
    if (!conf) return NextResponse.json({ error: 'Confidence introuvable ou expirée' }, { status: 404 })

    // Modération intelligente sur les commentaires aussi
    const mod = await moderateContent(content.trim())

    if (mod.status === 'rejected') {
      return NextResponse.json({
        success: false,
        moderation: { status: 'rejected', feedback: mod.feedback, rule_violated: mod.rule_violated }
      }, { status: 422 })
    }

    if (mod.status === 'corrected') {
      return NextResponse.json({
        success: false,
        moderation: {
          status: 'corrected',
          feedback: mod.feedback,
          corrected_content: mod.corrected_content,
          rule_violated: mod.rule_violated
        }
      }, { status: 200 })
    }

    const { data, error } = await supabaseAdmin
      .from('responses')
      .insert({ confidence_id: confidenceId, user_id: userId, content: content.trim() })
      .select('id, content, created_at').single()
    if (error) throw error

    return NextResponse.json({
      success: true,
      response: data,
      moderation: mod.status === 'warning' ? { status: 'warning', feedback: mod.feedback } : null
    })
  } catch (err) {
    console.error('[POST RESPONSE]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
