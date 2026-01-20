import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const sessionName = params.name
    await execAsync(`tmux kill-session -t ${sessionName}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to kill session:', error)
    return NextResponse.json(
      { error: 'Failed to kill session' },
      { status: 500 }
    )
  }
}
