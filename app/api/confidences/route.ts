import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getUserIdFromRequest } from '@/lib/auth'
import { moderateContent } from '@/lib/moderation'

export async function GET(req: Request) {
  const userId = getUserIdFromRequest(req)
  const { searchParams } = new URL(req.url)
  const emotion = searchParams.get('emotion')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 20
  const offset = (page - 1) * limit

  try {
    let query = supabaseAdmin
      .from('confidences')
      .select(`id, user_id, content, emotion, expires_at, created_at, reactions(count), responses(count)`)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (emotion && emotion !== 'all') query = query.eq('emotion', emotion)

    const { data, error } = await query
    if (error) throw error

    let userReactions: Record<string, string> = {}
    if (userId && data && data.length > 0) {
      const ids = (data as any[]).map(c => c.id)
      const { data: reactions } = await supabaseAdmin
        .from('reactions').select('confidence_id, type').eq('user_id', userId).in('confidence_id', ids)
      if (reactions) userReactions = Object.fromEntries((reactions as any[]).map(r => [r.confidence_id, r.type]))
    }

    const confidences = (data as any[])?.map(c => ({
      id: c.id, content: c.content, emotion: c.emotion,
      expires_at: c.expires_at, created_at: c.created_at,
      is_own: c.user_id === userId,
      reaction_count: c.reactions?.[0]?.count || 0,
      response_count: c.responses?.[0]?.count || 0,
      user_reaction: userReactions[c.id] || null,
    }))

    return NextResponse.json({ success: true, confidences, page })
  } catch (err) {
    console.error('[GET CONFIDENCES]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const userId = getUserIdFromRequest(req)
  if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  try {
    const { content, emotion } = await req.json()

    if (!content || content.trim().length < 10)
      return NextResponse.json({ error: 'Contenu trop court (min 10 caractères)' }, { status: 400 })
    if (content.length > 2000)
      return NextResponse.json({ error: 'Contenu trop long (max 2000 caractères)' }, { status: 400 })

    const validEmotions = ['ruptures','isolement','traumas','stress','spiritualite','espoir','colere','deuil']
    if (!validEmotions.includes(emotion))
      return NextResponse.json({ error: 'Émotion invalide' }, { status: 400 })

    const { count } = await supabaseAdmin
      .from('confidences').select('*', { count: 'exact', head: true })
      .eq('user_id', userId).gt('expires_at', new Date().toISOString())
    if ((count || 0) >= 10)
      return NextResponse.json({ error: 'Limite de 10 confidences actives atteinte' }, { status: 429 })

    // Modération Groq intelligente
    const mod = await moderateContent(content.trim())

    if (mod.status === 'rejected') {
      return NextResponse.json({
        success: false,
        moderation: { status: 'rejected', feedback: mod.feedback, rule_violated: mod.rule_violated }
      }, { status: 422 })
    }

    if (mod.status === 'corrected') {
      // Ne pas publier — renvoyer la version corrigée pour validation utilisateur
      return NextResponse.json({
        success: false,
        moderation: {
          status: 'corrected',
          feedback: mod.feedback,
          corrected_content: mod.corrected_content,
          rule_violated: mod.rule_violated
        }
      }, { status: 200 }) // 200 car c'est pas une erreur, c'est un dialogue
    }

    // approved ou warning → publier le contenu original
    const { data, error } = await supabaseAdmin
      .from('confidences')
      .insert({ user_id: userId, content: content.trim(), emotion })
      .select('id, created_at, expires_at').single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      confidence: data,
      moderation: mod.status === 'warning' ? { status: 'warning', feedback: mod.feedback } : null
    })
  } catch (err) {
    console.error('[POST CONFIDENCE]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
