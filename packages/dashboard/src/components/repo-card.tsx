'use client'

import { Repo } from '@/lib/sessions'
import Link from 'next/link'

interface Props {
  name: string
  repo: Repo
}

export function RepoCard({ name, repo }: Props) {
  return (
    <div className="bg-surface-1 border border-neutral-800 rounded-xl p-5 hover:border-neutral-700 transition-colors group">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-medium text-white group-hover:text-accent transition-colors">
            {name}
          </h3>
          <p className="text-sm text-neutral-500 mt-0.5 truncate max-w-[200px]">
            {repo.github || repo.url}
          </p>
        </div>
        
        <Link 
          href={`/new?repo=${name}`}
          className="px-3 py-1.5 bg-surface-2 hover:bg-surface-3 text-white text-xs font-medium rounded transition-colors"
        >
          New Session
        </Link>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-neutral-400 bg-surface-2/50 px-3 py-2 rounded-lg">
          <span>Branch</span>
          <span className="font-mono text-neutral-300">{repo.default_branch}</span>
        </div>
        
        <div className="flex items-center justify-between text-xs text-neutral-400 bg-surface-2/50 px-3 py-2 rounded-lg">
          <span>Servers</span>
          <span className="font-mono text-neutral-300">
            {repo.dev_servers?.length || 0}
          </span>
        </div>
      </div>
      
      <div className="mt-4 flex gap-2">
        <button 
          className="text-xs text-neutral-500 hover:text-red-400 transition-colors"
          onClick={async () => {
             // TODO: Add delete functionality
             if (confirm('Are you sure you want to unregister this repo?')) {
               // Call server action to remove
             }
          }}
        >
          Unregister
        </button>
      </div>
    </div>
  )
}
