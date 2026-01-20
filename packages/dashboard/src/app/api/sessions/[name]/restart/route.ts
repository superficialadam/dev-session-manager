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
    await execAsync(`dev-restart ${sessionName}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to restart session:', error)
    return NextResponse.json(
      { error: 'Failed to restart session' },
      { status: 500 }
    )
  }
}
