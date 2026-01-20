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
    
    // Parse optional body for scope
    let scope = 'all'
    try {
      const body = await request.json()
      if (body.scope && ['all', 'services', 'agent'].includes(body.scope)) {
        scope = body.scope
      }
    } catch {
      // No body or invalid JSON, use default
    }
    
    let cmd = `dev-restart ${sessionName}`
    if (scope === 'services') {
      cmd += ' --services'
    } else if (scope === 'agent') {
      cmd += ' --agent-only'
    }
    
    await execAsync(cmd)
    return NextResponse.json({ success: true, scope })
  } catch (error) {
    console.error('Failed to restart session:', error)
    return NextResponse.json(
      { error: 'Failed to restart session' },
      { status: 500 }
    )
  }
}
