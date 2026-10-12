import type { Json } from '@/lib/supabase/database'

type Node = { type?: string; text?: string; attrs?: Record<string, string | number | boolean | null>; marks?: { type?: string; attrs?: Record<string, string | number | boolean | null> }[]; content?: Node[] }
const safeUrl = (value: unknown) => typeof value === 'string' && (/^https:\/\//i.test(value) || (value.startsWith('/') && !value.startsWith('//'))) ? value : undefined

function renderInline(node: Node, key: string): React.ReactNode {
  if (node.type === 'text') {
    let child: React.ReactNode = node.text ?? ''
    for (const mark of node.marks ?? []) {
      if (mark.type === 'bold' || mark.type === 'strong') child = <strong key={`${key}-bold`}>{child}</strong>
      if (mark.type === 'italic' || mark.type === 'em') child = <em key={`${key}-italic`}>{child}</em>
      if (mark.type === 'link') {
        const href = safeUrl(mark.attrs?.href)
        if (href) child = <a key={`${key}-link`} href={href} rel={href.startsWith('http') ? 'noreferrer' : undefined}>{child}</a>
      }
    }
    return <span key={key}>{child}</span>
  }
  return <>{(node.content ?? []).map((item, index) => renderInline(item, `${key}-${index}`))}</>
}

function renderBlock(node: Node, index: number): React.ReactNode {
  const key = `${node.type ?? 'node'}-${index}`
  const content = (node.content ?? []).map((item, childIndex) => renderInline(item, `${key}-${childIndex}`))
  switch (node.type) {
    case 'heading': { const level = Math.max(2, Math.min(4, Number(node.attrs?.level ?? 2))); return level === 2 ? <h2 key={key}>{content}</h2> : level === 3 ? <h3 key={key}>{content}</h3> : <h4 key={key}>{content}</h4> }
    case 'blockquote': return <blockquote key={key}>{(node.content ?? []).map(renderBlock)}</blockquote>
    case 'bulletList': return <ul key={key}>{(node.content ?? []).map(renderBlock)}</ul>
    case 'orderedList': return <ol key={key}>{(node.content ?? []).map(renderBlock)}</ol>
    case 'listItem': return <li key={key}>{content}</li>
    case 'horizontalRule': return <hr key={key}/>
    case 'paragraph': default: return <p key={key}>{content}</p>
  }
}

export function ArticleBody({ body }: { body: Json }) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null
  const doc = body as Node
  if (doc.type !== 'doc' || !Array.isArray(doc.content)) return null
  return <div className="article-body">{doc.content.map(renderBlock)}</div>
}
