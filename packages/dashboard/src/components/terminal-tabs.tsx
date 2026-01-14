'use client'

import { useState, useEffect } from 'react'

interface Props {
  sessionName: string
  tmuxExists?: boolean
  ttydPort?: number | null
}

const windows = [
  { id: 'agent', label: 'Agent', icon: '🤖' },
  { id: 'servers', label: 'Servers', icon: '⚡' },
  { id: 'nvim', label: 'Editor', icon: '📝' },
  { id: 'term', label: 'Terminal', icon: '>' },
]

export function TerminalTabs({ sessionName, tmuxExists = true, ttydPort }: Props) {
  const [active, setActive] = useState('agent')
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set(['agent']))
  const [ttydBaseUrl, setTtydBaseUrl] = useState<string | null>(null)

  useEffect(() => {
    // Build ttyd base URL using current hostname but with the session's ttyd port
    if (ttydPort && typeof window !== 'undefined') {
      const hostname = window.location.hostname
      setTtydBaseUrl(`http://${hostname}:${ttydPort}`)
    }
  }, [ttydPort])

  const handleTabClick = (tabId: string) => {
    setActive(tabId)
    // Lazy load: only load iframe when tab is first clicked
    if (!loadedTabs.has(tabId)) {
      setLoadedTabs(prev => {
        const next = new Set(prev)
        next.add(tabId)
        return next
      })
    }
  }

  const getTabUrl = (tabId: string) => ttydBaseUrl ? `${ttydBaseUrl}/?arg=${tabId}` : null
  const activeTabUrl = getTabUrl(active)

  return (
    <>
      <div className="flex border-b border-neutral-800">
        {windows.map(win => (
          <button
            key={win.id}
            onClick={() => handleTabClick(win.id)}
            className={`px-4 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${
              active === win.id
                ? 'text-white border-b-2 border-accent bg-surface-0'
                : 'text-neutral-500 hover:text-neutral-300 hover:bg-surface-2'
            }`}
            title={`Switch to ${win.label} window`}
          >
            <span>{win.icon}</span>
            {win.label}
          </button>
        ))}
        
        <div className="flex-1" />
        
        {activeTabUrl && (
          <a
            href={activeTabUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-3 text-xs text-neutral-500 hover:text-neutral-300 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open in new tab
          </a>
        )}
      </div>
      
      {/* Terminal view - separate iframe per tab, show/hide to preserve connections */}
      <div className="h-[500px] bg-surface-0 relative overflow-hidden">
        {tmuxExists && ttydBaseUrl ? (
          <>
            {windows.map(win => {
              const tabUrl = getTabUrl(win.id)
              const isLoaded = loadedTabs.has(win.id)
              const isActive = active === win.id
              
              if (!isLoaded || !tabUrl) return null
              
              return (
                <div
                  key={win.id}
                  className="absolute inset-0 w-full h-full"
                  style={{ 
                    visibility: isActive ? 'visible' : 'hidden',
                    pointerEvents: isActive ? 'auto' : 'none'
                  }}
                >
                  <iframe
                    src={tabUrl}
                    className="w-full h-full border-0"
                    title={`Terminal - ${sessionName} - ${win.label}`}
                  />
                </div>
              )
            })}
          </>
        ) : tmuxExists ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-3 p-6">
              <div className="w-10 h-10 mx-auto rounded-lg bg-surface-2 flex items-center justify-center">
                <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-neutral-400 mb-2">Connect to agent window</p>
                <code className="block px-3 py-2 bg-surface-2 rounded-lg text-xs text-accent">
                  dev-attach {sessionName}
                </code>
              </div>
              <p className="text-xs text-neutral-600">
                ttyd not available - start session with ttyd enabled
              </p>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-neutral-500">Session not running</p>
          </div>
        )}
      </div>
    </>
  )
}
