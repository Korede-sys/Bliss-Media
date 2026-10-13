import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { ArticleEditor } from '@/components/ArticleEditor'
import { AdminSignOut } from '@/components/AdminSignOut'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Edit article' }

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isSupabaseConfigured()) redirect('/admin/sign-in')
  const supabase = await createSupabaseServerClient()
  if (!supabase) redirect('/admin/sign-in')
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/sign-in')
  const [{ data: profile }, { data: article, error: articleError }, { data: categories }] = await Promise.all([
    supabase.from('profiles').select('display_name,role').eq('user_id', user.id).maybeSingle(),
    supabase.from('articles').select('id,title,slug,excerpt,body,cover_image_path,author_profile_id,category_id,status,updated_at').eq('id', id).maybeSingle(),
    supabase.from('categories').select('id,name,slug').order('name'),
  ])
  if (!profile) redirect('/admin')
  if (articleError || !article) notFound()
  const canAccess = profile.role === 'administrator' || profile.role === 'editor' || article.author_profile_id === user.id
  if (!canAccess) redirect('/admin')
  return <section className="admin-layout"><div className="admin-bar"><Link className="wordmark" href="/">bliss<span>.</span></Link><span>{profile.display_name} · {profile.role}</span><AdminSignOut /></div><div className="admin-content"><div className="admin-dashboard"><div className="admin-breadcrumb"><Link href="/admin">← Editorial dashboard</Link><span>/</span> Edit story</div><span className="eyebrow">STORY WORKSPACE</span><h1>Edit your <em>story.</em></h1><p>Update the article and save changes according to your editorial permissions.</p>{categories?.length ? <ArticleEditor article={article} categories={categories} userId={user.id} role={profile.role}/> : <div className="admin-notice">Editorial categories are missing. Add the Bliss categories in Supabase before editing this article.</div>}</div></div></section>
}
