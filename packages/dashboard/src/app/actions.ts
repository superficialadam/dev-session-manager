'use server'

import * as sessions from '@/lib/sessions'
import { revalidatePath } from 'next/cache'

export async function createSession(formData: FormData) {
  const repo = formData.get('repo') as string
  const branch = formData.get('branch') as string
  const agent = formData.get('agent') as string || 'opencode'
  
  const result = await sessions.createSession(repo, branch, agent)
  
  if (result.success) {
    revalidatePath('/')
  }
  
  return result
}

export async function deleteSession(name: string, keepBranch: boolean = false) {
  const result = await sessions.deleteSession(name, keepBranch)
  
  if (result.success) {
    revalidatePath('/')
    revalidatePath(`/sessions/${name}`)
  }
  
  return result
}

export async function sendPrompt(sessionName: string, prompt: string) {
  const result = await sessions.sendPrompt(sessionName, prompt)
  
  if (result.success) {
    revalidatePath(`/sessions/${sessionName}`)
  }
  
  return result
}

export async function addRepo(formData: FormData) {
  const name = formData.get('name') as string
  
  const result = await sessions.addRepo(name)
  
  if (result.success) {
    revalidatePath('/repos')
  }
  
  return result
}
