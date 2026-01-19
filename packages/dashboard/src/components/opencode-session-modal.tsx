'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  getOpencodeSessions,
  getOpencodeMessages,
  sendOpencodePromptAsync,
  getOpencodeSessionStatuses,
  OpencodeSession,
  OpencodeMessageWithParts,
  OpencodeSessionStatus,
} from '@/lib/opencode-api'

interface Props {
  isOpen: boolean
  onClose: () => void
  opencodePort: number | null
}

const statusColors: Record<string, string> = {
  running: 'bg-status-working',
  idle: 'bg-status-idle',
}

export function OpencodeSessionModal({ isOpen, onClose, opencodePort }: Props) {
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

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const fetchSessions = useCallback(async () => {
    if (!opencodePort) return
    setIsLoadingSessions(true)
    setError(null)
    try {
      const [sessionsData, statusesData] = await Promise.all([
        getOpencodeSessions(opencodePort),
        getOpencodeSessionStatuses(opencodePort),
      ])
      setSessions(sessionsData)
      setSessionStatuses(statusesData)
      if (sessionsData.length > 0 && !selectedSessionId) {
        setSelectedSessionId(sessionsData[0].id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sessions')
    } finally {
      setIsLoadingSessions(false)
    }
  }, [opencodePort, selectedSessionId])

  const fetchMessages = useCallback(async () => {
    if (!opencodePort || !selectedSessionId) return
    try {
      const data = await getOpencodeMessages(opencodePort, selectedSessionId)
      setMessages(data)
      setTimeout(scrollToBottom, 100)
    } catch (err) {
      console.error('Failed to fetch messages:', err)
    }
  }, [opencodePort, selectedSessionId, scrollToBottom])

  const fetchMessagesForPolling = useCallback(async () => {
    if (!opencodePort || !selectedSessionId) return
    setIsLoadingMessages(true)
    setError(null)
    try {
      const data = await getOpencodeMessages(opencodePort, selectedSessionId)
      setMessages(data)
      setTimeout(scrollToBottom, 100)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch messages')
    } finally {
      setIsLoadingMessages(false)
    }
  }, [opencodePort, selectedSessionId, scrollToBottom])

  useEffect(() => {
    if (isOpen && opencodePort) {
      fetchSessions()
    }
  }, [isOpen, opencodePort, fetchSessions])

  useEffect(() => {
    if (selectedSessionId && opencodePort) {
      fetchMessagesForPolling()
    }
  }, [selectedSessionId, opencodePort, fetchMessagesForPolling])

  useEffect(() => {
    if (isOpen && opencodePort && selectedSessionId) {
      pollIntervalRef.current = setInterval(() => {
        fetchMessages()
        getOpencodeSessionStatuses(opencodePort).then(setSessionStatuses).catch(() => {})
      }, 3000)
    }
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [isOpen, opencodePort, selectedSessionId, fetchMessages])

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

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  const handleSend = async () => {
    if (!opencodePort || !selectedSessionId || !prompt.trim() || isSending) return
    
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
    setTimeout(scrollToBottom, 50)
    
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative w-full h-full md:h-[90vh] md:max-h-[900px] md:max-w-4xl md:rounded-2xl bg-surface-0 flex flex-col overflow-hidden md:border md:border-neutral-800">
        <header className="flex items-center gap-3 px-4 py-3 border-b border-neutral-800 bg-surface-1 shrink-0">
          <div className="relative flex-1" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              disabled={!opencodePort}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-surface-2 border border-neutral-700 rounded-lg text-sm text-white hover:border-neutral-600 transition-colors disabled:opacity-50"
            >
              <div className="flex items-center gap-2 min-w-0">
                {selectedStatus && (
                  <div className={`w-2 h-2 rounded-full shrink-0 ${selectedStatus.running ? statusColors.running : statusColors.idle}`} />
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
                        <div className={`w-2 h-2 rounded-full shrink-0 ${status.running ? statusColors.running : statusColors.idle}`} />
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
            disabled={isLoadingSessions || !opencodePort}
            className="p-2 text-neutral-400 hover:text-white hover:bg-surface-2 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh sessions"
          >
            <svg className={`w-5 h-5 ${isLoadingSessions ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white hover:bg-surface-2 rounded-lg transition-colors"
            title="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 space-y-4">
          {!opencodePort ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-neutral-500">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636a9 9 0 010 12.728m-3.536-3.536a4 4 0 010-5.656m-7.072 7.072a4 4 0 010-5.656m-3.536 9.192a9 9 0 010-12.728" />
                </svg>
                <p>No OpenCode server available</p>
                <p className="text-sm mt-1">Start OpenCode to see sessions</p>
              </div>
            </div>
          ) : isLoadingMessages && messages.length === 0 ? (
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

        <footer className="shrink-0 border-t border-neutral-800 bg-surface-1 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex gap-2">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!opencodePort || !selectedSessionId || isSending}
              placeholder={
                !opencodePort ? "No server available" :
                !selectedSessionId ? "Select a session" :
                "Type a message... (Cmd+Enter to send)"
              }
              rows={1}
              className="flex-1 px-3 py-2 bg-surface-2 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-accent resize-none disabled:opacity-50 min-h-[42px]"
            />
            
            <button
              onClick={handleSend}
              disabled={!opencodePort || !selectedSessionId || isSending || !prompt.trim()}
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
    </div>
  )
}

function MessageBubble({ message }: { message: OpencodeMessageWithParts }) {
  const isUser = message.info.role === 'user'
  const textParts = message.parts.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
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
        
        {textParts.length === 0 && toolParts.length === 0 && (
          <div className="text-sm opacity-50 italic">Empty message</div>
        )}
      </div>
    </div>
  )
}
