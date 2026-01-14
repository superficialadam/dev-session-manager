import { getSession, getSessionHistory } from '@/lib/sessions'
import { notFound } from 'next/navigation'
import { PromptForm } from '@/components/prompt-form'
import { HistoryPanel } from '@/components/history-panel'
import { TerminalTabs } from '@/components/terminal-tabs'
import { RefreshButton } from '@/components/refresh-button'
import { DeleteSessionButton } from '@/components/delete-session-button'
import { RestartSessionButton } from '@/components/restart-session-button'
import { ConnectString } from '@/components/connect-string'

export const dynamic = 'force-dynamic'

interface Props {
  params: { name: string }
}

const statusColors: Record<string, string> = {
  idle: 'bg-status-idle',
  working: 'bg-status-working',
  error: 'bg-status-error',
  stopped: 'bg-status-stopped',
  unknown: 'bg-status-stopped',
}

const statusLabels: Record<string, string> = {
  idle: 'Idle — ready for prompt',
  working: 'Working...',
  error: 'Error',
  stopped: 'Session stopped',
  unknown: 'Unknown',
}

export default async function SessionPage({ params }: Props) {
  const session = await getSession(params.name)
  
  if (!session) {
    notFound()
  }

  const history = await getSessionHistory(params.name)
  const status = session.tmux_exists ? session.agent_state : 'stopped'
  const isWorking = status === 'working'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className={`relative w-3 h-3 rounded-full ${statusColors[status]} ${isWorking ? 'animate-pulse' : ''}`} />
            <h1 className="text-2xl font-semibold text-white">{session.name}</h1>
          </div>
          <div className="flex items-center gap-4 text-sm text-neutral-400">
            <span>{session.repo}</span>
            <span className="text-neutral-600">→</span>
            <span className="font-mono">{session.branch}</span>
            <span className="text-neutral-600">·</span>
            <span>{session.agent}</span>
          </div>
          <p className="text-xs text-neutral-500 mt-2">{statusLabels[status]}</p>
        </div>
        
        <div className="flex gap-2">
          <RestartSessionButton sessionName={session.name} disabled={!session.tmux_exists} />
          <RefreshButton />
          <DeleteSessionButton sessionName={session.name} />
        </div>
      </div>

      {/* Main content - Terminal + Sidebar */}
      <div className="grid lg:grid-cols-4 gap-6">
        {/* Terminal area */}
        <div className="lg:col-span-3 space-y-4">
          {/* Terminal with tabs */}
          <div className="bg-surface-1 border border-neutral-800 rounded-xl overflow-hidden">
            <TerminalTabs 
              sessionName={session.name} 
              tmuxExists={session.tmux_exists}
              ttydPort={session.ttyd_port}
              opencodePort={session.opencode_port}
            />
          </div>
          
          {/* Quick prompt */}
          <div className="bg-surface-1 border border-neutral-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-sm text-neutral-400">Quick Prompt</span>
              <span className="text-xs text-neutral-600">— sends via tmux to agent</span>
            </div>
            <PromptForm sessionName={session.name} disabled={!session.tmux_exists || status === 'working'} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Session info */}
          <div className="bg-surface-1 border border-neutral-800 rounded-xl p-4">
            <h2 className="text-sm font-medium text-neutral-400 mb-3">Session Info</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-neutral-500">Created</dt>
                <dd className="text-white">{new Date(session.created_at).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Last Activity</dt>
                <dd className="text-white">{new Date(session.last_activity).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Worktree</dt>
                <dd className="text-white font-mono text-xs break-all">{session.worktree}</dd>
              </div>
            </dl>
          </div>
          
          {/* History */}
          <div className="bg-surface-1 border border-neutral-800 rounded-xl p-4">
            <h2 className="text-sm font-medium text-neutral-400 mb-3">
              History
              <span className="text-neutral-600 font-normal ml-2">({history.length})</span>
            </h2>
            <HistoryPanel history={history} />
          </div>

          {/* Remote Connect */}
          {(session.opencode_port || session.nvim_port) && (
            <ConnectString 
              opencodePort={session.opencode_port} 
              nvimPort={session.nvim_port} 
            />
          )}

          {/* Terminal commands */}
          <div className="bg-surface-1 border border-neutral-800 rounded-xl p-4">
            <h2 className="text-sm font-medium text-neutral-400 mb-3">Terminal Access</h2>
            <div className="space-y-2 text-xs">
              <div>
                <p className="text-neutral-500 mb-1">Attach to session:</p>
                <code className="block bg-surface-2 px-2 py-1.5 rounded text-neutral-300">
                  dev-attach {session.name}
                </code>
              </div>
              <div>
                <p className="text-neutral-500 mb-1">Send prompt:</p>
                <code className="block bg-surface-2 px-2 py-1.5 rounded text-neutral-300">
                  dev-send {session.name} "..."
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
