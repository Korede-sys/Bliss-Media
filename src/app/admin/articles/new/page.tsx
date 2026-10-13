import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { ArticleComposer } from '@/components/ArticleComposer'
import { AdminSignOut } from '@/components/AdminSignOut'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'New article' }

export default async function NewArticlePage() {
  if (!isSupabaseConfigured()) redirect('/admin/sign-in')
  const supabase = await createSupabaseServerClient()
  if (!supabase) redirect('/admin/sign-in')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/sign-in')
  const { data: profile } = await supabase.from('profiles').select('display_name,role').eq('user_id', user.id).maybeSingle()
  if (!profile || !['author', 'editor', 'administrator'].includes(profile.role)) redirect('/admin')
  const { data: categories, error } = await supabase.from('categories').select('id,name,slug').order('name')
  return <section className="admin-layout"><div className="admin-bar"><Link className="wordmark" href="/">bliss<span>.</span></Link><span>{profile.display_name} · {profile.role}</span><AdminSignOut /></div><div className="admin-content"><div className="admin-dashboard"><div className="admin-breadcrumb"><Link href="/admin">← Editorial dashboard</Link><span>/</span> New article</div><span className="eyebrow">STORY WORKSPACE</span><h1>Create a <em>new story.</em></h1><p>Start with a clear headline and a useful summary. Your first save creates a private draft.</p>{error ? <div className="admin-notice" role="alert">Categories could not be loaded. Please check your Supabase connection.</div> : !categories?.length ? <div className="admin-notice" role="status">Your database has no editorial categories yet. Add the five Bliss categories (Technology, Entertainment, Lifestyle, Business, and News) in Supabase before creating a story.</div> : <ArticleComposer categories={categories} userId={user.id} role={profile.role}/>}</div></div></section>
}
