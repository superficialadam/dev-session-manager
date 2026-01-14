'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { restartSession } from '@/app/actions'

interface Props {
  sessionName: string
  disabled?: boolean
}

export function RestartSessionButton({ sessionName, disabled }: Props) {
  const [isRestarting, setIsRestarting] = useState(false)
  const router = useRouter()

  const handleRestart = async () => {
    if (isRestarting || disabled) return
    
    setIsRestarting(true)
    try {
      const result = await restartSession(sessionName)
      if (result.success) {
        // Wait a moment for the agent to start
        setTimeout(() => {
          router.refresh()
        }, 2000)
      } else {
        console.error('Restart failed:', result.message)
        alert(`Restart failed: ${result.message}`)
      }
    } catch (error) {
      console.error('Restart error:', error)
      alert('Failed to restart agent')
    } finally {
      setIsRestarting(false)
    }
  }

  return (
    <button
      onClick={handleRestart}
      disabled={isRestarting || disabled}
      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
        isRestarting || disabled
          ? 'bg-surface-2 text-neutral-500 cursor-not-allowed'
          : 'bg-surface-2 text-neutral-300 hover:bg-surface-1 hover:text-white'
      }`}
      title="Restart the agent"
    >
      {isRestarting ? (
        <>
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Restarting...
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Restart Agent
        </>
      )}
    </button>
  )
}
