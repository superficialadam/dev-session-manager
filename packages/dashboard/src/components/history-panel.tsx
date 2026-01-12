'use client'

interface HistoryEntry {
  ts: string
  type: 'prompt' | 'response'
  content: string
}

interface Props {
  history: HistoryEntry[]
}

export function HistoryPanel({ history }: Props) {
  if (history.length === 0) {
    return (
      <p className="text-sm text-neutral-500 text-center py-8">
        No history yet
      </p>
    )
  }

  return (
    <div className="space-y-4 max-h-96 overflow-y-auto">
      {history.slice().reverse().map((entry, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span className={entry.type === 'prompt' ? 'text-accent' : 'text-status-idle'}>
              {entry.type === 'prompt' ? '→' : '←'}
            </span>
            <span>{new Date(entry.ts).toLocaleTimeString()}</span>
          </div>
          <p className="text-sm text-neutral-300 line-clamp-3 pl-4">
            {entry.content.slice(0, 200)}
            {entry.content.length > 200 && '...'}
          </p>
        </div>
      ))}
    </div>
  )
}
