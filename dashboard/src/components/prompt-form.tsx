'use client'

import { sendPrompt } from '@/app/actions'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  sessionName: string
  disabled?: boolean
}

export function PromptForm({ sessionName, disabled }: Props) {
  const [prompt, setPrompt] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px'
    }
  }, [prompt])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim() || sending || disabled) return

    setSending(true)
    setError('')
    setSuccess(false)

    const result = await sendPrompt(sessionName, prompt)
    
    if (result.success) {
      setPrompt('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
      router.refresh()
    } else {
      setError(result.message)
    }
    
    setSending(false)
  }

  // Handle Cmd/Ctrl + Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || sending}
          placeholder={disabled ? "Session not ready" : "Type a prompt... (Cmd+Enter to send)"}
          rows={1}
          className="flex-1 px-3 py-2 bg-surface-2 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-accent resize-none disabled:opacity-50 min-h-[38px]"
        />
        
        <button
          type="submit"
          disabled={disabled || sending || !prompt.trim()}
          className="px-4 py-2 bg-accent hover:bg-accent-dim disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 self-end"
        >
          {sending ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : success ? (
            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          )}
        </button>
      </div>
      
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </form>
  )
}
