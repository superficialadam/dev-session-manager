'use client'

import { createSession } from '@/app/actions'
import { ReposMap } from '@/lib/sessions'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  repos: ReposMap
  branchesMap: Record<string, string[]>
}

export function NewSessionForm({ repos, branchesMap }: Props) {
  const router = useRouter()
  const repoNames = Object.keys(repos)
  
  const [selectedRepo, setSelectedRepo] = useState(repoNames[0] || '')
  const [branch, setBranch] = useState('')
  const [isNewBranch, setIsNewBranch] = useState(false)
  const [agent, setAgent] = useState<'opencode' | 'claude'>('opencode')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const branches = branchesMap[selectedRepo] || []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRepo || !branch.trim() || creating) return

    setCreating(true)
    setError('')

    const formData = new FormData()
    formData.set('repo', selectedRepo)
    formData.set('branch', branch.trim())
    formData.set('agent', agent)

    const result = await createSession(formData)

    if (result.success) {
      router.push('/')
    } else {
      setError(result.message)
      setCreating(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface-1 border border-neutral-800 rounded-xl p-6 space-y-6">
      {/* Repository */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-neutral-300">
          Repository
        </label>
        <select
          value={selectedRepo}
          onChange={(e) => {
            setSelectedRepo(e.target.value)
            setBranch('')
          }}
          className="w-full px-4 py-3 bg-surface-2 border border-neutral-700 rounded-lg text-sm text-white focus:outline-none focus:border-accent"
        >
          {repoNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {/* Branch */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-neutral-300">
            Branch
          </label>
          <button
            type="button"
            onClick={() => {
              setIsNewBranch(!isNewBranch)
              setBranch('')
            }}
            className="text-xs text-accent hover:underline"
          >
            {isNewBranch ? 'Select existing' : 'Create new'}
          </button>
        </div>
        
        {isNewBranch ? (
          <input
            type="text"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            placeholder="feature/my-feature"
            className="w-full px-4 py-3 bg-surface-2 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-accent"
          />
        ) : (
          <select
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="w-full px-4 py-3 bg-surface-2 border border-neutral-700 rounded-lg text-sm text-white focus:outline-none focus:border-accent"
          >
            <option value="">Select a branch...</option>
            {branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Agent */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-neutral-300">
          AI Agent
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setAgent('opencode')}
            className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              agent === 'opencode'
                ? 'bg-accent text-white'
                : 'bg-surface-2 text-neutral-400 hover:bg-surface-3'
            }`}
          >
            OpenCode
          </button>
          <button
            type="button"
            onClick={() => setAgent('claude')}
            className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              agent === 'claude'
                ? 'bg-accent text-white'
                : 'bg-surface-2 text-neutral-400 hover:bg-surface-3'
            }`}
          >
            Claude Code
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-400/10 border border-red-400/20 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!selectedRepo || !branch.trim() || creating}
        className="w-full px-4 py-3 bg-accent hover:bg-accent-dim disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {creating ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Creating...
          </>
        ) : (
          'Create Session'
        )}
      </button>
    </form>
  )
}
