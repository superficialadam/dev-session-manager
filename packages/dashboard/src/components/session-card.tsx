'use client'

import { Session } from '@/lib/sessions'
import { deleteSession } from '@/app/actions'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

const statusColors = {
  idle: 'bg-status-idle',
  working: 'bg-status-working',
  error: 'bg-status-error',
  stopped: 'bg-status-stopped',
  unknown: 'bg-status-stopped',
}

export function SessionCard({ session }: { session: Session }) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [opencodeUrl, setOpencodeUrl] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && session.opencode_port && session.worktree) {
      const hostname = window.location.hostname
      const encoded = btoa(session.worktree)
      setOpencodeUrl(`http://${hostname}:${session.opencode_port}/${encoded}`)
    }
  }, [session.opencode_port, session.worktree])
  
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
    <div className="flex items-center gap-4 bg-surface-1 border border-neutral-800 rounded-lg px-4 py-3 hover:border-neutral-700 transition-all group">
      <div className={`w-2 h-2 rounded-full ${statusColors[status]} ${isWorking ? 'status-working' : ''}`} />
      
      <a 
        href={`/sessions/${session.name}`}
        className="font-medium text-white hover:text-accent transition-colors flex-1"
      >
        {session.name}
      </a>
      
      <span className="text-sm text-neutral-500 hidden md:inline">{session.repo}</span>
      <span className="text-sm text-neutral-600 font-mono hidden lg:inline">{session.branch}</span>
      
      {session.opencode_port ? (
        <a
          href={`/sessions/${session.name}/opencode`}
          className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-accent transition-colors"
          title="View OpenCode sessions"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="hidden sm:inline">Sessions</span>
        </a>
      ) : (
        <span className="text-sm text-neutral-600">—</span>
      )}

      {opencodeUrl && (
        <a
          href={opencodeUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-accent transition-colors"
          title="Open OpenCode Web UI"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          <span className="hidden sm:inline">Web</span>
        </a>
      )}
      
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
  )
}
