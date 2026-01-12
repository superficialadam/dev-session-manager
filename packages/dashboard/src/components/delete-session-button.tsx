'use client'

import { deleteSession } from '@/app/actions'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface Props {
  sessionName: string
}

export function DeleteSessionButton({ sessionName }: Props) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    const result = await deleteSession(sessionName)
    if (result.success) {
      router.push('/')
    } else {
      alert(`Failed to delete: ${result.message}`)
      setIsDeleting(false)
      setShowConfirm(false)
    }
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-neutral-400">Delete?</span>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="px-3 py-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
        >
          {isDeleting ? 'Deleting...' : 'Yes'}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          disabled={isDeleting}
          className="px-3 py-1.5 bg-surface-2 hover:bg-surface-3 text-sm rounded-lg transition-colors"
        >
          No
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="px-4 py-2 bg-surface-2 hover:bg-red-500/20 hover:text-red-400 text-neutral-300 text-sm font-medium rounded-lg transition-colors"
    >
      Delete
    </button>
  )
}
