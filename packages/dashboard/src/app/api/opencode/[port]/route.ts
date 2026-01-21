import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { port: string } }
) {
  const port = params.port
  const searchParams = request.nextUrl.searchParams
  const path = searchParams.get('path') || '/session'
  
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000) // 10s timeout
    
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    })
    
    clearTimeout(timeout)
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `OpenCode API error: ${response.statusText}` },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout - OpenCode server too slow' },
        { status: 504 }
      )
    }
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to connect to OpenCode server: ${message}` },
      { status: 502 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { port: string } }
) {
  const port = params.port
  const searchParams = request.nextUrl.searchParams
  const path = searchParams.get('path') || '/session'
  
  try {
    const body = await request.json()
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000) // 10s timeout
    
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    
    clearTimeout(timeout)
    
    if (response.status === 204) {
      return new NextResponse(null, { status: 204 })
    }
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `OpenCode API error: ${response.statusText}` },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout - OpenCode server too slow' },
        { status: 504 }
      )
    }
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to connect to OpenCode server: ${message}` },
      { status: 502 }
    )
  }
}
