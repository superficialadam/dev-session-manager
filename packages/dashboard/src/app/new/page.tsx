import { getRepos, getRepoBranches } from '@/lib/sessions'
import { NewSessionForm } from '@/components/new-session-form'

export const dynamic = 'force-dynamic'

export default async function NewSessionPage() {
  const repos = await getRepos()
  const repoNames = Object.keys(repos)

  // Pre-fetch branches for all repos
  const branchesMap: Record<string, string[]> = {}
  for (const name of repoNames) {
    branchesMap[name] = await getRepoBranches(name)
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">New Session</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Create a new development session with a worktree and AI agent
        </p>
      </div>

      {repoNames.length === 0 ? (
        <div className="bg-surface-1 border border-neutral-800 rounded-xl p-8 text-center">
          <p className="text-neutral-400 mb-4">No repositories registered</p>
          <a 
            href="/repos" 
            className="text-accent hover:underline"
          >
            Add a repository first
          </a>
        </div>
      ) : (
        <NewSessionForm repos={repos} branchesMap={branchesMap} />
      )}
    </div>
  )
}
