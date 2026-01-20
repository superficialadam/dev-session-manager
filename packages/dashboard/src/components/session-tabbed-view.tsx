'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { OpencodeSessionViewInline } from './opencode-session-view-inline'

interface Props {
  sessionName: string
  ttydPort: number | null
  opencodePort: number | null
  tmuxExists: boolean
}

export function SessionTabbedView({ sessionName, ttydPort, opencodePort, tmuxExists }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'agent' | 'terminal'>('agent')
  const [isRestarting, setIsRestarting] = useState(false)

  const handleRestartServices = async () => {
    if (!confirm('Restart dev services?')) return
    setIsRestarting(true)
    try {
      await fetch(`/api/sessions/${sessionName}/restart`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'services' })
      })
      router.refresh()
    } catch (e) {
      console.error('Failed to restart:', e)
    } finally {
      setIsRestarting(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      <header className="flex items-center justify-between px-4 py-2 bg-surface-1 border-b border-neutral-800 shrink-0">
        {/* Left: Back + Session name */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={() => router.push('/')}
            className="p-2 text-neutral-400 hover:text-white hover:bg-surface-2 rounded-lg transition-colors shrink-0"
            title="Back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-medium text-white truncate">{sessionName}</h1>
        </div>
        
        {/* Center: Tab selector */}
        <div className="flex bg-surface-2 rounded-lg p-0.5 shrink-0">
          <button
            onClick={() => setActiveTab('agent')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'agent' 
                ? 'bg-accent text-white' 
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Agent
          </button>
          <button
            onClick={() => setActiveTab('terminal')}
            disabled={!ttydPort}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'terminal' 
                ? 'bg-accent text-white' 
                : 'text-neutral-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            Terminal
          </button>
        </div>
        
        {/* Right: New Session + Restart Services */}
        <div className="flex items-center justify-end flex-1 gap-2">
          <button
            onClick={() => router.push('/new')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-neutral-400 hover:text-white hover:bg-surface-2 rounded-lg transition-colors"
            title="New session"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">New</span>
          </button>
          <button
            onClick={handleRestartServices}
            disabled={isRestarting || !tmuxExists}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-neutral-400 hover:text-white hover:bg-surface-2 rounded-lg transition-colors disabled:opacity-50"
            title="Restart dev services"
          >
            <svg className={`w-4 h-4 ${isRestarting ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">Restart</span>
          </button>
        </div>
      </header>
      
      <main className="flex-1 overflow-hidden">
        {activeTab === 'agent' ? (
          opencodePort ? (
            <div className="h-full">
              <OpencodeSessionViewInline sessionName={sessionName} opencodePort={opencodePort} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-neutral-500">
              <p>OpenCode not available for this session</p>
            </div>
          )
        ) : (
          ttydPort ? (
            <iframe
              src={`http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:${ttydPort}`}
              className="w-full h-full border-0"
              title="Terminal"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-neutral-500">
              <p>Terminal not available</p>
            </div>
          )
        )}
      </main>
    </div>
  )
}
