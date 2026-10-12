import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const metadata = { title: 'Editorial workspace' }
export default async function AdminHome() {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const [{ data: profile }, { data: articles, error }] = await Promise.all([
    supabase.from('profiles').select('display_name,role').eq('user_id', user.id).maybeSingle(),
    supabase.from('articles').select('id,title,slug,status,updated_at').order('updated_at', { ascending: false }).limit(8),
  ])
  return <section className="admin-dashboard"><span className="eyebrow">BLISS MEDIA · EDITORIAL OFFICE</span><h1>Good to see you, <em>{profile?.display_name ?? 'editor'}.</em></h1><p>Your staff workspace is connected. Article authoring tools are planned for a later phase.</p>{error?<div className="admin-notice" role="alert">Your editorial records could not be loaded. Please refresh or contact an administrator.</div>:<><h2>Recent articles</h2>{articles?.length?<ul className="admin-article-list">{articles.map(article=><li key={article.id}><span>{article.title}</span><span className="admin-status">{article.status.replaceAll('_',' ')}</span></li>)}</ul>:<div className="admin-notice" role="status">There are no articles in this workspace yet.</div>}</>}<div className="admin-actions"><Link href="/">View the public journal →</Link></div></section>
}
