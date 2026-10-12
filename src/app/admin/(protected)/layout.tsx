import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { SignOutButton } from '@/components/SignOutButton'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient()
  if (!supabase) redirect('/admin/sign-in?setup=required')
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/admin/sign-in?reason=session-expired')
  const { data: profile, error } = await supabase.from('profiles').select('display_name,role').eq('user_id', user.id).maybeSingle()
  if (error || !profile) redirect('/admin/access-denied')
  return <div className="admin-layout"><header className="admin-bar"><Link className="wordmark" href="/">bliss<span>.</span></Link><span>Editorial workspace · {profile.role}</span><SignOutButton/></header><main className="admin-content">{children}</main></div>
}
