import { getSession } from '@/lib/sessions'
import { notFound } from 'next/navigation'
import { SessionTabbedView } from '@/components/session-tabbed-view'

export const dynamic = 'force-dynamic'

interface Props {
  params: { name: string }
}

export default async function SessionPage({ params }: Props) {
  const session = await getSession(params.name)
  
  if (!session) {
    notFound()
  }

  return (
    <div className="-mx-6 -mt-8">
      <SessionTabbedView 
        sessionName={session.name}
        ttydPort={session.ttyd_port}
        opencodePort={session.opencode_port}
        tmuxExists={session.tmux_exists}
      />
    </div>
  )
}
