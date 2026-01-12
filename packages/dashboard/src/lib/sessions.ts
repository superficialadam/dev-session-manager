import { exec } from 'child_process'
import { promisify } from 'util'
import { readFile } from 'fs/promises'
import path from 'path'

const execAsync = promisify(exec)

const DEV_DIR = process.env.DEV_DIR || `${process.env.HOME}/dev`
const SCRIPTS_DIR = `${DEV_DIR}/scripts`
const SESSIONS_DIR = `${DEV_DIR}/sessions`
const REPOS_FILE = `${DEV_DIR}/repos.json`

export interface Session {
  name: string
  repo: string
  branch: string
  worktree: string
  agent: string
  tmux_session: string
  ttyd_port: number | null
  ttyd_pid: number | null
  created_at: string
  status: string
  last_activity: string
  tmux_exists: boolean
  attached: boolean
  agent_state: 'idle' | 'working' | 'error' | 'stopped' | 'unknown'
}

export interface Repo {
  url: string
  path: string
  default_branch: string
  github?: string
  dev_servers: Array<{
    name: string
    cmd: string
  }>
}

export interface ReposMap {
  [name: string]: Repo
}

async function runScript(script: string, args: string[] = []): Promise<string> {
  const cmd = `${SCRIPTS_DIR}/${script} ${args.map(a => `"${a}"`).join(' ')}`
  try {
    const { stdout } = await execAsync(cmd, { 
      env: { ...process.env, DEV_DIR },
      timeout: 60000 
    })
    return stdout.trim()
  } catch (error: any) {
    console.error(`Script error (${script}):`, error.message)
    throw error
  }
}

export async function getSessions(): Promise<Session[]> {
  try {
    const output = await runScript('dev-list', ['--json'])
    return JSON.parse(output)
  } catch {
    return []
  }
}

export async function getSession(name: string): Promise<Session | null> {
  const sessions = await getSessions()
  return sessions.find(s => s.name === name) || null
}

export async function getRepos(): Promise<ReposMap> {
  try {
    const content = await readFile(REPOS_FILE, 'utf-8')
    return JSON.parse(content)
  } catch {
    return {}
  }
}

export async function getRepoBranches(repoName: string): Promise<string[]> {
  try {
    const output = await runScript('dev-repo', ['branches', repoName, '--json'])
    return JSON.parse(output)
  } catch {
    return []
  }
}

export async function getGitHubRepos(org?: string): Promise<any[]> {
  try {
    const args = ['github', '--json']
    if (org) args.push('--org', org)
    const output = await runScript('dev-repo', args)
    return JSON.parse(output)
  } catch {
    return []
  }
}

export async function createSession(
  repo: string, 
  branch: string, 
  agent: string = 'opencode'
): Promise<{ success: boolean; message: string }> {
  try {
    await runScript('dev-new', [repo, branch, '--agent', agent])
    return { success: true, message: 'Session created' }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function deleteSession(
  name: string, 
  keepBranch: boolean = false
): Promise<{ success: boolean; message: string }> {
  try {
    const args = [name, '--force']
    if (keepBranch) args.push('--keep-branch')
    await runScript('dev-delete', args)
    return { success: true, message: 'Session deleted' }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function sendPrompt(
  sessionName: string, 
  prompt: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Escape the prompt for shell
    const escapedPrompt = prompt.replace(/'/g, "'\\''")
    await runScript('dev-send', [sessionName, escapedPrompt])
    return { success: true, message: 'Prompt sent' }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}

export async function getSessionHistory(sessionName: string): Promise<any[]> {
  try {
    const historyFile = path.join(SESSIONS_DIR, sessionName, 'history.jsonl')
    const content = await readFile(historyFile, 'utf-8')
    return content
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line))
  } catch {
    return []
  }
}

export async function addRepo(
  nameOrFullName: string
): Promise<{ success: boolean; message: string }> {
  try {
    await runScript('dev-repo', ['add', nameOrFullName])
    return { success: true, message: 'Repo added' }
  } catch (error: any) {
    return { success: false, message: error.message }
  }
}
