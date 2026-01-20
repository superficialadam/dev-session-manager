import { getSessions, Session } from '@/lib/sessions'
import { SessionCard } from '@/components/session-card'
import { RefreshButton } from '@/components/refresh-button'
import { MasterAgentFoldout } from '@/components/master-agent-foldout'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function HomePage() {
  const sessions = await getSessions()
  
  const activeSessions = sessions.filter(s => s.tmux_exists)
  const stoppedSessions = sessions.filter(s => !s.tmux_exists)

  return (
    <div className="space-y-6">
      <MasterAgentFoldout />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Sessions</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {activeSessions.length} active · {stoppedSessions.length} stopped
          </p>
        </div>
        <div className="flex gap-3">
          <RefreshButton />
          <a 
            href="/new" 
            className="px-4 py-2 bg-accent hover:bg-accent-dim text-white text-sm font-medium rounded-lg transition-colors"
          >
            New Session
          </a>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-16 text-neutral-500">
          <p className="text-lg">No sessions yet</p>
          <p className="text-sm mt-2">Create one to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <SessionCard key={session.name} session={session} />
          ))}
        </div>
      )}
    </div>
  )
}
