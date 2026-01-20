#!/usr/bin/env node

/**
 * Agent Monitor Service
 * 
 * Monitors all OpenCode sessions for status changes and sends
 * ntfy notifications when agents finish working.
 * 
 * Usage: node agent-monitor.js
 * 
 * Environment variables:
 *   NTFY_SERVER - ntfy server URL (default: http://localhost:8090)
 *   NTFY_TOPIC - ntfy topic (default: dev-sessions)
 *   DASHBOARD_URL - dashboard URL for click links (default: http://100.119.128.1:3333)
 *   POLL_INTERVAL - polling interval in ms (default: 5000)
 */

const { execSync } = require('child_process')

const NTFY_SERVER = process.env.NTFY_SERVER || 'http://localhost:8090'
const NTFY_TOPIC = process.env.NTFY_TOPIC || 'dev-sessions'
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://100.119.128.1:3333'
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || '5000', 10)

// Track previous states: { sessionName: { port, wasRunning } }
const sessionStates = new Map()

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

async function getSessionStatus(port) {
  try {
    const response = await fetch(`http://localhost:${port}/session/status`, {
      signal: AbortSignal.timeout(3000),
    })
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  }
}

async function getSessions() {
  try {
    const output = execSync('dev-list --json 2>/dev/null', { encoding: 'utf-8' })
    return JSON.parse(output)
  } catch {
    return []
  }
}

async function checkSessions() {
  const sessions = await getSessions()
  
  for (const session of sessions) {
    if (!session.opencode_port || !session.tmux_exists) continue
    
    const statuses = await getSessionStatus(session.opencode_port)
    if (!statuses) continue
    
    // Check each OpenCode session's status
    for (const [sessionId, status] of Object.entries(statuses)) {
      const key = `${session.name}:${sessionId}`
      const prev = sessionStates.get(key)
      const isRunning = status.running === true
      
      if (prev && prev.wasRunning && !isRunning) {
        // Agent just finished
        await sendNotification(
          'Agent Complete',
          `${session.name} finished working`,
          ['white_check_mark', 'robot'],
          `${DASHBOARD_URL}/sessions/${session.name}`
        )
      }
      
      sessionStates.set(key, { wasRunning: isRunning })
    }
  }
}

async function main() {
  console.log('[agent-monitor] Starting...')
  console.log(`[agent-monitor] NTFY: ${NTFY_SERVER}/${NTFY_TOPIC}`)
  console.log(`[agent-monitor] Dashboard: ${DASHBOARD_URL}`)
  console.log(`[agent-monitor] Poll interval: ${POLL_INTERVAL}ms`)
  
  // Initial check to populate states without sending notifications
  const sessions = await getSessions()
  for (const session of sessions) {
    if (!session.opencode_port || !session.tmux_exists) continue
    const statuses = await getSessionStatus(session.opencode_port)
    if (!statuses) continue
    for (const [sessionId, status] of Object.entries(statuses)) {
      const key = `${session.name}:${sessionId}`
      sessionStates.set(key, { wasRunning: status.running === true })
    }
  }
  console.log(`[agent-monitor] Tracking ${sessionStates.size} session(s)`)
  
  // Start polling
  setInterval(checkSessions, POLL_INTERVAL)
  
  // Send startup notification
  await sendNotification(
    'Monitor Started',
    'Agent monitor is now running',
    ['eyes'],
    DASHBOARD_URL
  )
}

main().catch(console.error)
