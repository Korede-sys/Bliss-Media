'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export function SignOutButton() {
  const [error, setError] = useState('')
  const router = useRouter()
  async function signOut() {
    const supabase = createSupabaseBrowserClient()
    if (!supabase) { setError('Authentication is not configured.'); return }
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) { setError('We could not sign you out. Please try again.'); return }
    router.replace('/admin/sign-in'); router.refresh()
  }
  return <div><button className="text-link button-link" onClick={signOut}>Sign out</button>{error&&<p role="alert">{error}</p>}</div>
}
