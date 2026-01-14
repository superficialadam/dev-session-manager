'use client'

import { useState, useEffect } from 'react'

interface CopyButtonProps {
  text: string
}

function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (!text) return
    
    // Try modern clipboard API first, fall back to execCommand
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }).catch(() => {
        fallbackCopy()
      })
    } else {
      fallbackCopy()
    }
  }

  const fallbackCopy = () => {
    // Fallback for non-HTTPS contexts
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    
    try {
      document.execCommand('copy')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Fallback copy failed:', err)
    }
    
    document.body.removeChild(textArea)
  }

  return (
    <button
      onClick={handleCopy}
      type="button"
      className="flex-shrink-0 p-2 rounded bg-surface-2 hover:bg-neutral-700 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? (
        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-neutral-400 hover:text-neutral-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  )
}

interface ConnectStringProps {
  opencodePort?: number | null
  nvimPort?: number | null
}

export function ConnectString({ opencodePort, nvimPort }: ConnectStringProps) {
  const [host, setHost] = useState<string>('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setHost(window.location.hostname)
    }
  }, [])

  if (!host || (!opencodePort && !nvimPort)) return null

  const opencodeString = opencodePort ? `opencode attach http://${host}:${opencodePort}` : ''
  const nvimString = nvimPort ? `nvim --remote-ui --server ${host}:${nvimPort}` : ''

  return (
    <div className="bg-surface-1 border border-neutral-800 rounded-xl p-4">
      <h2 className="text-sm font-medium text-neutral-400 mb-3">Connect Locally</h2>
      <p className="text-xs text-neutral-500 mb-3">
        Run these commands in your local terminal:
      </p>
      <div className="space-y-3">
        {opencodeString && (
          <div>
            <p className="text-xs text-neutral-500 mb-1">OpenCode:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-surface-2 px-3 py-2 rounded text-accent text-xs font-mono break-all select-all">
                {opencodeString}
              </code>
              <CopyButton text={opencodeString} />
            </div>
          </div>
        )}
        {nvimString && (
          <div>
            <p className="text-xs text-neutral-500 mb-1">Neovim:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-surface-2 px-3 py-2 rounded text-accent text-xs font-mono break-all select-all">
                {nvimString}
              </code>
              <CopyButton text={nvimString} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
