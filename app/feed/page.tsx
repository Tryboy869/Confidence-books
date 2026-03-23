'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/lib/context'
import { EMOTION_LABELS, type Emotion, type Confidence } from '@/lib/supabase'

const EMOTIONS = Object.entries(EMOTION_LABELS) as [Emotion, { label: string; emoji: string; color: string }][]
const REACTION_EMOJIS: Record<string, string> = { heart: '❤️', hug: '🤗', strength: '💪', candle: '🕯️' }

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'à l\'instant'
  if (mins < 60) return `il y a ${mins} min`
  if (hours < 24) return `il y a ${hours}h`
  return `il y a ${days}j`
}

function daysLeft(expires: string) {
  return Math.ceil((new Date(expires).getTime() - Date.now()) / 86400000)
}

// Bannière modération inline
function ModerationBanner({ mod, onUseCorrected, onDismiss }: {
  mod: { status: string; feedback?: string; corrected_content?: string; rule_violated?: string }
  onUseCorrected?: (text: string) => void
  onDismiss: () => void
}) {
  if (mod.status === 'rejected') {
    return (
      <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px' }}>
        <div style={{ fontWeight: 600, fontSize: '13px', color: '#ef4444', marginBottom: '6px' }}>⛔ Message non publié</div>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 10px' }}>{mod.feedback}</p>
        <button onClick={onDismiss} style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Fermer</button>
      </div>
    )
  }

  if (mod.status === 'corrected') {
    return (
      <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px' }}>
        <div style={{ fontWeight: 600, fontSize: '13px', color: '#f59e0b', marginBottom: '6px' }}>✏️ L&apos;IA a proposé une correction</div>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 10px' }}>{mod.feedback}</p>
        {mod.corrected_content && (
          <div style={{ background: 'var(--bg-subtle)', borderRadius: '8px', padding: '10px 12px', marginBottom: '12px', fontSize: '13px', lineHeight: 1.65, color: 'var(--text-primary)', fontStyle: 'italic', fontFamily: 'Lora, serif' }}>
            {mod.corrected_content}
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px' }}>
          {mod.corrected_content && onUseCorrected && (
            <button onClick={() => onUseCorrected(mod.corrected_content!)}
              style={{ flex: 1, padding: '8px', borderRadius: '8px', background: 'var(--accent)', color: 'var(--bg)', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
              ✅ Utiliser cette version
            </button>
          )}
          <button onClick={onDismiss}
            style={{ flex: 1, padding: '8px', borderRadius: '8px', background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '12px' }}>
            ✏️ Modifier moi-même
          </button>
        </div>
      </div>
    )
  }

  if (mod.status === 'warning') {
    return (
      <div className="warning-banner" style={{ marginBottom: '16px' }}>
        <div style={{ fontWeight: 600, marginBottom: '4px' }}>💜 Ton message a été publié</div>
        <p style={{ margin: 0, lineHeight: 1.5 }}>{mod.feedback}</p>
      </div>
    )
  }

  return null
}

export default function FeedPage() {
  const router = useRouter()
  const { user, theme, setTheme, toast, isLoading } = useApp()
  const [confidences, setConfidences] = useState<Confidence[]>([])
  const [filter, setFilter] = useState<Emotion | 'all'>('all')
  const [loadingFeed, setLoadingFeed] = useState(true)

  // Publish modal state
  const [showPublish, setShowPublish] = useState(false)
  const [newContent, setNewContent] = useState('')
  const [newEmotion, setNewEmotion] = useState<Emotion | ''>('')
  const [publishing, setPublishing] = useState(false)
  const [publishMod, setPublishMod] = useState<any>(null)

  // Detail modal state
  const [showDetail, setShowDetail] = useState<Confidence | null>(null)
  const [responses, setResponses] = useState<any[]>([])
  const [newReply, setNewReply] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [replyMod, setReplyMod] = useState<any>(null)

  useEffect(() => {
    if (!isLoading && !user) router.replace('/')
  }, [user, isLoading, router])

  const fetchFeed = useCallback(async () => {
    if (!user) return
    setLoadingFeed(true)
    try {
      const url = `/api/confidences${filter !== 'all' ? `?emotion=${filter}` : ''}`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${user.token}` } })
      const data = await res.json()
      if (data.success) setConfidences(data.confidences || [])
    } catch { toast('Erreur de chargement') }
    finally { setLoadingFeed(false) }
  }, [user, filter, toast])

  useEffect(() => { fetchFeed() }, [fetchFeed])

  async function publish(contentOverride?: string) {
    if (!user || !newEmotion) return toast('Choisis une émotion')
    const content = (contentOverride || newContent).trim()
    if (content.length < 10) return toast('Trop court (min 10 caractères)')

    setPublishing(true)
    setPublishMod(null)
    try {
      const res = await fetch('/api/confidences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
        body: JSON.stringify({ content, emotion: newEmotion })
      })
      const data = await res.json()

      if (data.moderation) {
        setPublishMod(data.moderation)
        if (data.moderation.status === 'corrected' && contentOverride) {
          // L'utilisateur avait accepté la version corrigée mais elle a encore un problème
          setNewContent(contentOverride)
        }
        return
      }

      if (!data.success) return toast(data.error || 'Erreur')

      // warning → afficher dans modal
      if (data.moderation?.status === 'warning') {
        setPublishMod(data.moderation)
      } else {
        toast('✅ Confidence publiée')
        setShowPublish(false)
        setNewContent('')
        setNewEmotion('')
      }
      fetchFeed()
    } catch { toast('Erreur') }
    finally { setPublishing(false) }
  }

  function handleUseCorrected(correctedText: string) {
    setNewContent(correctedText)
    setPublishMod(null)
    // Republier automatiquement avec le texte corrigé
    publish(correctedText)
  }

  async function react(conf: Confidence, type: string) {
    if (!user || conf.is_own) return
    try {
      const res = await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
        body: JSON.stringify({ confidenceId: conf.id, type })
      })
      const data = await res.json()
      if (!data.success) return
      setConfidences(prev => prev.map(c => {
        if (c.id !== conf.id) return c
        const wasActive = c.user_reaction === type
        return {
          ...c,
          user_reaction: wasActive ? null : type as any,
          reaction_count: wasActive ? (c.reaction_count || 1) - 1 : (c.reaction_count || 0) + 1
        }
      }))
    } catch {}
  }

  async function openDetail(conf: Confidence) {
    setShowDetail(conf)
    setResponses([])
    setReplyMod(null)
    try {
      const res = await fetch(`/api/responses?confidenceId=${conf.id}`, {
        headers: user ? { Authorization: `Bearer ${user.token}` } : {}
      })
      const data = await res.json()
      if (data.success) setResponses(data.responses || [])
    } catch {}
  }

  async function sendReply(contentOverride?: string) {
    if (!user || !showDetail) return
    const content = (contentOverride || newReply).trim()
    if (!content) return

    setSendingReply(true)
    setReplyMod(null)
    try {
      const res = await fetch('/api/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
        body: JSON.stringify({ confidenceId: showDetail.id, content })
      })
      const data = await res.json()

      if (data.moderation) {
        setReplyMod(data.moderation)
        return
      }
      if (!data.success) return toast(data.error || 'Erreur')

      setResponses(prev => [...prev, data.response])
      setNewReply('')
      if (data.moderation?.status === 'warning') setReplyMod(data.moderation)
      else toast('Réponse envoyée 💜')
    } catch { toast('Erreur') }
    finally { setSendingReply(false) }
  }

  if (isLoading || !user) return null

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: '72px' }}>

      {/* Header */}
      <header style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', zIndex: 30, padding: '12px 16px' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: '18px', margin: 0 }}>📖 Confidence Book</h1>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', padding: '4px' }}>
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button onClick={() => router.push('/profile')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', padding: '4px' }}>
              {user.avatar}
            </button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '16px 16px 0' }}>

        {/* Publish button */}
        <button onClick={() => { setShowPublish(true); setPublishMod(null) }} className="card"
          style={{ width: '100%', textAlign: 'left', padding: '14px 16px', marginBottom: '16px', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>{user.avatar}</span>
          <span>Qu&apos;est-ce que tu portes aujourd&apos;hui ?</span>
        </button>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '16px', scrollbarWidth: 'none' }}>
          <button className={`emotion-chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>✨ Tout</button>
          {EMOTIONS.map(([key, val]) => (
            <button key={key} className={`emotion-chip ${filter === key ? 'active' : ''}`} onClick={() => setFilter(key)}>
              {val.emoji} {val.label}
            </button>
          ))}
        </div>

        {/* Feed */}
        {loadingFeed ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '14px' }}>Chargement...</div>
        ) : confidences.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🌿</div>
            <p style={{ fontSize: '15px' }}>Aucune confidence ici pour l&apos;instant.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {confidences.map((conf, i) => (
              <div key={conf.id} className="card fade-up" style={{ padding: '16px', animationDelay: `${i * 0.04}s` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span className="emotion-chip" style={{ cursor: 'default', fontSize: '12px', padding: '4px 10px' }}>
                    {EMOTION_LABELS[conf.emotion]?.emoji} {EMOTION_LABELS[conf.emotion]?.label}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {timeAgo(conf.created_at)} · {daysLeft(conf.expires_at)}j restants
                  </span>
                </div>
                <p style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--text-primary)', margin: '0 0 12px', fontFamily: 'Lora, serif' }}>
                  {conf.content.length > 220 ? conf.content.slice(0, 220) + '...' : conf.content}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  {Object.entries(REACTION_EMOJIS).map(([type, emoji]) => (
                    <button key={type} onClick={() => react(conf, type)} style={{
                      background: conf.user_reaction === type ? 'var(--accent-soft)' : 'var(--bg-subtle)',
                      border: conf.user_reaction === type ? '1px solid var(--accent)' : '1px solid transparent',
                      borderRadius: '8px', padding: '5px 10px', cursor: conf.is_own ? 'default' : 'pointer',
                      opacity: conf.is_own ? 0.4 : 1, fontSize: '14px', transition: 'all 0.15s'
                    }}>{emoji}</button>
                  ))}
                  <button onClick={() => openDetail(conf)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    💬 {conf.response_count || 0}
                  </button>
                  {(conf.reaction_count || 0) > 0 && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>· {conf.reaction_count} ❤️</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BOTTOM NAV */}
      <nav className="bottom-nav">
        {[
          { icon: '🏠', label: 'Feed', path: '/feed', active: true },
          { icon: '✍️', label: 'Publier', action: () => setShowPublish(true) },
          { icon: '👤', label: 'Profil', path: '/profile' },
        ].map(item => (
          <button key={item.label} onClick={item.action || (() => router.push(item.path!))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '4px 16px', color: item.active ? 'var(--accent)' : 'var(--text-muted)' }}>
            <span style={{ fontSize: '20px' }}>{item.icon}</span>
            <span style={{ fontSize: '10px', fontWeight: 500 }}>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* MODAL PUBLISH */}
      {showPublish && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) { setShowPublish(false); setPublishMod(null) } }}>
          <div className="modal-sheet">
            <div style={{ width: '40px', height: '4px', background: 'var(--border)', borderRadius: '2px', margin: '0 auto 20px' }} />
            <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Partager une confidence</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>Anonyme · Disparaît dans 14 jours · Modéré par IA</p>

            {/* Bannière modération */}
            {publishMod && (
              <ModerationBanner
                mod={publishMod}
                onUseCorrected={handleUseCorrected}
                onDismiss={() => setPublishMod(null)}
              />
            )}

            {publishMod?.status !== 'warning' && (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>CE QUE TU RESSENS</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {EMOTIONS.map(([key, val]) => (
                      <button key={key} className={`emotion-chip ${newEmotion === key ? 'active' : ''}`} onClick={() => setNewEmotion(key)}>
                        {val.emoji} {val.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                    TON MESSAGE <span style={{ color: newContent.length > 1800 ? '#ef4444' : 'var(--text-muted)' }}>{newContent.length}/2000</span>
                  </label>
                  <textarea className="input" rows={6}
                    placeholder="Exprime-toi librement... L'IA anonymisera automatiquement toute info personnelle avant publication."
                    value={newContent} onChange={e => setNewContent(e.target.value)}
                    style={{ resize: 'none', lineHeight: 1.65, fontFamily: 'Lora, serif', fontSize: '14px' }} />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn-ghost" style={{ flex: 1 }} onClick={() => { setShowPublish(false); setPublishMod(null) }}>Annuler</button>
                  <button className="btn-primary" style={{ flex: 2 }} onClick={() => publish()} disabled={publishing || !newContent.trim() || !newEmotion}>
                    {publishing ? '🤖 Analyse en cours...' : 'Publier'}
                  </button>
                </div>
              </>
            )}

            {publishMod?.status === 'warning' && (
              <button className="btn-primary" style={{ width: '100%' }} onClick={() => { setShowPublish(false); setPublishMod(null); setNewContent(''); setNewEmotion('') }}>
                Fermer
              </button>
            )}
          </div>
        </div>
      )}

      {/* MODAL DETAIL */}
      {showDetail && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) { setShowDetail(null); setNewReply(''); setReplyMod(null) } }}>
          <div className="modal-sheet">
            <div style={{ width: '40px', height: '4px', background: 'var(--border)', borderRadius: '2px', margin: '0 auto 20px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span className="emotion-chip" style={{ cursor: 'default', fontSize: '12px' }}>
                {EMOTION_LABELS[showDetail.emotion]?.emoji} {EMOTION_LABELS[showDetail.emotion]?.label}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{timeAgo(showDetail.created_at)}</span>
            </div>
            <p style={{ fontSize: '15px', lineHeight: 1.7, fontFamily: 'Lora, serif', marginBottom: '20px', color: 'var(--text-primary)' }}>
              {showDetail.content}
            </p>
            <div className="divider" />
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '12px' }}>
                {responses.length === 0 ? 'Aucune réponse encore' : `${responses.length} réponse${responses.length > 1 ? 's' : ''}`}
              </div>
              {responses.map(r => (
                <div key={r.id} style={{ padding: '10px 12px', background: 'var(--bg-subtle)', borderRadius: '10px', marginBottom: '8px' }}>
                  <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--text-primary)', margin: 0, fontFamily: 'Lora, serif' }}>{r.content}</p>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>{timeAgo(r.created_at)}</div>
                </div>
              ))}
            </div>

            {/* Modération réponse */}
            {replyMod && (
              <ModerationBanner
                mod={replyMod}
                onUseCorrected={(text) => { setNewReply(text); setReplyMod(null); sendReply(text) }}
                onDismiss={() => setReplyMod(null)}
              />
            )}

            {!showDetail.is_own && (!replyMod || replyMod.status === 'warning') && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <input className="input" placeholder="Réponds avec bienveillance..."
                  value={newReply} onChange={e => setNewReply(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendReply()}
                  style={{ flex: 1, padding: '10px 14px' }} />
                <button className="btn-primary" style={{ padding: '10px 16px', flexShrink: 0 }}
                  onClick={() => sendReply()} disabled={sendingReply || !newReply.trim()}>
                  {sendingReply ? '...' : '↑'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
