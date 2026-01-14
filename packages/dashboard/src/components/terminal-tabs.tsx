'use client'

import { useState, useEffect } from 'react'

interface Props {
  sessionName: string
  tmuxExists?: boolean
  ttydPort?: number | null
  opencodePort?: number | null
}

const tabs = [
  { id: 'opencode', label: 'OpenCode', icon: '🤖' },
  { id: 'terminal', label: 'Terminal', icon: '>' },
]

export function TerminalTabs({ sessionName, tmuxExists = true, ttydPort, opencodePort }: Props) {
  const [active, setActive] = useState('opencode')
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set(['opencode']))
  const [ttydUrl, setTtydUrl] = useState<string | null>(null)
  const [opencodeUrl, setOpencodeUrl] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname
      if (ttydPort) {
        setTtydUrl(`http://${hostname}:${ttydPort}`)
      }
      if (opencodePort) {
        setOpencodeUrl(`http://${hostname}:${opencodePort}`)
      }
    }
  }, [ttydPort, opencodePort])

  const handleTabClick = (tabId: string) => {
    setActive(tabId)
    if (!loadedTabs.has(tabId)) {
      setLoadedTabs(prev => {
        const next = new Set(prev)
        next.add(tabId)
        return next
      })
    }
  }

  const getTabUrl = (tabId: string) => {
    if (tabId === 'opencode') return opencodeUrl
    if (tabId === 'terminal') return ttydUrl
    return null
  }

  const activeTabUrl = getTabUrl(active)

  return (
    <>
      <div className="flex border-b border-neutral-800">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`px-4 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${
              active === tab.id
                ? 'text-white border-b-2 border-accent bg-surface-0'
                : 'text-neutral-500 hover:text-neutral-300 hover:bg-surface-2'
            }`}
            title={`Switch to ${tab.label}`}
          >
            <span>{tab.icon}</span>
            {tab.label}
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
      
      {/* Tab content */}
      <div className="h-[500px] bg-surface-0 relative overflow-hidden">
        {tmuxExists ? (
          <>
            {tabs.map(tab => {
              const tabUrl = getTabUrl(tab.id)
              const isLoaded = loadedTabs.has(tab.id)
              const isActive = active === tab.id
              
              if (!isLoaded) return null
              
              // Show placeholder if URL not available
              if (!tabUrl) {
                if (!isActive) return null
                return (
                  <div key={tab.id} className="absolute inset-0 w-full h-full flex items-center justify-center">
                    <div className="text-center space-y-3 p-6">
                      <div className="w-10 h-10 mx-auto rounded-lg bg-surface-2 flex items-center justify-center">
                        <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <p className="text-sm text-neutral-400">
                        {tab.id === 'opencode' ? 'OpenCode server not available' : 'ttyd not available'}
                      </p>
                    </div>
                  </div>
                )
              }
              
              return (
                <div
                  key={tab.id}
                  className="absolute inset-0 w-full h-full"
                  style={{ 
                    visibility: isActive ? 'visible' : 'hidden',
                    pointerEvents: isActive ? 'auto' : 'none'
                  }}
                >
                  <iframe
                    src={tabUrl}
                    className="w-full h-full border-0"
                    title={`${tab.label} - ${sessionName}`}
                  />
                </div>
              )
            })}
          </>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-neutral-500">Session not running</p>
          </div>
        )}
      </div>
    </>
  )
}
