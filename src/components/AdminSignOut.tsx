'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export function AdminSignOut() {
  const [busy, setBusy] = useState(false)
  const router = useRouter()
  async function signOut() {
    const supabase = createSupabaseBrowserClient()
    if (!supabase) return
    setBusy(true)
    await supabase.auth.signOut()
    router.replace('/admin/sign-in')
    router.refresh()
  }
  return <button className="admin-signout" type="button" onClick={signOut} disabled={busy}><LogOut size={15}/>{busy ? 'Signing out…' : 'Sign out'}</button>
}
