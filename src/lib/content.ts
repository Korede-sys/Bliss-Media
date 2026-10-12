import type { Json } from '@/lib/supabase/database'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/config'

// Illustrative Phase 1 fixtures. These are used only when no Supabase project is configured.
export type Story = { slug: string; category: string; title: string; dek: string; author: string; date: string; read: string; image: string; imageAlt: string; body?: Json; authorBio?: string }
export const stories: Story[] = [
 {slug:'quiet-revolution-ai',category:'Technology',title:'The quiet revolution happening inside your pocket',dek:'The most meaningful shift in artificial intelligence isn’t happening in the cloud. It’s happening right in your hand.',author:'Amara Okafor',date:'October 12, 2026',read:'8 min read',image:'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1600&q=85',imageAlt:'Creative team working around a table'},
 {slug:'rooms-that-restore',category:'Lifestyle',title:'Rooms that restore: the new language of home',dek:'A softer, more personal kind of interior is taking shape. Designers explain why lived-in is the new luxury.',author:'Nia Bennett',date:'October 11, 2026',read:'6 min read',image:'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=85',imageAlt:'Sunlit living room with natural textures'},
 {slug:'sound-of-now',category:'Entertainment',title:'The sound of now belongs to everyone',dek:'Inside a generation of independent artists rewriting the rules of who gets heard.',author:'Theo James',date:'October 10, 2026',read:'5 min read',image:'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1000&q=85',imageAlt:'Singer performing beneath warm stage lights'},
 {slug:'future-of-work',category:'Business',title:'A more human way to build a company',dek:'The founders making the case that sustainable growth starts with how people feel at work.',author:'Maya Chen',date:'October 9, 2026',read:'7 min read',image:'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1000&q=85',imageAlt:'Bright, plant-filled collaborative office'},
 {slug:'cities-after-dark',category:'News',title:'After dark, the city finds another rhythm',dek:'From safer streets to late-night libraries, a new urban movement is changing what evening can mean.',author:'Sam Rivera',date:'October 8, 2026',read:'9 min read',image:'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1000&q=85',imageAlt:'City street illuminated after sunset'},
 {slug:'small-things-big-impact',category:'Lifestyle',title:'The small things making a big difference',dek:'Five everyday rituals with an outsized effect on the way we move through the world.',author:'Nia Bennett',date:'October 7, 2026',read:'4 min read',image:'https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&w=1000&q=85',imageAlt:'Coffee and a notebook on a quiet morning'}
]

type Filters = { categorySlug?: string; search?: string; limit?: number }
const sampleMatch = (story: Story, term: string) => `${story.title} ${story.dek} ${story.category} ${story.author}`.toLowerCase().includes(term)

export async function listStories({ categorySlug, search, limit = 50 }: Filters = {}): Promise<Story[]> {
  const term = search?.trim().toLowerCase() ?? ''
  if (!isSupabaseConfigured()) {
    return stories.filter(story => (!categorySlug || story.category.toLowerCase() === categorySlug.toLowerCase()) && (!term || sampleMatch(story, term))).slice(0, limit)
  }
  const client = await createSupabaseServerClient()
  if (!client) return []
  let categoryId: string | undefined
  if (categorySlug) {
    const { data: category, error } = await client.from('categories').select('id').eq('slug', categorySlug.toLowerCase()).maybeSingle()
    if (error) throw error
    if (!category) return []
    categoryId = category.id
  }
  let query = client.from('articles').select('*').eq('status', 'published').order('published_at', { ascending: false }).limit(limit)
  if (categoryId) query = query.eq('category_id', categoryId)
  if (term) query = query.textSearch('search_document', term, { type: 'websearch' })
  const { data: rows, error } = await query
  if (error) throw error
  const authorIds = [...new Set((rows ?? []).map(row => row.author_profile_id))]
  const categoryIds = [...new Set((rows ?? []).map(row => row.category_id))]
  const [{ data: authors, error: authorError }, { data: categories, error: categoryError }] = await Promise.all([
    authorIds.length ? client.from('profiles').select('user_id,display_name,bio').in('user_id', authorIds) : Promise.resolve({ data: [], error: null }),
    categoryIds.length ? client.from('categories').select('id,name').in('id', categoryIds) : Promise.resolve({ data: [], error: null }),
  ])
  if (authorError) throw authorError
  if (categoryError) throw categoryError
  return Promise.all((rows ?? []).map(async row => {
    let image = '/images/editorial-placeholder.svg'
    if (row.cover_image_path) {
      const { data, error: imageError } = await client.storage.from('article-covers').createSignedUrl(row.cover_image_path, 60 * 30)
      if (imageError) throw imageError
      image = data.signedUrl
    }
    return {
      slug: row.slug, title: row.title, dek: row.excerpt,
      category: categories?.find(item => item.id === row.category_id)?.name ?? 'Journal',
      author: authors?.find(item => item.user_id === row.author_profile_id)?.display_name ?? 'Bliss contributor',
      authorBio: authors?.find(item => item.user_id === row.author_profile_id)?.bio || undefined,
      date: new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(new Date(row.published_at ?? row.created_at)),
      read: estimateReadTime(row.body), image, imageAlt: row.title, body: row.body,
    }
  }))
}

export async function getStoryBySlug(slug: string): Promise<Story | undefined> {
  if (!isSupabaseConfigured()) return stories.find(story => story.slug === slug)
  const client = await createSupabaseServerClient()
  if (!client) return undefined
  const { data: row, error } = await client.from('articles').select('*').eq('slug', slug).eq('status', 'published').maybeSingle()
  if (error) throw error
  if (!row) return undefined
  const { data: author, error: authorError } = await client.from('profiles').select('display_name,bio').eq('user_id', row.author_profile_id).maybeSingle()
  const { data: category, error: categoryError } = await client.from('categories').select('name').eq('id', row.category_id).maybeSingle()
  if (authorError) throw authorError
  if (categoryError) throw categoryError
  let image = '/images/editorial-placeholder.svg'
  if (row.cover_image_path) {
    const { data, error: imageError } = await client.storage.from('article-covers').createSignedUrl(row.cover_image_path, 60 * 30)
    if (imageError) throw imageError
    image = data.signedUrl
  }
  return { slug: row.slug, title: row.title, dek: row.excerpt, category: category?.name ?? 'Journal', author: author?.display_name ?? 'Bliss contributor', authorBio: author?.bio || undefined, date: new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(new Date(row.published_at ?? row.created_at)), read: estimateReadTime(row.body), image, imageAlt: row.title, body: row.body }
}

function estimateReadTime(body: Json): string {
  const text = JSON.stringify(body).replace(/\\["{}:,]/g, ' ').replace(/\\s+/g, ' ')
  return `${Math.max(1, Math.ceil(text.split(' ').filter(Boolean).length / 200))} min read`
}
