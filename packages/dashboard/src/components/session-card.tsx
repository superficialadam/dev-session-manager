'use client'

import { Session } from '@/lib/sessions'
import Link from 'next/link'

const statusColors = {
  idle: 'bg-status-idle',
  working: 'bg-status-working',
  error: 'bg-status-error',
  stopped: 'bg-status-stopped',
  unknown: 'bg-status-stopped',
}

export function SessionCard({ session }: { session: Session }) {
  const status = session.tmux_exists ? session.agent_state : 'stopped'
  const isWorking = status === 'working'

  return (
    <Link 
      href={`/sessions/${session.name}`}
      className="flex items-center gap-4 bg-surface-1 border border-neutral-800 rounded-lg px-4 py-3 hover:border-neutral-600 hover:bg-surface-2 transition-all cursor-pointer"
    >
      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusColors[status]} ${isWorking ? 'animate-pulse' : ''}`} />
      
      <div className="flex-1 min-w-0">
        <div className="font-medium text-white truncate">{session.name}</div>
        <div className="text-xs text-neutral-500 truncate">
          {session.repo} · <span className="font-mono">{session.branch}</span>
        </div>
      </div>
      
      <div className="text-neutral-600 shrink-0">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  )
}
