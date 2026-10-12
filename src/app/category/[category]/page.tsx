import type { Metadata } from 'next'
import Link from 'next/link'
import { stories } from '@/lib/content'
import { StoryCard } from '@/components/StoryCard'
export function generateStaticParams(){return ['technology','entertainment','lifestyle','business','news'].map(category=>({category}))}
export async function generateMetadata({params}:{params:Promise<{category:string}>}):Promise<Metadata>{const {category}=await params;return {title:`${category[0]?.toUpperCase()}${category.slice(1)}`}}
export default async function CategoryPage({params}:{params:Promise<{category:string}>}){const {category}=await params;const name=category[0]?.toUpperCase()+category.slice(1);const list=stories.filter(s=>s.category.toLowerCase()===category.toLowerCase());return <div className="wrap listing-page"><div className="breadcrumbs"><Link href="/">Home</Link><span>/</span>{name}</div><div className="listing-heading"><span className="eyebrow">THE BLISS JOURNAL</span><h1>{name}<span>.</span></h1><p>Fresh perspectives, thoughtful voices, and stories that stay with you.</p></div>{list.length?<div className="story-grid three">{list.map(s=><StoryCard key={s.slug} story={s}/>)}</div>:<div className="empty-state"><span>✳</span><h2>Our editors are on it.</h2><p>We don’t have a {name} story in this sample issue just yet.</p><Link className="text-link" href="/">Explore all stories →</Link></div>}</div>}
