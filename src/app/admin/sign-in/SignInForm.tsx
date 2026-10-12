'use client'
import { useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export function SignInForm({ configured }: { configured: boolean }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const router = useRouter()
  const search = useSearchParams()
  const expired = search.get('reason') === 'session-expired'
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('')
    const supabase = createSupabaseBrowserClient()
    if (!supabase) { setError('Authentication is not configured. Ask your administrator to complete the Supabase setup.'); return }
    setBusy(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (signInError) { setError('We couldn’t sign you in with those details. Check them and try again.'); return }
    const nextPath = search.get('next')
    router.replace(nextPath?.startsWith('/admin/') && nextPath !== '/admin/sign-in' ? nextPath : '/admin')
    router.refresh()
  }
  return <>
    {!configured&&<div className="admin-notice" role="status">Supabase is not connected. Add the public project URL and publishable key to <code>.env.local</code> to enable staff sign-in.</div>}
    {expired&&<div className="admin-notice" role="status">Your session expired. Sign in again to continue.</div>}
    <form className="admin-form" onSubmit={submit}>
      <label>Email address<input type="email" autoComplete="username" required value={email} onChange={event=>setEmail(event.target.value)}/></label>
      <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={event=>setPassword(event.target.value)}/></label>
      {error&&<p role="alert" className="form-error">{error}</p>}
      <button type="submit" disabled={!configured||busy}>{busy?'Signing in…':'Sign in'}</button>
      <p className="admin-help">Access is invitation-only. There is no public registration form.</p>
    </form>
  </>
}
