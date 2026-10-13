import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowUpRight, FileText, Plus, Settings2 } from 'lucide-react'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { AdminSignOut } from '@/components/AdminSignOut'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Editorial dashboard' }

export default async function AdminDashboard() {
  if (!isSupabaseConfigured()) {
    return <section className="admin-layout"><div className="admin-content"><div className="admin-dashboard"><span className="eyebrow">EDITORIAL OFFICE</span><h1>Connect your <em>workspace.</em></h1><p>Add the Supabase project URL and publishable key to your Vercel environment variables before using the editorial dashboard.</p><Link className="admin-primary" href="/admin/sign-in">Go to sign in</Link></div></div></section>
  }
  const supabase = await createSupabaseServerClient()
  if (!supabase) redirect('/admin/sign-in')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/sign-in')
  const { data: profile, error: profileError } = await supabase.from('profiles').select('display_name,role').eq('user_id', user.id).maybeSingle()
  if (profileError || !profile) {
    return <section className="admin-layout"><div className="admin-content"><div className="admin-dashboard"><span className="eyebrow">ACCESS CHECK</span><h1>Your editorial profile <em>isn’t ready.</em></h1><p>Your sign-in is valid, but no editorial profile could be loaded. Ask the administrator to verify your profile and role in Supabase. No permissions have been changed.</p><AdminSignOut /></div></div></section>
  }
  const { data: articles, error } = await supabase.from('articles').select('id,title,slug,status,updated_at').order('updated_at', { ascending: false }).limit(50)
  return <section className="admin-layout"><div className="admin-bar"><Link className="wordmark" href="/">bliss<span>.</span></Link><span>{profile.display_name} · {profile.role}</span><AdminSignOut /></div><div className="admin-content"><div className="admin-dashboard"><div className="admin-heading-row"><div><span className="eyebrow">EDITORIAL OFFICE</span><h1>Good morning, <em>{profile.display_name.split(' ')[0]}.</em></h1><p>Manage your stories and keep the journal moving.</p></div><Link className="admin-primary" href="/admin/articles/new"><Plus size={17}/> New article</Link></div><div className="admin-stats"><div><FileText size={19}/><span>Stories available to you</span><strong>{articles?.length ?? 0}</strong></div><div><Settings2 size={19}/><span>Your role</span><strong className="role-value">{profile.role}</strong></div></div><div className="admin-list-heading"><h2>Your stories</h2><span>Latest updates</span></div>{error ? <div className="admin-notice" role="alert">Stories could not be loaded. Check the database connection and your assigned editorial permissions.</div> : articles?.length ? <ul className="admin-article-list">{articles.map(article => <li key={article.id}><div className="admin-article-title"><strong>{article.title}</strong><small>Updated {new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(article.updated_at))}</small></div><span className={`admin-status status-${article.status}`}>{article.status.replaceAll('_', ' ')}</span><Link href={`/admin/articles/${article.id}/edit`} aria-label={`Edit ${article.title}`}>Edit <ArrowUpRight size={14}/></Link></li>)}</ul> : <div className="admin-empty"><FileText size={28}/><h3>Your first story starts here.</h3><p>Create a draft, add a cover image, and prepare it for editorial review.</p><Link className="admin-primary" href="/admin/articles/new"><Plus size={16}/> Create your first article</Link></div>}<p className="admin-footnote">Publishing permissions are enforced by Supabase. Authors submit drafts for review; editors and administrators follow the configured approval workflow.</p></div></div></section>
}
