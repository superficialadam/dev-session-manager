import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function DELETE(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const sessionName = params.name;
    const { stdout } = await execAsync(`dev-delete "${sessionName}"`);
    return NextResponse.json({ message: 'Session deleted successfully', output: stdout });
  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json({ error: 'Failed to delete session', details: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const sessionName = params.name;
    const body = await request.json();
    const { action, agent, nvim } = body;

    if (action === 'restart') {
      let cmd = `dev-restart "${sessionName}"`;
      if (agent) cmd += ` --agent "${agent}"`;
      if (nvim) cmd += ' --nvim';
      if (!agent && !nvim) cmd += ' --all';

      const { stdout } = await execAsync(cmd);
      return NextResponse.json({ message: 'Session restarted successfully', output: stdout });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error performing action on session:', error);
    return NextResponse.json({ error: 'Failed to perform action', details: error.message }, { status: 500 });
  }
}