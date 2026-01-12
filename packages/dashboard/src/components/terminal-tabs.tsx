'use client'

import { useState } from 'react'

interface Props {
  sessionName: string
  tmuxExists?: boolean
}

const windows = [
  { id: 'agent', label: 'Agent', icon: '🤖' },
  { id: 'servers', label: 'Servers', icon: '⚡' },
  { id: 'nvim', label: 'Editor', icon: '📝' },
  { id: 'term', label: 'Terminal', icon: '>' },
]

export function TerminalTabs({ sessionName, tmuxExists = true }: Props) {
  const [active, setActive] = useState('agent')

  return (
    <>
      <div className="flex border-b border-neutral-800">
        {windows.map(win => (
          <button
            key={win.id}
            onClick={() => setActive(win.id)}
            className={`px-4 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${
              active === win.id
                ? 'text-white border-b-2 border-accent bg-surface-0'
                : 'text-neutral-500 hover:text-neutral-300 hover:bg-surface-2'
            }`}
          >
            <span>{win.icon}</span>
            {win.label}
          </button>
        ))}
        
        <div className="flex-1" />
        
        <div className="px-4 py-3 text-xs text-neutral-600 font-mono">
          dev-attach {sessionName} -w {active}
        </div>
      </div>
      
      {/* Terminal placeholder - will be ttyd iframe when running on server */}
      <div className="h-80 bg-surface-0 flex items-center justify-center">
        {tmuxExists ? (
          <div className="text-center space-y-3 p-6">
            <div className="w-10 h-10 mx-auto rounded-lg bg-surface-2 flex items-center justify-center">
              <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-neutral-400 mb-2">Connect to <span className="text-white">{active}</span> window</p>
              <code className="block px-3 py-2 bg-surface-2 rounded-lg text-xs text-accent">
                dev-attach {sessionName} -w {active}
              </code>
            </div>
            <p className="text-xs text-neutral-600">
              ttyd web terminal available when running on server with ttyd-router
            </p>
          </div>
        ) : (
          <div className="text-center p-6">
            <p className="text-neutral-500">Session not running</p>
          </div>
        )}
      </div>
    </>
  )
}
