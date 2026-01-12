'use client'

import { addRepo } from '@/app/actions'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface GitHubRepo {
  name: string
  nameWithOwner: string
  description: string | null
  pushedAt: string
  isPrivate: boolean
  isFork: boolean
}

interface Props {
  githubRepos: GitHubRepo[]
  registeredRepos: string[]
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function GitHubRepoPicker({ githubRepos, registeredRepos }: Props) {
  const router = useRouter()
  const [adding, setAdding] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')

  const handleAdd = async (nameWithOwner: string) => {
    setAdding(nameWithOwner)
    setError('')

    const formData = new FormData()
    formData.set('name', nameWithOwner)

    const result = await addRepo(formData)

    if (result.success) {
      router.refresh()
    } else {
      setError(result.message)
    }
    
    setAdding(null)
  }

  const filteredRepos = githubRepos.filter(repo => 
    repo.nameWithOwner.toLowerCase().includes(filter.toLowerCase()) ||
    (repo.description?.toLowerCase().includes(filter.toLowerCase()))
  )

  if (githubRepos.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-neutral-400 mb-2">Could not fetch GitHub repos</p>
        <p className="text-sm text-neutral-500">
          Make sure <code className="bg-surface-2 px-1.5 py-0.5 rounded">gh</code> is installed and authenticated
        </p>
        <code className="block mt-4 text-sm bg-surface-2 px-4 py-2 rounded-lg">
          gh auth login
        </code>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter repositories..."
        className="w-full px-4 py-2.5 bg-surface-2 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-accent"
      />

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      {/* Repo list */}
      <div className="max-h-96 overflow-y-auto space-y-2">
        {filteredRepos.map((repo) => {
          const shortName = repo.name
          const isRegistered = registeredRepos.includes(shortName)
          const isAdding = adding === repo.nameWithOwner

          return (
            <div
              key={repo.nameWithOwner}
              className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                isRegistered 
                  ? 'bg-surface-2/50 opacity-60' 
                  : 'bg-surface-2 hover:bg-surface-3'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white truncate">
                    {repo.nameWithOwner}
                  </span>
                  {repo.isPrivate && (
                    <span className="text-xs text-neutral-500">🔒</span>
                  )}
                  {repo.isFork && (
                    <span className="text-xs text-neutral-500">⑂</span>
                  )}
                </div>
                {repo.description && (
                  <p className="text-sm text-neutral-500 truncate mt-0.5">
                    {repo.description}
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-3 ml-4">
                <span className="text-xs text-neutral-500 whitespace-nowrap">
                  {formatTimeAgo(repo.pushedAt)}
                </span>
                
                {isRegistered ? (
                  <span className="text-xs text-neutral-500 px-2 py-1">
                    Added
                  </span>
                ) : (
                  <button
                    onClick={() => handleAdd(repo.nameWithOwner)}
                    disabled={isAdding}
                    className="px-3 py-1.5 bg-accent hover:bg-accent-dim disabled:opacity-50 text-white text-xs font-medium rounded transition-colors whitespace-nowrap"
                  >
                    {isAdding ? 'Adding...' : 'Add'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
      
      <p className="text-xs text-neutral-500 text-center">
        Showing {filteredRepos.length} of {githubRepos.length} repos · Sorted by last activity
      </p>
    </div>
  )
}
