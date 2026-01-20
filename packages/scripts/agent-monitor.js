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
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://100.119.128.1:3333'
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || '3000', 10)

// Track busy state per dev-session: { sessionName: boolean }
const busyStates = new Map()

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

async function getSessionBusy(port) {
  try {
    const response = await fetch(`http://localhost:${port}/session/status`, {
      signal: AbortSignal.timeout(3000),
    })
    if (!response.ok) return null
    const statuses = await response.json()
    
    // Check if ANY session is busy
    for (const [id, status] of Object.entries(statuses)) {
      if (status.type === 'busy') {
        return true
      }
    }
    return false
  } catch {
    return null
  }
}

async function checkSessions() {
  const sessions = getSessions()
  
  for (const session of sessions) {
    if (!session.opencode_port || !session.tmux_exists) continue
    
    const isBusy = await getSessionBusy(session.opencode_port)
    if (isBusy === null) continue // Skip if can't connect
    
    const wasBusy = busyStates.get(session.name) || false
    
    if (wasBusy && !isBusy) {
      // Agent just finished
      console.log(`[monitor] ${session.name} finished!`)
      await sendNotification(
        'Agent Complete',
        `${session.name} finished working`,
        ['white_check_mark', 'robot'],
        `${DASHBOARD_URL}/sessions/${session.name}`
      )
    } else if (!wasBusy && isBusy) {
      console.log(`[monitor] ${session.name} started working`)
    }
    
    busyStates.set(session.name, isBusy)
  }
}

async function main() {
  console.log('[agent-monitor] Starting...')
  console.log(`[agent-monitor] NTFY: ${NTFY_SERVER}/${NTFY_TOPIC}`)
  console.log(`[agent-monitor] Dashboard: ${DASHBOARD_URL}`)
  console.log(`[agent-monitor] Poll interval: ${POLL_INTERVAL}ms`)
  
  // Initial check - populate states
  const sessions = getSessions()
  for (const session of sessions) {
    if (!session.opencode_port || !session.tmux_exists) continue
    const isBusy = await getSessionBusy(session.opencode_port)
    if (isBusy !== null) {
      busyStates.set(session.name, isBusy)
      console.log(`[monitor] Initial: ${session.name} = ${isBusy ? 'busy' : 'idle'}`)
    }
  }
  
  console.log(`[agent-monitor] Tracking ${busyStates.size} session(s)`)
  
  // Start polling
  setInterval(checkSessions, POLL_INTERVAL)
  
  // Send startup notification
  await sendNotification(
    'Monitor Started',
    `Watching ${busyStates.size} session(s)`,
    ['eyes'],
    DASHBOARD_URL
  )
}

main().catch(console.error)
