import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Dev Sessions',
  description: 'Remote development session manager',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-surface-0 text-neutral-200 min-h-screen">
        <nav className="border-b border-neutral-800 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-8">
              <a href="/" className="text-lg font-semibold text-white">
                dev<span className="text-accent">sessions</span>
              </a>
              <div className="flex gap-6 text-sm">
                <a href="/" className="text-neutral-400 hover:text-white transition-colors">
                  Sessions
                </a>
                <a href="/repos" className="text-neutral-400 hover:text-white transition-colors">
                  Repos
                </a>
                <a href="/new" className="text-neutral-400 hover:text-white transition-colors">
                  + New
                </a>
              </div>
            </div>
            <div className="text-xs text-neutral-500">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}
