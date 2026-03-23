'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/lib/context'
import { EMOTION_LABELS, type Confidence } from '@/lib/supabase'
import { AVATARS } from '@/lib/supabase'

export default function ProfilePage() {
  const router = useRouter()
  const { user, logout, toast, theme, setTheme, isLoading } = useApp()
  const [myConf, setMyConf] = useState<Confidence[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!isLoading && !user) router.replace('/')
  }, [user, isLoading, router])

  useEffect(() => {
    if (!user) return
    setLoading(true)
    fetch('/api/confidences?mine=true', { headers: { Authorization: `Bearer ${user.token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setMyConf((d.confidences || []).filter((c: Confidence) => c.is_own)) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  function copyId() {
    if (!user) return
    navigator.clipboard.writeText(user.userId)
    setCopied(true)
    toast('UUID copié !')
    setTimeout(() => setCopied(false), 2000)
  }

  function handleLogout() {
    logout()
    router.replace('/')
  }

  function daysLeft(expires: string) {
    return Math.ceil((new Date(expires).getTime() - Date.now()) / 86400000)
  }

  if (isLoading || !user) return null

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: '80px' }}>

      {/* Header */}
      <header style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', zIndex: 30, padding: '12px 16px' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => router.push('/feed')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '14px' }}>
            ← Retour
          </button>
          <h1 style={{ fontSize: '18px', margin: 0 }}>Mon profil</h1>
          <div style={{ width: '60px' }} />
        </div>
      </header>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '20px 16px' }}>

        {/* Avatar + stats */}
        <div className="card" style={{ padding: '24px', marginBottom: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '52px', marginBottom: '8px' }}>{user.avatar}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>Membre anonyme</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '32px' }}>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)' }}>{myConf.length}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Confidences</div>
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)' }}>14j</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Durée max</div>
            </div>
          </div>
        </div>

        {/* Mon UUID */}
        <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mon identifiant</div>
          <div style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-secondary)', background: 'var(--bg-subtle)', padding: '10px 12px', borderRadius: '8px', wordBreak: 'break-all', marginBottom: '10px', lineHeight: 1.7 }}>
            {user.userId}
          </div>
          <button className="btn-ghost" style={{ width: '100%', fontSize: '13px' }} onClick={copyId}>
            {copied ? '✅ Copié !' : '📋 Copier mon UUID'}
          </button>
        </div>

        {/* Thème */}
        <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Apparence</div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {(['dark', 'light'] as const).map(t => (
              <button key={t} onClick={() => setTheme(t)}
                style={{ flex: 1, padding: '10px', borderRadius: '10px', border: `2px solid ${theme === t ? 'var(--accent)' : 'var(--border)'}`, background: theme === t ? 'var(--accent-soft)' : 'var(--bg-subtle)', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 500, transition: 'all 0.2s' }}>
                {t === 'dark' ? '🌙 Sombre' : '☀️ Clair'}
              </button>
            ))}
          </div>
        </div>

        {/* Mes confidences */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '15px', marginBottom: '12px', color: 'var(--text-secondary)' }}>Mes confidences actives</h3>
          {loading ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>Chargement...</div>
          ) : myConf.length === 0 ? (
            <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              Aucune confidence publiée
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {myConf.map(conf => (
                <div key={conf.id} className="card" style={{ padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span className="emotion-chip" style={{ cursor: 'default', fontSize: '11px', padding: '3px 8px' }}>
                      {EMOTION_LABELS[conf.emotion]?.emoji} {EMOTION_LABELS[conf.emotion]?.label}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>expire dans {daysLeft(conf.expires_at)}j</span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0, fontFamily: 'Lora, serif' }}>
                    {conf.content.slice(0, 120)}{conf.content.length > 120 ? '...' : ''}
                  </p>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <span>❤️ {conf.reaction_count || 0}</span>
                    <span>💬 {conf.response_count || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Logout */}
        <button onClick={handleLogout}
          style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '14px', fontWeight: 500, transition: 'background 0.2s' }}>
          Se déconnecter
        </button>

        <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', marginTop: '20px' }}>
          Confidence Book · Aucune donnée personnelle stockée
        </p>
      </div>

      {/* Bottom nav */}
      <nav className="bottom-nav">
        {[
          { icon: '🏠', label: 'Feed', path: '/feed' },
          { icon: '✍️', label: 'Publier', path: '/feed' },
          { icon: '👤', label: 'Profil', path: '/profile', active: true },
        ].map(item => (
          <button key={item.label} onClick={() => router.push(item.path)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '4px 16px', color: item.active ? 'var(--accent)' : 'var(--text-muted)' }}>
            <span style={{ fontSize: '20px' }}>{item.icon}</span>
            <span style={{ fontSize: '10px', fontWeight: 500 }}>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
