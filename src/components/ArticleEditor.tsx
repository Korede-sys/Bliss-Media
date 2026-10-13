'use client'
import { useState, type FormEvent, type ChangeEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ImagePlus, Save, ArrowLeft, LoaderCircle, Send, CheckCircle2, Eye } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { AppRole, Json, PublicationStatus } from '@/lib/supabase/database'

type Category = { id: string; name: string; slug: string }
type Article = { id: string; title: string; slug: string; excerpt: string; body: Json; cover_image_path: string | null; author_profile_id: string; category_id: string; status: PublicationStatus; updated_at: string }
type DocNode = { type?: string; text?: string; content?: DocNode[] }
function extractText(body: Json): string {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return ''
  const doc = body as DocNode
  return (doc.content ?? []).map(block => {
    const paragraph = (block.content ?? []).map(child => child.text ?? '').join('')
    return paragraph
  }).join('\n\n')
}
const slugify = (value: string) => value.normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 220)
const docFromText = (value: string): Json => ({ type: 'doc', content: value.split(/\n\s*\n/).map(paragraph => ({ type: 'paragraph', content: paragraph.trim() ? [{ type: 'text', text: paragraph.trim() }] : [] })) })

export function ArticleEditor({ article, categories, userId, role }: { article: Article; categories: Category[]; userId: string; role: AppRole }) {
  const router = useRouter()
  const [title, setTitle] = useState(article.title)
  const [slug, setSlug] = useState(article.slug)
  const [excerpt, setExcerpt] = useState(article.excerpt)
  const [categoryId, setCategoryId] = useState(article.category_id)
  const [body, setBody] = useState(extractText(article.body))
  const [cover, setCover] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState('')
  const [coverPath, setCoverPath] = useState(article.cover_image_path ?? '')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<PublicationStatus>(article.status)
  const isAuthor = role === 'author'
  const isStaff = role === 'editor' || role === 'administrator'
  const canEditContent = role === 'administrator' || (role === 'editor' && ['in_review','changes_requested','approved','scheduled','published'].includes(status)) || (isAuthor && article.author_profile_id === userId && ['draft','changes_requested'].includes(status))
  const canSubmit = isAuthor && ['draft','changes_requested'].includes(status)
  const canReview = isStaff && status === 'in_review'
  const canPublish = role === 'administrator' || (role === 'editor' && status === 'approved')
  const canSchedule = canPublish
  function updateTitle(value: string) { setTitle(value); setSlug(current => !current || current === slugify(title) ? slugify(value) : current) }
  function chooseCover(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0] ?? null; setCover(file); setCoverPreview(file ? URL.createObjectURL(file) : ''); setMessage('') }

  async function save(event: FormEvent<HTMLFormElement>, nextStatus: PublicationStatus = status) {
    event.preventDefault(); setMessage('')
    if (!canEditContent) { setMessage('Your current role and article status do not allow content edits.'); return }
    if (!title.trim() || !slugify(slug) || !categoryId || !body.trim()) { setMessage('Add a headline, URL slug, category, and article body before saving.'); return }
    if (cover && (!['image/jpeg','image/png','image/webp','image/avif'].includes(cover.type) || cover.size > 15 * 1024 * 1024)) { setMessage('Choose a JPG, PNG, WebP, or AVIF cover image up to 15 MB.'); return }
    const supabase = createSupabaseBrowserClient()
    if (!supabase) { setMessage('Supabase is not configured.'); return }
    setBusy(true)
    let nextCoverPath = coverPath || null
    if (cover) {
      const extension = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' } as Record<string,string>)[cover.type]
      nextCoverPath = `${userId}/${crypto.randomUUID()}.${extension}`
      const { error: uploadError } = await supabase.storage.from('article-covers').upload(nextCoverPath, cover, { contentType: cover.type, upsert: false })
      if (uploadError) { setBusy(false); setMessage('The cover image could not be uploaded. Check your editorial permissions and try again.'); return }
    }
    const update: { title: string; slug: string; excerpt: string; body: Json; cover_image_path: string | null; category_id: string; status: PublicationStatus; published_at?: string | null; scheduled_for?: string | null; last_change_note: string } = {
      title: title.trim(), slug: slugify(slug), excerpt: excerpt.trim(), body: docFromText(body), cover_image_path: nextCoverPath, category_id: categoryId, status: nextStatus, last_change_note: 'Updated in editorial workspace',
    }
    if (nextStatus === 'published') { update.published_at = new Date().toISOString(); update.scheduled_for = null }
    else if (nextStatus !== 'scheduled') { update.scheduled_for = null; if (status === 'published' && role === 'administrator') update.published_at = null }
    const { error } = await supabase.from('articles').update(update).eq('id', article.id)
    setBusy(false)
    if (error) {
      if (cover && nextCoverPath) await supabase.storage.from('article-covers').remove([nextCoverPath])
      setMessage(error.code === '23505' ? 'That URL slug is already in use. Choose another.' : 'The update was rejected. Your role and the article workflow are enforced by Supabase; verify the allowed next step.')
      return
    }
    if (coverPath && coverPath !== nextCoverPath) await supabase.storage.from('article-covers').remove([coverPath])
    setCover(null); setCoverPreview(''); setCoverPath(nextCoverPath ?? ''); setStatus(nextStatus)
    setMessage(nextStatus === status ? 'Changes saved.' : `Story status updated to ${nextStatus.replaceAll('_',' ')}.`)
    router.refresh()
  }

  async function transition(nextStatus: PublicationStatus) {
    const supabase = createSupabaseBrowserClient()
    if (!supabase) return
    setBusy(true); setMessage('')
    const update: { status: PublicationStatus; scheduled_for?: string | null; published_at?: string | null; last_change_note: string } = { status: nextStatus, last_change_note: `Workflow transition to ${nextStatus}` }
    if (nextStatus === 'published') { update.published_at = new Date().toISOString(); update.scheduled_for = null }
    if (nextStatus !== 'scheduled') update.scheduled_for = null
    const { error } = await supabase.from('articles').update(update).eq('id', article.id)
    setBusy(false)
    if (error) { setMessage('That workflow transition was rejected by Supabase. Confirm the current status and your role.'); return }
    setStatus(nextStatus); setMessage(`Story status updated to ${nextStatus.replaceAll('_',' ')}.`); router.refresh()
  }

  return <form className="article-composer" onSubmit={event => save(event, status)}>
    <div className="composer-main">
      <div className="current-status">Current status <strong className={`admin-status status-${status}`}>{status.replaceAll('_',' ')}</strong></div>
      <label>Headline <span>Required</span><input value={title} onChange={event => updateTitle(event.target.value)} maxLength={220} required disabled={!canEditContent}/></label>
      <label>URL slug <span>Required</span><input value={slug} onChange={event => setSlug(slugify(event.target.value))} maxLength={220} required disabled={!canEditContent}/><small>Public URL: /article/{slugify(slug) || 'your-story-url'}</small></label>
      <label>Short summary <span>Up to 600 characters</span><textarea value={excerpt} onChange={event => setExcerpt(event.target.value)} maxLength={600} rows={3} disabled={!canEditContent}/></label>
      <label>Article body <span>Separate paragraphs with a blank line</span><textarea value={body} onChange={event => setBody(event.target.value)} rows={16} required disabled={!canEditContent}/></label>
      {!canEditContent && <div className="admin-notice">This story is not editable at its current workflow stage for your role. You can still view its details here.</div>}
    </div>
    <aside className="composer-sidebar">
      <label>Section<select value={categoryId} onChange={event => setCategoryId(event.target.value)} required disabled={!canEditContent}>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <div className="cover-upload"><span className="upload-label">Cover image</span>{coverPreview ? <img className="cover-preview" src={coverPreview} alt="Selected cover preview"/> : coverPath ? <div className="existing-cover"><ImagePlus size={18}/><span>Cover image attached</span></div> : null}<label className="upload-drop"><ImagePlus size={22}/><strong>{coverPath || coverPreview ? 'Replace cover image' : 'Choose a cover'}</strong><small>JPG, PNG, WebP or AVIF · Max 15 MB</small><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={chooseCover} disabled={!canEditContent}/></label>{(cover || coverPath) && canEditContent && <button className="cover-remove" type="button" onClick={() => {setCover(null);setCoverPreview('');setCoverPath('')}}>Remove cover</button>}</div>
      <div className="draft-note"><strong>Editorial workflow</strong><p>Changes are checked against your role and the article’s current status by Supabase.</p></div>
      {message&&<p className={message.includes('saved')||message.includes('updated')?'admin-success':'form-error'} role="status">{message}</p>}
      {canEditContent&&<button className="admin-primary composer-save" type="submit" disabled={busy}>{busy?<LoaderCircle size={16} className="spin"/>:<Save size={16}/>} Save changes</button>}
      {canSubmit&&<button className="admin-secondary" type="button" disabled={busy} onClick={() => transition('in_review')}><Send size={15}/> Submit for review</button>}
      {canReview&&<><button className="admin-secondary" type="button" disabled={busy} onClick={() => transition('changes_requested')}>Request changes</button><button className="admin-primary composer-save" type="button" disabled={busy} onClick={() => transition('approved')}><CheckCircle2 size={15}/> Approve story</button></>}
      {canPublish&&<button className="admin-primary composer-save" type="button" disabled={busy} onClick={() => transition('published')}><Eye size={15}/> Publish now</button>}
      {canSchedule&&<div className="schedule-hint">Scheduling UI is not enabled yet. Use Publish now when ready.</div>}
      {status === 'published'&&<Link className="admin-secondary" href={`/article/${article.slug}`} target="_blank"><Eye size={15}/> View published story</Link>}
      <Link className="composer-cancel" href="/admin"><ArrowLeft size={14}/> Back to dashboard</Link>
    </aside>
  </form>
}
