// OpenCode Server API Client
// Based on https://opencode.ai/docs/server/

export interface OpencodeSession {
  id: string
  parentID?: string
  title?: string
  createdAt: string
  updatedAt: string
  share?: {
    id: string
    url: string
  }
}

export interface OpencodeMessage {
  id: string
  sessionID: string
  role: 'user' | 'assistant' | 'system'
  createdAt: string
}

export interface OpencodeTextPart {
  type: 'text'
  text: string
}

export interface OpencodeToolInvocationPart {
  type: 'tool-invocation'
  toolInvocationID: string
  toolName: string
  args: Record<string, unknown>
  state: 'pending' | 'running' | 'done' | 'error'
}

export interface OpencodeToolResultPart {
  type: 'tool-result'
  toolInvocationID: string
  toolName: string
  result: unknown
}

export type OpencodePart = OpencodeTextPart | OpencodeToolInvocationPart | OpencodeToolResultPart

export interface OpencodeMessageWithParts {
  info: OpencodeMessage
  parts: OpencodePart[]
}

export interface OpencodeSessionStatus {
  running: boolean
  agent?: string
  model?: string
}

class OpencodeApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string
  ) {
    super(message)
    this.name = 'OpencodeApiError'
  }
}

async function fetchApi<T>(port: number, path: string, options?: RequestInit): Promise<T> {
  const proxyUrl = `/api/opencode/${port}?path=${encodeURIComponent(path)}`
  
  try {
    const response = await fetch(proxyUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new OpencodeApiError(
        errorData.error || `API request failed: ${response.statusText}`,
        response.status,
        response.statusText
      )
    }

    if (response.status === 204) {
      return undefined as T
    }

    return response.json()
  } catch (error) {
    if (error instanceof OpencodeApiError) {
      throw error
    }
    throw new Error(`Failed to fetch OpenCode API: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function getOpencodeSessions(port: number): Promise<OpencodeSession[]> {
  return fetchApi<OpencodeSession[]>(port, '/session')
}

export async function getOpencodeSessionStatuses(
  port: number
): Promise<Record<string, OpencodeSessionStatus>> {
  return fetchApi<Record<string, OpencodeSessionStatus>>(port, '/session/status')
}

export async function getOpencodeSession(
  port: number,
  sessionId: string
): Promise<OpencodeSession> {
  return fetchApi<OpencodeSession>(port, `/session/${sessionId}`)
}

export async function getOpencodeMessages(
  port: number,
  sessionId: string,
  limit?: number
): Promise<OpencodeMessageWithParts[]> {
  const query = limit ? `?limit=${limit}` : ''
  return fetchApi<OpencodeMessageWithParts[]>(port, `/session/${sessionId}/message${query}`)
}

export async function sendOpencodePromptAsync(
  port: number,
  sessionId: string,
  prompt: string
): Promise<void> {
  await fetchApi<void>(port, `/session/${sessionId}/prompt_async`, {
    method: 'POST',
    body: JSON.stringify({
      parts: [{ type: 'text', text: prompt }],
    }),
  })
}

export async function sendOpencodePrompt(
  port: number,
  sessionId: string,
  prompt: string
): Promise<OpencodeMessageWithParts> {
  return fetchApi<OpencodeMessageWithParts>(port, `/session/${sessionId}/message`, {
    method: 'POST',
    body: JSON.stringify({
      parts: [{ type: 'text', text: prompt }],
    }),
  })
}

export async function createOpencodeSession(
  port: number,
  options?: { parentID?: string; title?: string }
): Promise<OpencodeSession> {
  return fetchApi<OpencodeSession>(port, '/session', {
    method: 'POST',
    body: JSON.stringify(options || {}),
  })
}

export async function abortOpencodeSession(
  port: number,
  sessionId: string
): Promise<boolean> {
  return fetchApi<boolean>(port, `/session/${sessionId}/abort`, {
    method: 'POST',
  })
}

export async function checkOpencodeHealth(
  port: number
): Promise<{ healthy: boolean; version: string }> {
  return fetchApi<{ healthy: boolean; version: string }>(port, '/global/health')
}
