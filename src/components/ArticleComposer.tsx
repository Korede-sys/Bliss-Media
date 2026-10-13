'use client'
import { useState, type FormEvent, type ChangeEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ImagePlus, Save, ArrowLeft, LoaderCircle } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { AppRole, Json } from '@/lib/supabase/database'

type Category = { id: string; name: string; slug: string }
const slugify = (value: string) => value.normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 220)
const docFromText = (value: string): Json => ({ type: 'doc', content: value.split(/\n\s*\n/).map(paragraph => ({ type: 'paragraph', content: paragraph.trim() ? [{ type: 'text', text: paragraph.trim() }] : [] })) })

export function ArticleComposer({ categories, userId, role }: { categories: Category[]; userId: string; role: AppRole }) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '')
  const [body, setBody] = useState('')
  const [cover, setCover] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  function updateTitle(value: string) {
    setTitle(value)
    setSlug(current => !current || current === slugify(title) ? slugify(value) : current)
  }
  function chooseCover(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    setCover(file)
    setCoverPreview(file ? URL.createObjectURL(file) : '')
    setMessage('')
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    if (!title.trim() || !slugify(slug) || !categoryId || !body.trim()) {
      setMessage('Add a headline, URL slug, category, and article body before saving.')
      return
    }
    if (cover && (!['image/jpeg','image/png','image/webp','image/avif'].includes(cover.type) || cover.size > 15 * 1024 * 1024)) {
      setMessage('Choose a JPG, PNG, WebP, or AVIF cover image up to 15 MB.')
      return
    }
    const supabase = createSupabaseBrowserClient()
    if (!supabase) { setMessage('Supabase is not configured.'); return }
    setBusy(true)
    let coverPath: string | null = null
    if (cover) {
      const extension = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' } as Record<string,string>)[cover.type]
      coverPath = `${userId}/${crypto.randomUUID()}.${extension}`
      const { error: uploadError } = await supabase.storage.from('article-covers').upload(coverPath, cover, { contentType: cover.type, upsert: false })
      if (uploadError) { setBusy(false); setMessage('The cover image could not be uploaded. Check your editorial permissions and try again.'); return }
    }
    const { data, error } = await supabase.from('articles').insert({
      title: title.trim(), slug: slugify(slug), excerpt: excerpt.trim(),
      body: docFromText(body), cover_image_path: coverPath, author_profile_id: userId,
      category_id: categoryId, status: 'draft', last_change_note: 'Draft created in editorial workspace',
    }).select('id').single()
    setBusy(false)
    if (error) {
      if (coverPath) await supabase.storage.from('article-covers').remove([coverPath])
      setMessage(error.code === '23505' ? 'That URL slug is already in use. Choose a different one.' : 'Draft could not be saved. Confirm your role and database policies, then try again.')
      return
    }
    router.push(`/admin/articles/${data.id}/edit?created=1`)
    router.refresh()
  }

  return <form className="article-composer" onSubmit={save}>
    <div className="composer-main">
      <label>Headline <span>Required</span><input value={title} onChange={event => updateTitle(event.target.value)} maxLength={220} required placeholder="Write a clear, compelling headline"/></label>
      <label>URL slug <span>Required</span><input value={slug} onChange={event => setSlug(slugify(event.target.value))} maxLength={220} required placeholder="your-story-url"/><small>Public URL: /article/{slugify(slug) || 'your-story-url'}</small></label>
      <label>Short summary <span>Up to 600 characters</span><textarea value={excerpt} onChange={event => setExcerpt(event.target.value)} maxLength={600} rows={3} placeholder="Give readers a reason to open this story."/></label>
      <label>Article body <span>Separate paragraphs with a blank line</span><textarea value={body} onChange={event => setBody(event.target.value)} rows={16} required placeholder="Start writing your story here…"/></label>
    </div>
    <aside className="composer-sidebar">
      <label>Section<select value={categoryId} onChange={event => setCategoryId(event.target.value)} required>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <div className="cover-upload"><span className="upload-label">Cover image</span><label className="upload-drop">{coverPreview ? <img src={coverPreview} alt="Selected cover preview"/> : <><ImagePlus size={28}/><strong>Choose a cover</strong><small>JPG, PNG, WebP or AVIF · Max 15 MB</small></>}<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={chooseCover}/></label>{cover&&<button className="cover-remove" type="button" onClick={() => {setCover(null);setCoverPreview('')}}>Remove image</button>}</div>
      <div className="draft-note"><strong>Draft only</strong><p>This saves a private draft. Publishing and review actions remain governed by your editorial role.</p></div>
      {message&&<p className="form-error" role="alert">{message}</p>}
      <button className="admin-primary composer-save" type="submit" disabled={busy}>{busy?<LoaderCircle size={16} className="spin"/>:<Save size={16}/>} {busy?'Saving draft…':'Save draft'}</button>
      <Link className="composer-cancel" href="/admin"><ArrowLeft size={14}/> Cancel</Link>
    </aside>
  </form>
}
