import { getRepos, getGitHubRepos, getGitHubOrgs } from '@/lib/sessions'
import { GitHubPicker } from '@/components/github-picker'
import { RepoCard } from '@/components/repo-card'

export const dynamic = 'force-dynamic'

export default async function ReposPage() {
  const repos = await getRepos()
  const repoEntries = Object.entries(repos)
  
  // Fetch GitHub data
  const [githubRepos, orgs] = await Promise.all([
    getGitHubRepos(),
    getGitHubOrgs()
  ])
  
  // Filter out already registered repos
  const registeredNames = new Set(Object.values(repos).map(r => r.name_with_owner).filter(Boolean))
  const availableRepos = githubRepos.filter(r => !registeredNames.has(r.nameWithOwner))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Repositories</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Manage registered git repositories
        </p>
      </div>

      {/* GitHub Picker */}
      <div className="bg-surface-1 border border-neutral-800 rounded-xl p-6">
        <h2 className="text-sm font-medium text-neutral-400 mb-4">Add from GitHub</h2>
        <GitHubPicker repos={availableRepos} orgs={orgs} />
      </div>

      {/* Registered repos */}
      <div className="space-y-4">
        <h2 className="text-sm font-medium text-neutral-400">
          Registered ({repoEntries.length})
        </h2>
        
        {repoEntries.length === 0 ? (
          <div className="bg-surface-1 border border-neutral-800 rounded-xl p-8 text-center">
            <p className="text-neutral-500">No repositories registered yet</p>
            <p className="text-sm text-neutral-600 mt-1">Pick one from GitHub above</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {repoEntries.map(([name, repo]) => (
              <RepoCard key={name} name={name} repo={repo} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
