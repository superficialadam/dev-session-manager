import { getSession } from '@/lib/sessions'
import { notFound } from 'next/navigation'
import { OpencodeSessionView } from '@/components/opencode-session-view'

export const dynamic = 'force-dynamic'

interface Props {
  params: { name: string }
}

export default async function OpencodeSessionPage({ params }: Props) {
  const session = await getSession(params.name)
  
  if (!session) {
    notFound()
  }

  if (!session.opencode_port) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center text-neutral-500">
          <p className="text-lg">No OpenCode server available</p>
          <p className="text-sm mt-2">Start OpenCode for this session to view sessions</p>
          <a 
            href={`/sessions/${params.name}`}
            className="inline-block mt-4 px-4 py-2 bg-surface-2 hover:bg-surface-3 text-white text-sm rounded-lg transition-colors"
          >
            ← Back to session
          </a>
        </div>
      </div>
    )
  }

  return (
    <OpencodeSessionView 
      sessionName={params.name}
      opencodePort={session.opencode_port} 
    />
  )
}
