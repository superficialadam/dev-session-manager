#!/usr/bin/env node

/**
 * Agent Monitor Service
 * 
 * Polls OpenCode session status and sends ntfy notifications
 * when agents finish working.
 */

const { execSync, spawn } = require('child_process')

const NTFY_SERVER = process.env.NTFY_SERVER || 'http://localhost:8090'
const NTFY_TOPIC = process.env.NTFY_TOPIC || 'dev-sessions'
const OPENCODE_HOST = process.env.OPENCODE_HOST || '100.119.128.1'
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || '3000', 10)

// Track busy state per dev-session: { sessionName: { busy: boolean, sessionId: string } }
const sessionStates = new Map()

function encodeWorktree(worktree) {
  return Buffer.from(worktree).toString('base64').replace(/=+$/, '')
}

function buildOpencodeWebUrl(port, worktree, sessionId) {
  const encodedWorktree = encodeWorktree(worktree)
  return `http://${OPENCODE_HOST}:${port}/${encodedWorktree}/session/${sessionId}`
}

async function sendNotification(title, message, tags, click) {
  try {
    const headers = {
      'Title': title,
      'Tags': tags.join(','),
    }
    if (click) {
      headers['Click'] = click
    }

    const response = await fetch(`${NTFY_SERVER}/${NTFY_TOPIC}`, {
      method: 'POST',
      headers,
      body: message,
    })

    if (response.ok) {
      console.log(`[ntfy] Sent: ${title} - ${message}`)
    } else {
      console.error(`[ntfy] Failed: ${response.status}`)
    }
  } catch (error) {
    console.error('[ntfy] Error:', error.message)
  }
}

function getSessions() {
  try {
    const output = execSync('dev-list --json 2>/dev/null', { encoding: 'utf-8' })
    return JSON.parse(output)
  } catch {
    return []
  }
}

async function getSessionState(port) {
  try {
    const response = await fetch(`http://localhost:${port}/session/status`, {
      signal: AbortSignal.timeout(3000),
    })
    if (!response.ok) return null
    const statuses = await response.json()
    
    // Find any busy session and track the session ID
    for (const [id, status] of Object.entries(statuses)) {
      if (status.type === 'busy') {
        return { busy: true, sessionId: id }
      }
    }
    
    // Not busy - get the most recent session ID for the link
    const sessionsResp = await fetch(`http://localhost:${port}/session?limit=1`, {
      signal: AbortSignal.timeout(3000),
    })
    if (sessionsResp.ok) {
      const sessions = await sessionsResp.json()
      if (sessions.length > 0) {
        return { busy: false, sessionId: sessions[0].id }
      }
    }
    
    return { busy: false, sessionId: null }
  } catch {
    return null
  }
}

async function checkSessions() {
  const sessions = getSessions()
  
  for (const session of sessions) {
    if (!session.opencode_port || !session.tmux_exists) continue
    
    const state = await getSessionState(session.opencode_port)
    if (state === null) continue // Skip if can't connect
    
    const prevState = sessionStates.get(session.name) || { busy: false }
    
    if (prevState.busy && !state.busy) {
      // Agent just finished - build OpenCode web UI link
      const sessionId = state.sessionId || prevState.sessionId
      const clickUrl = sessionId && session.worktree
        ? buildOpencodeWebUrl(session.opencode_port, session.worktree, sessionId)
        : null
      
      console.log(`[monitor] ${session.name} finished!`)
      await sendNotification(
        'Agent Complete',
        `${session.name} finished working`,
        ['white_check_mark', 'robot'],
        clickUrl
      )
    } else if (!prevState.busy && state.busy) {
      console.log(`[monitor] ${session.name} started working`)
    }
    
    sessionStates.set(session.name, state)
  }
}

async function main() {
  console.log('[agent-monitor] Starting...')
  console.log(`[agent-monitor] NTFY: ${NTFY_SERVER}/${NTFY_TOPIC}`)
  console.log(`[agent-monitor] OpenCode Host: ${OPENCODE_HOST}`)
  console.log(`[agent-monitor] Poll interval: ${POLL_INTERVAL}ms`)
  
  // Initial check - populate states
  const sessions = getSessions()
  for (const session of sessions) {
    if (!session.opencode_port || !session.tmux_exists) continue
    const state = await getSessionState(session.opencode_port)
    if (state !== null) {
      sessionStates.set(session.name, state)
      console.log(`[monitor] Initial: ${session.name} = ${state.busy ? 'busy' : 'idle'}`)
    }
  }
  
  console.log(`[agent-monitor] Tracking ${sessionStates.size} session(s)`)
  
  // Start polling
  setInterval(checkSessions, POLL_INTERVAL)
  
  // Send startup notification
  await sendNotification(
    'Monitor Started',
    `Watching ${sessionStates.size} session(s)`,
    ['eyes'],
    null
  )
}

main().catch(console.error)
