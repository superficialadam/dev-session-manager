'use client'

import { Session } from '@/lib/sessions'
import { deleteSession } from '@/app/actions'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const statusColors = {
  idle: 'bg-status-idle',
  working: 'bg-status-working',
  error: 'bg-status-error',
  stopped: 'bg-status-stopped',
  unknown: 'bg-status-stopped',
}

const statusLabels = {
  idle: 'Idle',
  working: 'Working',
  error: 'Error',
  stopped: 'Stopped',
  unknown: 'Unknown',
}

export function SessionCard({ session }: { session: Session }) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  
  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!confirm(`Delete session "${session.name}"?`)) return
    
    setIsDeleting(true)
    await deleteSession(session.name)
    router.refresh()
  }

  const status = session.tmux_exists ? session.agent_state : 'stopped'
  const isWorking = status === 'working'

  return (
    <a 
      href={`/sessions/${session.name}`}
      className="block bg-surface-1 border border-neutral-800 rounded-xl p-5 hover:border-neutral-700 transition-all group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-3 h-3 rounded-full ${statusColors[status]} ${isWorking ? 'status-working' : ''}`} />
          </div>
          <div>
            <h3 className="font-medium text-white group-hover:text-accent transition-colors">
              {session.name}
            </h3>
            <p className="text-xs text-neutral-500">{statusLabels[status]}</p>
          </div>
        </div>
        
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="opacity-0 group-hover:opacity-100 p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-all"
          title="Delete session"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-neutral-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span>{session.repo}</span>
        </div>
        
        <div className="flex items-center gap-2 text-neutral-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="truncate">{session.branch}</span>
        </div>
        
        <div className="flex items-center gap-2 text-neutral-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span>{session.agent}</span>
        </div>
      </div>
      
      {session.attached && (
        <div className="mt-4 pt-3 border-t border-neutral-800">
          <span className="text-xs text-accent">● Attached</span>
        </div>
      )}
    </a>
  )
}
