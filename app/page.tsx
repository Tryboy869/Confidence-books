'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/lib/context'

type Step = 'landing' | 'register' | 'login' | 'created'

export default function AuthPage() {
  const router = useRouter()
  const { user, login, toast, isLoading } = useApp()
  const [step, setStep] = useState<Step>('landing')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [loginId, setLoginId] = useState('')
  const [loginPwd, setLoginPwd] = useState('')
  const [loading, setLoading] = useState(false)
  const [createdId, setCreatedId] = useState('')
  const [copied, setCopied] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  useEffect(() => {
    if (!isLoading && user) router.replace('/feed')
  }, [user, isLoading, router])

  async function handleRegister() {
    if (password.length < 6) return toast('Mot de passe trop court (min 6 caractères)')
    if (password !== password2) return toast('Les mots de passe ne correspondent pas')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })
      const data = await res.json()
      if (!data.success) return toast(data.error || 'Erreur')
      setCreatedId(data.userId)
      login({ userId: data.userId, avatar: data.avatar, theme: 'dark', token: data.token })
      setStep('created')
    } catch { toast('Erreur de connexion') }
    finally { setLoading(false) }
  }

  async function handleLogin() {
    if (!loginId.trim() || !loginPwd) return toast('Remplis tous les champs')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: loginId.trim(), password: loginPwd })
      })
      const data = await res.json()
      if (!data.success) return toast(data.error || 'Identifiants incorrects')
      login({ userId: data.userId, avatar: data.avatar, theme: data.theme || 'dark', token: data.token })
      router.push('/feed')
    } catch { toast('Erreur de connexion') }
    finally { setLoading(false) }
  }

  function copyId() {
    navigator.clipboard.writeText(createdId)
    setCopied(true)
    toast('Identifiant copié !')
    setTimeout(() => setCopied(false), 2000)
  }

  if (isLoading) return null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>

      {step === 'landing' && (
        <div className="fade-up" style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
          <div style={{ fontSize: '44px', marginBottom: '12px' }}>📖</div>
          <h1 style={{ fontSize: '26px', marginBottom: '8px', color: 'var(--text-primary)' }}>Confidence Book</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: 1.6, marginBottom: '32px' }}>
            Un espace pour poser ce que tu portes seul.<br/>Anonyme. Bienveillant. Éphémère.
          </p>
          <div className="card" style={{ padding: '20px', marginBottom: '20px', textAlign: 'left' }}>
            {[
              { e: '🔒', t: '100% anonyme', d: 'Un identifiant UUID + mot de passe. Zéro donnée personnelle.' },
              { e: '🌱', t: 'Éphémère par nature', d: 'Tes publications disparaissent après 14 jours automatiquement.' },
              { e: '🤝', t: 'Communauté bienveillante', d: 'Des gens qui écoutent sans juger, moderé par IA.' },
            ].map(item => (
              <div key={item.t} style={{ display: 'flex', gap: '12px', marginBottom: '14px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '18px', flexShrink: 0 }}>{item.e}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '2px' }}>{item.t}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.d}</div>
                </div>
              </div>
            ))}
          </div>
          <button className="btn-primary" style={{ width: '100%', marginBottom: '10px', padding: '14px', fontSize: '15px' }} onClick={() => setStep('register')}>
            Créer mon espace →
          </button>
          <button className="btn-ghost" style={{ width: '100%' }} onClick={() => setStep('login')}>
            J&apos;ai déjà un compte
          </button>
          <p style={{ marginTop: '20px', fontSize: '11px', color: 'var(--text-muted)' }}>
            🆘 Crise : <a href="tel:3114" style={{ color: 'var(--accent)' }}>3114</a> (FR) · <a href="tel:18334564566" style={{ color: 'var(--accent)' }}>1-833-456-4566</a> (CA)
          </p>
        </div>
      )}

      {step === 'register' && (
        <div className="fade-up" style={{ width: '100%', maxWidth: '400px' }}>
          <button onClick={() => setStep('landing')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
            ← Retour
          </button>
          <h2 style={{ fontSize: '22px', marginBottom: '6px' }}>Créer mon espace</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '24px' }}>
            Un UUID unique sera généré automatiquement comme identifiant.
          </p>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>MOT DE PASSE</label>
            <div style={{ position: 'relative' }}>
              <input className="input" type={showPwd ? 'text' : 'password'} placeholder="Min. 6 caractères" value={password} onChange={e => setPassword(e.target.value)} />
              <button onClick={() => setShowPwd(!showPwd)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                {showPwd ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>CONFIRME</label>
            <input className="input" type={showPwd ? 'text' : 'password'} placeholder="Répète ton mot de passe" value={password2} onChange={e => setPassword2(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRegister()} />
          </div>
          <button className="btn-primary" style={{ width: '100%', padding: '14px' }} onClick={handleRegister} disabled={loading}>
            {loading ? 'Création...' : 'Créer mon espace'}
          </button>
        </div>
      )}

      {step === 'created' && (
        <div className="fade-up" style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '44px', marginBottom: '10px' }}>🎉</div>
            <h2 style={{ fontSize: '22px', marginBottom: '6px' }}>Ton espace est prêt !</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Sauvegarde ton identifiant — seul moyen de retrouver ton compte.</p>
          </div>
          <div className="card" style={{ padding: '16px', marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ton identifiant unique</div>
            <div style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-primary)', background: 'var(--bg-subtle)', padding: '10px 12px', borderRadius: '8px', wordBreak: 'break-all', marginBottom: '10px', lineHeight: 1.6 }}>
              {createdId}
            </div>
            <button className="btn-ghost" style={{ width: '100%' }} onClick={copyId}>
              {copied ? '✅ Copié !' : '📋 Copier l\'identifiant'}
            </button>
          </div>
          <div className="warning-banner" style={{ marginBottom: '20px' }}>
            ⚠️ Sans cet UUID + ton mot de passe, ton compte est définitivement inaccessible.
          </div>
          <button className="btn-primary" style={{ width: '100%', padding: '14px' }} onClick={() => router.push('/feed')}>
            Accéder à l&apos;application →
          </button>
        </div>
      )}

      {step === 'login' && (
        <div className="fade-up" style={{ width: '100%', maxWidth: '400px' }}>
          <button onClick={() => setStep('landing')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
            ← Retour
          </button>
          <h2 style={{ fontSize: '22px', marginBottom: '6px' }}>Connexion</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '24px' }}>
            Entre ton identifiant UUID et ton mot de passe.
          </p>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>IDENTIFIANT UUID</label>
            <input className="input" type="text" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value={loginId} onChange={e => setLoginId(e.target.value)} style={{ fontFamily: 'monospace', fontSize: '13px' }} />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>MOT DE PASSE</label>
            <input className="input" type="password" placeholder="Ton mot de passe" value={loginPwd} onChange={e => setLoginPwd(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          </div>
          <button className="btn-primary" style={{ width: '100%', padding: '14px' }} onClick={handleLogin} disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </div>
      )}
    </div>
  )
}
