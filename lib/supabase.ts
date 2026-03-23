import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Client public (frontend)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Client admin (API routes server-side uniquement)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

export type Emotion = 'ruptures' | 'isolement' | 'traumas' | 'stress' | 'spiritualite' | 'espoir' | 'colere' | 'deuil'
export type ReactionType = 'heart' | 'hug' | 'strength' | 'candle'

export interface User {
  id: string
  avatar: string
  theme: 'dark' | 'light'
  language: string
  created_at: string
}

export interface Confidence {
  id: string
  user_id?: string
  content: string
  emotion: Emotion
  is_premium?: boolean
  is_own?: boolean
  expires_at: string
  created_at: string
  reaction_count?: number
  response_count?: number
  user_reaction?: ReactionType | null
}

export interface Response {
  id: string
  confidence_id: string
  user_id: string
  content: string
  created_at: string
}

export const EMOTION_LABELS: Record<Emotion, { label: string; emoji: string; color: string }> = {
  ruptures:    { label: 'Ruptures',      emoji: '💔', color: 'rose' },
  isolement:   { label: 'Isolement',     emoji: '🌑', color: 'slate' },
  traumas:     { label: 'Traumas',       emoji: '🌊', color: 'blue' },
  stress:      { label: 'Stress',        emoji: '⚡', color: 'yellow' },
  spiritualite:{ label: 'Spiritualité',  emoji: '✨', color: 'violet' },
  espoir:      { label: 'Espoir',        emoji: '🌱', color: 'green' },
  colere:      { label: 'Colère',        emoji: '🔥', color: 'orange' },
  deuil:       { label: 'Deuil',         emoji: '🕊️', color: 'gray' },
}

export const AVATARS = ['🌿', '🌊', '🌙', '☀️', '🦋', '🌸', '⭐', '🕊️', '🌺', '🍃']
