'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  getOpencodeSessions,
  getOpencodeMessages,
  sendOpencodePromptAsync,
  getOpencodeSessionStatuses,
  OpencodeSession,
  OpencodeMessageWithParts,
  OpencodeSessionStatus,
} from '@/lib/opencode-api'

const MASTER_AGENT_PORT = 4000
const MASTER_AGENT_DIRECTORY = '/home/adam/CODE/dev-session-manager'

const statusColors: Record<string, string> = {
  running: 'bg-status-working',
  idle: 'bg-status-idle',
}

function isSubagentSession(session: OpencodeSession): boolean {
  return session.parentID !== undefined && session.parentID !== null
}

function isMasterAgentSession(session: OpencodeSession): boolean {
  return session.directory === MASTER_AGENT_DIRECTORY
}

function hasContent(message: OpencodeMessageWithParts): boolean {
  if (!message.parts || message.parts.length === 0) return false
  return message.parts.some(part => {
    if (part.type === 'text' && part.text && part.text.trim().length > 0) return true
    if (part.type === 'tool-invocation' || part.type === 'tool-result') return true
    return false
  })
}

export function MasterAgentFoldout() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
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
  const [isConnected, setIsConnected] = useState(false)
  
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
        getOpencodeSessions(MASTER_AGENT_PORT),
        getOpencodeSessionStatuses(MASTER_AGENT_PORT),
      ])
      const mainSessions = sessionsData.filter(s => !isSubagentSession(s) && isMasterAgentSession(s))
      setSessions(mainSessions)
      setSessionStatuses(statusesData)
      setIsConnected(true)
      if (mainSessions.length > 0 && !selectedSessionId) {
        setSelectedSessionId(mainSessions[0].id)
      }
    } catch {
      setIsConnected(false)
      setError('Master agent not running')
    } finally {
      setIsLoadingSessions(false)
    }
  }, [selectedSessionId])

  const fetchMessages = useCallback(async () => {
    if (!selectedSessionId) return
    try {
      const data = await getOpencodeMessages(MASTER_AGENT_PORT, selectedSessionId)
      const nonEmptyMessages = data.filter(hasContent)
      const newIds = nonEmptyMessages.map(m => m.info.id).join(',')
      if (newIds !== prevMessageIdsRef.current) {
        prevMessageIdsRef.current = newIds
        setMessages(nonEmptyMessages)
      }
    } catch {
    }
  }, [selectedSessionId])

  const fetchMessagesInitial = useCallback(async () => {
    if (!selectedSessionId) return
    setIsLoadingMessages(true)
    try {
      const data = await getOpencodeMessages(MASTER_AGENT_PORT, selectedSessionId)
      const nonEmptyMessages = data.filter(hasContent)
      setMessages(nonEmptyMessages)
      prevMessageIdsRef.current = nonEmptyMessages.map(m => m.info.id).join(',')
      setTimeout(() => scrollToBottom(), 100)
    } catch {
      setError('Failed to fetch messages')
    } finally {
      setIsLoadingMessages(false)
    }
  }, [selectedSessionId, scrollToBottom])

  useEffect(() => {
    if (isOpen) {
      fetchSessions()
    }
  }, [isOpen, fetchSessions])

  useEffect(() => {
    if (isOpen && selectedSessionId) {
      prevMessageIdsRef.current = ''
      fetchMessagesInitial()
    }
  }, [isOpen, selectedSessionId, fetchMessagesInitial])

  useEffect(() => {
    if (isOpen && selectedSessionId) {
      pollIntervalRef.current = setInterval(() => {
        fetchMessages()
        getOpencodeSessionStatuses(MASTER_AGENT_PORT).then(setSessionStatuses).catch(() => {})
      }, 2000)
    }
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [isOpen, selectedSessionId, fetchMessages])

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
      await sendOpencodePromptAsync(MASTER_AGENT_PORT, selectedSessionId, prompt)
      setTimeout(fetchMessages, 1000)
    } catch {
      setError('Failed to send message')
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
    <div className="bg-surface-1 border border-neutral-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-2 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? (isAgentWorking ? 'bg-status-working animate-pulse' : 'bg-status-idle') : 'bg-status-stopped'}`} />
          <span className="font-medium text-white">Dev Master Agent</span>
          {isAgentWorking && <span className="text-xs text-status-working">Working...</span>}
        </div>
        <svg className={`w-5 h-5 text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="border-t border-neutral-800">
          <div className="flex items-center gap-2 px-4 py-2 bg-surface-2 border-b border-neutral-800">
            <div className="relative flex-1" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full flex items-center justify-between gap-2 px-3 py-1.5 bg-surface-1 border border-neutral-700 rounded text-sm text-white hover:border-neutral-600 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {selectedStatus && (
                    <div className={`w-2 h-2 rounded-full shrink-0 ${selectedStatus.running ? statusColors.running : statusColors.idle} ${selectedStatus.running ? 'animate-pulse' : ''}`} />
                  )}
                  <span className="truncate text-xs">
                    {selectedSession?.title || selectedSession?.id || 'Select session'}
                  </span>
                </div>
                <svg className={`w-3 h-3 shrink-0 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {isDropdownOpen && sessions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-surface-2 border border-neutral-700 rounded overflow-hidden shadow-xl z-10 max-h-48 overflow-y-auto">
                  {sessions.map(session => {
                    const status = sessionStatuses[session.id]
                    return (
                      <button
                        key={session.id}
                        onClick={() => {
                          setSelectedSessionId(session.id)
                          setIsDropdownOpen(false)
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-surface-3 transition-colors ${
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
              onClick={() => router.push('/new')}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-surface-1 rounded transition-colors"
              title="New session"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            
            <button
              onClick={fetchSessions}
              disabled={isLoadingSessions}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-surface-1 rounded transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <svg className={`w-4 h-4 ${isLoadingSessions ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          
          <div className="h-64 overflow-y-auto p-3 space-y-3 bg-surface-0">
            {!isConnected ? (
              <div className="flex items-center justify-center h-full text-neutral-500 text-sm">
                Master agent not running on port {MASTER_AGENT_PORT}
              </div>
            ) : isLoadingMessages && messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <svg className="w-6 h-6 animate-spin text-accent" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-neutral-500 text-sm">
                No messages yet
              </div>
            ) : (
              <>
                {messages.map((msg, index) => (
                  <MessageBubble key={msg.info.id || index} message={msg} />
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
          
          {isAgentWorking && (
            <div className="px-3 py-1.5 bg-surface-1 border-t border-neutral-800">
              <div className="flex items-center gap-2 text-xs text-status-working">
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Working...</span>
              </div>
            </div>
          )}
          
          {error && (
            <div className="px-3 py-2 bg-red-500/10 border-t border-red-500/30 text-xs text-red-400">
              {error}
            </div>
          )}
          
          <div className="border-t border-neutral-800 p-3 bg-surface-1">
            <div className="flex gap-2">
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={!selectedSessionId || isSending || !isConnected}
                placeholder={!isConnected ? "Agent not running" : "Message master agent... (Cmd+Enter)"}
                rows={1}
                className="flex-1 px-3 py-2 bg-surface-2 border border-neutral-700 rounded text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-accent resize-none disabled:opacity-50 min-h-[38px]"
              />
              
              <button
                onClick={handleSend}
                disabled={!selectedSessionId || isSending || !prompt.trim() || !isConnected}
                className="px-3 py-2 bg-accent hover:bg-accent-dim disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors flex items-center self-end"
              >
                {isSending ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MessageBubble({ message }: { message: OpencodeMessageWithParts }) {
  const isUser = message.info.role === 'user'
  const textParts = message.parts.filter((p): p is { type: 'text'; text: string } => p.type === 'text' && Boolean(p.text?.trim()))
  const toolParts = message.parts.filter(p => p.type === 'tool-invocation' || p.type === 'tool-result')
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-xl px-3 py-2 ${
        isUser 
          ? 'bg-accent text-white rounded-br-sm' 
          : 'bg-surface-2 text-neutral-200 rounded-bl-sm'
      }`}>
        {textParts.map((part, i) => (
          <div key={i} className="whitespace-pre-wrap break-words text-xs">
            {part.text}
          </div>
        ))}
        
        {toolParts.length > 0 && (
          <div className={`mt-1 pt-1 border-t ${isUser ? 'border-white/20' : 'border-neutral-700'}`}>
            <div className="flex items-center gap-1 text-[10px] opacity-70">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{toolParts.length} tool call{toolParts.length > 1 ? 's' : ''}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
