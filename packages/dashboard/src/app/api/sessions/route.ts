import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  try {
    const { stdout } = await execAsync('dev-list --json 2>/dev/null || echo "[]"');
    const sessions = JSON.parse(stdout.trim() || '[]');
    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Error listing sessions:', error);
    return NextResponse.json({ error: 'Failed to list sessions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repo, branch, agent } = body;

    if (!repo || !branch) {
      return NextResponse.json({ error: 'repo and branch are required' }, { status: 400 });
    }

    const cmd = agent ? `dev-new "${repo}" "${branch}" --agent "${agent}"` : `dev-new "${repo}" "${branch}"`;
    const { stdout, stderr } = await execAsync(cmd);

    // Assuming success if no error
    return NextResponse.json({ message: 'Session created successfully', output: stdout });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({ error: 'Failed to create session', details: error.message }, { status: 500 });
  }
}