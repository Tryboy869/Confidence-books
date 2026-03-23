import type { Metadata } from 'next'
import './globals.css'
import { AppProvider } from '@/lib/context'

export const metadata: Metadata = {
  title: 'Confidence Book',
  description: 'Un espace bienveillant pour partager ce que tu portes seul.',
  themeColor: '#111110',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" data-theme="dark" suppressHydrationWarning>
      <body>
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  )
}
