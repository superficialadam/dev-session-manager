// Ntfy notification service

const NTFY_SERVER = process.env.NTFY_SERVER || 'http://localhost:8090'
const NTFY_TOPIC = process.env.NTFY_TOPIC || 'dev-sessions'
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://100.119.128.1:3333'

export interface NotifyOptions {
  title?: string
  message: string
  tags?: string[]
  priority?: 1 | 2 | 3 | 4 | 5
  click?: string
}

export async function sendNotification(options: NotifyOptions): Promise<boolean> {
  try {
    const headers: Record<string, string> = {}
    
    if (options.title) {
      headers['Title'] = options.title
    }
    if (options.tags && options.tags.length > 0) {
      headers['Tags'] = options.tags.join(',')
    }
    if (options.priority) {
      headers['Priority'] = String(options.priority)
    }
    if (options.click) {
      headers['Click'] = options.click
    }

    const response = await fetch(`${NTFY_SERVER}/${NTFY_TOPIC}`, {
      method: 'POST',
      headers,
      body: options.message,
    })

    return response.ok
  } catch (error) {
    console.error('Failed to send ntfy notification:', error)
    return false
  }
}

export async function notifyAgentComplete(sessionName: string): Promise<boolean> {
  return sendNotification({
    title: 'Agent Complete',
    message: `Session ${sessionName} finished working`,
    tags: ['white_check_mark', 'robot'],
    click: `${DASHBOARD_URL}/sessions/${sessionName}`,
  })
}

export async function notifyAgentError(sessionName: string, error?: string): Promise<boolean> {
  return sendNotification({
    title: 'Agent Error',
    message: error ? `${sessionName}: ${error}` : `Session ${sessionName} encountered an error`,
    tags: ['x', 'warning'],
    priority: 4,
    click: `${DASHBOARD_URL}/sessions/${sessionName}`,
  })
}
