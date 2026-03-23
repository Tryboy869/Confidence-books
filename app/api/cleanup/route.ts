import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Route appelée par un cron Vercel (vercel.json) ou manuellement
// Protégée par un secret header
export async function POST(req: Request) {
  const secret = req.headers.get('x-cleanup-secret')
  if (secret !== process.env.CLEANUP_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date().toISOString()

    const { count: deletedResponses } = await supabaseAdmin
      .from('responses')
      .delete({ count: 'exact' })
      .lt('expires_at', now)

    const { count: deletedConfidences } = await supabaseAdmin
      .from('confidences')
      .delete({ count: 'exact' })
      .lt('expires_at', now)

    console.log(`[CLEANUP] Deleted ${deletedConfidences} confidences, ${deletedResponses} responses`)

    return NextResponse.json({
      success: true,
      deleted: { confidences: deletedConfidences, responses: deletedResponses },
      timestamp: now
    })
  } catch (err) {
    console.error('[CLEANUP]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
