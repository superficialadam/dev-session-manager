'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { OpencodeSessionView } from './opencode-session-view'

interface Props {
  sessionName: string
  ttydPort: number | null
  opencodePort: number | null
  tmuxExists: boolean
}

export function SessionTabbedView({ sessionName, ttydPort, opencodePort, tmuxExists }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'agent' | 'terminal'>('agent')
  const [isRestarting, setIsRestarting] = useState(false)

  const handleRestartServices = async () => {
    if (!confirm('Restart dev services?')) return
    setIsRestarting(true)
    try {
      await fetch(`/api/sessions/${sessionName}/restart`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'services' })
      })
      router.refresh()
    } catch (e) {
      console.error('Failed to restart:', e)
    } finally {
      setIsRestarting(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      <header className="flex items-center justify-between px-4 py-2 bg-surface-1 border-b border-neutral-800 shrink-0">
        {/* Left: Back + Session name */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={() => router.push('/')}
            className="p-2 text-neutral-400 hover:text-white hover:bg-surface-2 rounded-lg transition-colors shrink-0"
            title="Back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-medium text-white truncate">{sessionName}</h1>
        </div>
        
        {/* Center: Tab selector */}
        <div className="flex bg-surface-2 rounded-lg p-0.5 shrink-0">
          <button
            onClick={() => setActiveTab('agent')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'agent' 
                ? 'bg-accent text-white' 
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Agent
          </button>
          <button
            onClick={() => setActiveTab('terminal')}
            disabled={!ttydPort}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'terminal' 
                ? 'bg-accent text-white' 
                : 'text-neutral-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            Terminal
          </button>
        </div>
        
        {/* Right: Restart Services */}
        <div className="flex items-center justify-end flex-1">
          <button
            onClick={handleRestartServices}
            disabled={isRestarting || !tmuxExists}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-neutral-400 hover:text-white hover:bg-surface-2 rounded-lg transition-colors disabled:opacity-50"
            title="Restart dev services"
          >
            <svg className={`w-4 h-4 ${isRestarting ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">Restart Services</span>
          </button>
        </div>
      </header>
      
      <main className="flex-1 overflow-hidden">
        {activeTab === 'agent' ? (
          opencodePort ? (
            <OpencodeSessionViewEmbedded sessionName={sessionName} opencodePort={opencodePort} />
          ) : (
            <div className="flex items-center justify-center h-full text-neutral-500">
              <p>OpenCode not available for this session</p>
            </div>
          )
        ) : (
          ttydPort ? (
            <iframe
              src={`http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:${ttydPort}`}
              className="w-full h-full border-0"
              title="Terminal"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-neutral-500">
              <p>Terminal not available</p>
            </div>
          )
        )}
      </main>
    </div>
  )
}

function OpencodeSessionViewEmbedded({ sessionName, opencodePort }: { sessionName: string; opencodePort: number }) {
  return (
    <div className="h-full">
      <OpencodeSessionViewInline sessionName={sessionName} opencodePort={opencodePort} />
    </div>
  )
}

import { useState as useStateInline, useEffect, useRef, useCallback } from 'react'
import {
  getOpencodeSessions,
  getOpencodeMessages,
  sendOpencodePromptAsync,
  getOpencodeSessionStatuses,
  OpencodeSession,
  OpencodeMessageWithParts,
  OpencodeSessionStatus,
} from '@/lib/opencode-api'

const statusColors: Record<string, string> = {
  running: 'bg-status-working',
  idle: 'bg-status-idle',
}

function isSubagentSession(session: OpencodeSession): boolean {
  return session.parentID !== undefined && session.parentID !== null
}

function hasContent(message: OpencodeMessageWithParts): boolean {
  if (!message.parts || message.parts.length === 0) return false
  return message.parts.some(part => {
    if (part.type === 'text' && part.text && part.text.trim().length > 0) return true
    if (part.type === 'tool-invocation' || part.type === 'tool-result') return true
    return false
  })
}

function OpencodeSessionViewInline({ sessionName, opencodePort }: { sessionName: string; opencodePort: number }) {
  const [sessions, setSessions] = useState<OpencodeSession[]>([])
  const [sessionStatuses, setSessionStatuses] = useState<Record<string, OpencodeSessionStatus>>({})
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<OpencodeMessageWithParts[]>([])
  const [prompt, setPrompt] = useState('')
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const prevMessageIdsRef = useRef('')

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const fetchSessions = useCallback(async () => {
    setIsLoadingSessions(true)
    setError(null)
    try {
      const [sessionsData, statusesData] = await Promise.all([
        getOpencodeSessions(opencodePort),
        getOpencodeSessionStatuses(opencodePort),
      ])
      const mainSessions = sessionsData.filter(s => !isSubagentSession(s))
      setSessions(mainSessions)
      setSessionStatuses(statusesData)
      if (mainSessions.length > 0 && !selectedSessionId) {
        setSelectedSessionId(mainSessions[0].id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sessions')
    } finally {
      setIsLoadingSessions(false)
    }
  }, [opencodePort, selectedSessionId])

  const fetchMessages = useCallback(async () => {
    if (!selectedSessionId) return
    try {
      const data = await getOpencodeMessages(opencodePort, selectedSessionId)
      const nonEmptyMessages = data.filter(hasContent)
      const newIds = nonEmptyMessages.map(m => m.info.id).join(',')
      if (newIds !== prevMessageIdsRef.current) {
        prevMessageIdsRef.current = newIds
        setMessages(nonEmptyMessages)
      }
    } catch {
    }
  }, [opencodePort, selectedSessionId])

  const fetchMessagesInitial = useCallback(async () => {
    if (!selectedSessionId) return
    setIsLoadingMessages(true)
    setError(null)
    try {
      const data = await getOpencodeMessages(opencodePort, selectedSessionId)
      const nonEmptyMessages = data.filter(hasContent)
      setMessages(nonEmptyMessages)
      prevMessageIdsRef.current = nonEmptyMessages.map(m => m.info.id).join(',')
      setTimeout(() => scrollToBottom(), 100)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch messages')
    } finally {
      setIsLoadingMessages(false)
    }
  }, [opencodePort, selectedSessionId, scrollToBottom])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  useEffect(() => {
    if (selectedSessionId) {
      prevMessageIdsRef.current = ''
      fetchMessagesInitial()
    }
  }, [selectedSessionId, fetchMessagesInitial])

  useEffect(() => {
    if (selectedSessionId) {
      pollIntervalRef.current = setInterval(() => {
        fetchMessages()
        getOpencodeSessionStatuses(opencodePort).then(setSessionStatuses).catch(() => {})
      }, 2000)
    }
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [opencodePort, selectedSessionId, fetchMessages])

  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px'
    }
  }, [prompt])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSend = async () => {
    if (!selectedSessionId || !prompt.trim() || isSending) return
    
    const userMessage: OpencodeMessageWithParts = {
      info: {
        id: `temp-${Date.now()}`,
        sessionID: selectedSessionId,
        role: 'user',
        createdAt: new Date().toISOString(),
      },
      parts: [{ type: 'text', text: prompt }],
    }
    
    setMessages(prev => [...prev, userMessage])
    setPrompt('')
    setIsSending(true)
    
    try {
      await sendOpencodePromptAsync(opencodePort, selectedSessionId, prompt)
      setTimeout(fetchMessages, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSend()
    }
  }

  const selectedSession = sessions.find(s => s.id === selectedSessionId)
  const selectedStatus = selectedSessionId ? sessionStatuses[selectedSessionId] : null
  const isAgentWorking = selectedStatus?.running === true

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-2 bg-surface-1 border-b border-neutral-800 shrink-0">
        <div className="relative flex-1" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full flex items-center justify-between gap-2 px-3 py-1.5 bg-surface-2 border border-neutral-700 rounded-lg text-sm text-white hover:border-neutral-600 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              {selectedStatus && (
                <div className={`w-2 h-2 rounded-full shrink-0 ${selectedStatus.running ? statusColors.running : statusColors.idle} ${selectedStatus.running ? 'animate-pulse' : ''}`} />
              )}
              <span className="truncate">
                {selectedSession?.title || selectedSession?.id || 'Select session'}
              </span>
            </div>
            <svg className={`w-4 h-4 shrink-0 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {isDropdownOpen && sessions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-surface-2 border border-neutral-700 rounded-lg overflow-hidden shadow-xl z-10 max-h-64 overflow-y-auto">
              {sessions.map(session => {
                const status = sessionStatuses[session.id]
                return (
                  <button
                    key={session.id}
                    onClick={() => {
                      setSelectedSessionId(session.id)
                      setIsDropdownOpen(false)
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-surface-3 transition-colors ${
                      session.id === selectedSessionId ? 'bg-surface-3 text-accent' : 'text-white'
                    }`}
                  >
                    {status && (
                      <div className={`w-2 h-2 rounded-full shrink-0 ${status.running ? statusColors.running : statusColors.idle} ${status.running ? 'animate-pulse' : ''}`} />
                    )}
                    <span className="truncate">{session.title || session.id}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
        
        <button
          onClick={fetchSessions}
          disabled={isLoadingSessions}
          className="p-2 text-neutral-400 hover:text-white hover:bg-surface-2 rounded-lg transition-colors disabled:opacity-50"
          title="Refresh sessions"
        >
          <svg className={`w-4 h-4 ${isLoadingSessions ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <main className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface-0">
        {isLoadingMessages && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <svg className="w-8 h-8 animate-spin text-accent" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-neutral-500">
              <p>No messages yet</p>
              <p className="text-sm mt-1">Send a prompt to start</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => (
              <MessageBubble key={msg.info.id || index} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}
      </main>

      {isAgentWorking && (
        <div className="shrink-0 px-4 py-2 bg-surface-1 border-t border-neutral-800">
          <div className="flex items-center gap-2 text-sm text-status-working">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Agent is working...</span>
          </div>
        </div>
      )}

      <footer className="shrink-0 border-t border-neutral-800 bg-surface-1 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!selectedSessionId || isSending}
            placeholder={!selectedSessionId ? "Select a session" : "Type a message... (Cmd+Enter to send)"}
            rows={1}
            className="flex-1 px-3 py-2 bg-surface-2 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-accent resize-none disabled:opacity-50 min-h-[42px]"
          />
          
          <button
            onClick={handleSend}
            disabled={!selectedSessionId || isSending || !prompt.trim()}
            className="px-4 py-2 bg-accent hover:bg-accent-dim disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 self-end"
          >
            {isSending ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </footer>
    </div>
  )
}

function MessageBubble({ message }: { message: OpencodeMessageWithParts }) {
  const isUser = message.info.role === 'user'
  const textParts = message.parts.filter((p): p is { type: 'text'; text: string } => p.type === 'text' && Boolean(p.text?.trim()))
  const toolParts = message.parts.filter(p => p.type === 'tool-invocation' || p.type === 'tool-result')
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 ${
        isUser 
          ? 'bg-accent text-white rounded-br-md' 
          : 'bg-surface-2 text-neutral-200 rounded-bl-md'
      }`}>
        {textParts.map((part, i) => (
          <div key={i} className="whitespace-pre-wrap break-words text-sm">
            {part.text}
          </div>
        ))}
        
        {toolParts.length > 0 && (
          <div className={`mt-2 pt-2 border-t ${isUser ? 'border-white/20' : 'border-neutral-700'}`}>
            <div className="flex items-center gap-1.5 text-xs opacity-70">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{toolParts.length} tool {toolParts.length === 1 ? 'call' : 'calls'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
