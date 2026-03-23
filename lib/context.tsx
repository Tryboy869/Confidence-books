'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface AuthUser {
  userId: string
  avatar: string
  theme: 'dark' | 'light'
  token: string
}

interface AppContextType {
  user: AuthUser | null
  theme: 'dark' | 'light'
  setTheme: (t: 'dark' | 'light') => void
  login: (user: AuthUser) => void
  logout: () => void
  isLoading: boolean
  toast: (msg: string, duration?: number) => void
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [theme, setThemeState] = useState<'dark' | 'light'>('dark')
  const [isLoading, setIsLoading] = useState(true)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('cb_user')
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as AuthUser
        setUser(parsed)
        setThemeState(parsed.theme || 'dark')
        document.documentElement.setAttribute('data-theme', parsed.theme || 'dark')
      } catch {}
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const login = (u: AuthUser) => {
    setUser(u)
    setThemeState(u.theme || 'dark')
    localStorage.setItem('cb_user', JSON.stringify(u))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('cb_user')
  }

  const setTheme = (t: 'dark' | 'light') => {
    setThemeState(t)
    if (user) {
      const updated = { ...user, theme: t }
      setUser(updated)
      localStorage.setItem('cb_user', JSON.stringify(updated))
    }
  }

  const toast = (msg: string, duration = 2500) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), duration)
  }

  return (
    <AppContext.Provider value={{ user, theme, setTheme, login, logout, isLoading, toast }}>
      {children}
      {toastMsg && <div className="toast">{toastMsg}</div>}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be inside AppProvider')
  return ctx
}
